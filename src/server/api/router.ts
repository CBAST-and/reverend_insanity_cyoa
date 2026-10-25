import { z } from 'zod';
import { defaultDeps as defaultAccessDeps, type AdminContext } from '../access';
import type { D1Like } from '../db/d1';
import { readCurrentSnapshot, readSnapshot, type SnapshotText } from '../db/load-content';
import { getDraft, patchOption, publishDraft } from './admin';
import { authenticateAdmin } from './admin-auth';
import {
  createBuild,
  defaultDeps,
  getBuild,
  updateBuild,
  type ApiDeps,
  type ApiResult,
} from './builds';
import { BUILD_ID_PATTERN, EDIT_TOKEN_PATTERN } from './tokens';

export const MAX_BODY_BYTES = 64 * 1024;
const VERSION_PATTERN = /^[0-9A-Za-z._-]{1,50}$/;
const OPTION_ID_PATTERN = /^[0-9A-Za-z._-]{1,100}$/;

const SECURITY_HEADERS = { 'X-Content-Type-Options': 'nosniff' } as const;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...headers },
  });
}

function errorResponse(status: number, code: string, message: string, headers: Record<string, string> = {}): Response {
  return json(status, { error: { code, message } }, headers);
}

function fromResult<T>(result: ApiResult<T>): Response {
  return result.ok ? json(result.status, result.body) : json(result.status, { error: result.error });
}

function methodNotAllowed(allowed: readonly string[]): Response {
  return errorResponse(405, 'method_not_allowed', 'Método no permitido.', { Allow: allowed.join(', ') });
}

type BodyResult = { readonly ok: true; readonly selections: unknown } | { readonly ok: false; readonly response: Response };

const bodySchema = z.object({ selections: z.unknown() });

async function readSelectionsBody(request: Request): Promise<BodyResult> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, 'body_too_large', 'El cuerpo es demasiado grande.') };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, 'body_too_large', 'El cuerpo es demasiado grande.') };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, response: errorResponse(400, 'invalid_json', 'El cuerpo no es JSON válido.') };
  }
  const parsed = bodySchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, response: errorResponse(400, 'invalid_body', 'Se esperaba un objeto con la clave "selections".') };
  }
  return { ok: true, selections: parsed.data.selections };
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer (\S+)$/.exec(header);
  const token = match?.[1];
  return token !== undefined && EDIT_TOKEN_PATTERN.test(token) ? token : null;
}

function snapshotResponse(snapshot: SnapshotText, cacheControl: string, request: Request): Response {
  const etag = `"${snapshot.version}"`;
  const headers = { ETag: etag, 'Cache-Control': cacheControl, ...SECURITY_HEADERS };
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(snapshot.snapshot, {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

/** Lectura del cuerpo JSON de una petición de administración (sin la clave "selections"). */
async function readJsonValue(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, 'body_too_large', 'El cuerpo es demasiado grande.') };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: errorResponse(400, 'invalid_json', 'El cuerpo no es JSON válido.') };
  }
}

/** Rutas de administración: exigen la clave de administrador o el JWT de Cloudflare Access; sin configuración, se niegan. */
async function handleAdmin(
  request: Request,
  db: D1Like,
  admin: AdminContext | null,
  param: string | undefined,
  id: string | undefined,
): Promise<Response> {
  const auth = await authenticateAdmin(request, admin);
  if (!auth.ok) return errorResponse(auth.status, auth.code, auth.reason);

  // Defensa contra CSRF: los cambios deben venir de la misma origen y como JSON.
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin !== null && origin !== new URL(request.url).origin) {
      return errorResponse(403, 'bad_origin', 'Origen no permitido.');
    }
    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
      return errorResponse(415, 'unsupported_media_type', 'Se esperaba application/json.');
    }
  }

  if (param === 'draft' && id === undefined) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    const result = await getDraft(db);
    return result.ok ? json(result.status, { ...result.body, email: auth.email }) : fromResult(result);
  }
  if (param === 'options' && id !== undefined) {
    if (request.method !== 'PATCH') return methodNotAllowed(['PATCH']);
    if (!OPTION_ID_PATTERN.test(id)) return errorResponse(404, 'option_not_found', 'Esa opción no existe.');
    const body = await readJsonValue(request);
    return body.ok ? fromResult(await patchOption(db, id, body.value)) : body.response;
  }
  if (param === 'publish' && id === undefined) {
    if (request.method !== 'POST') return methodNotAllowed(['POST']);
    const result = await publishDraft(db, new Date((admin?.now ?? defaultAccessDeps.now)()));
    if (result.ok) console.log(`Contenido publicado (${result.body.version}) por ${auth.email}`);
    return fromResult(result);
  }
  return errorResponse(404, 'not_found', 'Ruta no encontrada.');
}

/**
 * Rutas:
 *   GET  /api/content            contenido vigente (cacheable, con ETag)
 *   GET  /api/content/:version   una versión concreta (inmutable)
 *   POST /api/builds             crea un build; devuelve id y token de edición (una sola vez)
 *   GET  /api/builds/:id         lee un build
 *   PUT  /api/builds/:id         edita un build con "Authorization: Bearer <token>"
 *   GET  /api/admin/draft        borrador del contenido        (requiere Cloudflare Access)
 *   PATCH /api/admin/options/:id edita nombre, descripción o costo
 *   POST /api/admin/publish      publica el borrador como nueva versión
 */
export async function handleApi(
  request: Request,
  db: D1Like,
  deps: ApiDeps = defaultDeps,
  admin: AdminContext | null = null,
): Promise<Response> {
  try {
    const segments = new URL(request.url).pathname.split('/').filter((segment) => segment !== '');
    const [api, resource, param, ...rest] = segments;
    if (api !== 'api') return errorResponse(404, 'not_found', 'Ruta no encontrada.');

    if (resource === 'admin') {
      return rest.length > 1
        ? errorResponse(404, 'not_found', 'Ruta no encontrada.')
        : handleAdmin(request, db, admin, param, rest[0]);
    }
    if (rest.length > 0) return errorResponse(404, 'not_found', 'Ruta no encontrada.');

    if (resource === 'content') {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      if (param === undefined) {
        const current = await readCurrentSnapshot(db);
        if (current === null) return errorResponse(503, 'content_unavailable', 'Todavía no hay contenido publicado.');
        return snapshotResponse(current, 'public, max-age=300, stale-while-revalidate=3600', request);
      }
      if (!VERSION_PATTERN.test(param)) return errorResponse(404, 'not_found', 'Versión no encontrada.');
      const snapshot = await readSnapshot(db, param);
      if (snapshot === null) return errorResponse(404, 'not_found', 'Versión no encontrada.');
      return snapshotResponse(snapshot, 'public, max-age=31536000, immutable', request);
    }

    if (resource === 'builds') {
      if (param === undefined) {
        if (request.method !== 'POST') return methodNotAllowed(['POST']);
        const body = await readSelectionsBody(request);
        return body.ok ? fromResult(await createBuild(db, body.selections, deps)) : body.response;
      }

      if (!BUILD_ID_PATTERN.test(param)) return errorResponse(404, 'build_not_found', 'Ese build no existe.');
      if (request.method === 'GET') return fromResult(await getBuild(db, param));
      if (request.method === 'PUT') {
        const body = await readSelectionsBody(request);
        return body.ok
          ? fromResult(await updateBuild(db, param, bearerToken(request), body.selections))
          : body.response;
      }
      return methodNotAllowed(['GET', 'PUT']);
    }

    return errorResponse(404, 'not_found', 'Ruta no encontrada.');
  } catch (error) {
    console.error('Error no controlado en la API:', error);
    return errorResponse(500, 'internal_error', 'Error interno del servidor.');
  }
}
