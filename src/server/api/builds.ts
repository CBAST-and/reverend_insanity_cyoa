import { z } from 'zod';
import {
  evaluateBuild,
  normalizeSelections,
  parseSelections,
  type BuildIssue,
  type BuildSelections,
  type CyoaContent,
} from '../../shared';
import type { D1Like } from '../db/d1';
import { loadContentVersion, loadCurrentContent } from '../db/load-content';
import { generateBuildId, generateEditToken, hashToken, safeEqual } from './tokens';

/* ========================================================================
   Tipos de resultado (el router los convierte en respuestas HTTP)
   ======================================================================== */

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly issues?: readonly BuildIssue[];
}

export type ApiResult<T> =
  | { readonly ok: true; readonly status: number; readonly body: T }
  | { readonly ok: false; readonly status: number; readonly error: ApiError };

const fail = (status: number, code: string, message: string, issues?: readonly BuildIssue[]): ApiResult<never> => ({
  ok: false,
  status,
  error: issues === undefined ? { code, message } : { code, message, issues },
});

export interface ApiDeps {
  readonly generateId: () => string;
  readonly generateToken: () => string;
}

export const defaultDeps: ApiDeps = { generateId: generateBuildId, generateToken: generateEditToken };

const MAX_ID_ATTEMPTS = 5;

export interface CreatedBuild {
  readonly id: string;
  /** Se muestra una sola vez: en la base solo queda su hash. */
  readonly editToken: string;
  readonly contentVersion: string;
}

export interface BuildView {
  readonly id: string;
  readonly contentVersion: string;
  readonly selections: BuildSelections;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UpdatedBuild {
  readonly id: string;
  readonly contentVersion: string;
  readonly updatedAt: string;
}

/* ========================================================================
   Validación de las selecciones recibidas
   ======================================================================== */

function validateSelections(
  content: CyoaContent,
  raw: unknown,
): { readonly ok: true; readonly selections: BuildSelections } | { readonly ok: false; readonly result: ApiResult<never> } {
  const parsed = parseSelections(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      result: fail(400, 'invalid_selections', `Las selecciones no tienen el formato esperado: ${parsed.errors.slice(0, 5).join('; ')}`),
    };
  }

  const errors = evaluateBuild(content, parsed.selections).issues.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    return { ok: false, result: fail(422, 'invalid_build', 'El build incumple las reglas.', errors) };
  }

  // Se guarda la versión canónica: sin texto libre de opciones que ya no están elegidas.
  return { ok: true, selections: normalizeSelections(content, parsed.selections).selections };
}

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Error && /UNIQUE|PRIMARY KEY/i.test(error.message);

/* ========================================================================
   Crear
   ======================================================================== */

export async function createBuild(
  db: D1Like,
  rawSelections: unknown,
  deps: ApiDeps = defaultDeps,
): Promise<ApiResult<CreatedBuild>> {
  let content: CyoaContent;
  try {
    content = await loadCurrentContent(db);
  } catch {
    return fail(503, 'content_unavailable', 'Todavía no hay una versión de contenido publicada.');
  }

  const validated = validateSelections(content, rawSelections);
  if (!validated.ok) return validated.result;

  const editToken = deps.generateToken();
  const tokenHash = await hashToken(editToken);
  const data = JSON.stringify(validated.selections);

  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const id = deps.generateId();
    try {
      await db
        .prepare(
          'INSERT INTO builds (id, content_version, schema_version, data, edit_token_hash) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(id, content.contentVersion, content.schemaVersion, data, tokenHash)
        .run();
      return { ok: true, status: 201, body: { id, editToken, contentVersion: content.contentVersion } };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return fail(503, 'id_collision', 'No se pudo generar un identificador libre. Inténtalo de nuevo.');
}

/* ========================================================================
   Leer
   ======================================================================== */

const buildRow = z.object({
  id: z.string(),
  content_version: z.string(),
  data: z.string(),
  edit_token_hash: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

async function findBuild(db: D1Like, id: string): Promise<z.infer<typeof buildRow> | null> {
  const row = await db
    .prepare('SELECT id, content_version, data, edit_token_hash, created_at, updated_at FROM builds WHERE id = ?')
    .bind(id)
    .first();
  if (row === null) return null;
  const parsed = buildRow.safeParse(row);
  if (!parsed.success) throw new Error(`Fila de builds inválida para ${id}.`);
  return parsed.data;
}

export async function getBuild(db: D1Like, id: string): Promise<ApiResult<BuildView>> {
  const row = await findBuild(db, id);
  if (row === null) return fail(404, 'build_not_found', 'Ese build no existe.');

  const parsed = parseSelections(JSON.parse(row.data) as unknown);
  if (!parsed.ok) throw new Error(`Los datos guardados del build ${id} no son válidos.`);

  return {
    ok: true,
    status: 200,
    body: {
      id: row.id,
      contentVersion: row.content_version,
      selections: parsed.selections,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

/* ========================================================================
   Editar (requiere el token secreto)
   ======================================================================== */

export async function updateBuild(
  db: D1Like,
  id: string,
  token: string | null,
  rawSelections: unknown,
): Promise<ApiResult<UpdatedBuild>> {
  if (token === null) return fail(401, 'token_required', 'Falta el token de edición.');

  const row = await findBuild(db, id);
  if (row === null) return fail(404, 'build_not_found', 'Ese build no existe.');
  if (!safeEqual(await hashToken(token), row.edit_token_hash)) {
    return fail(403, 'invalid_token', 'El token de edición no es válido para este build.');
  }

  // Se valida contra la versión de contenido con la que se creó el build.
  let content: CyoaContent;
  try {
    content = await loadContentVersion(db, row.content_version);
  } catch {
    return fail(500, 'content_unavailable', 'No se encontró la versión de contenido de este build.');
  }

  const validated = validateSelections(content, rawSelections);
  if (!validated.ok) return validated.result;

  const updated = await db
    .prepare(
      "UPDATE builds SET data = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? RETURNING updated_at",
    )
    .bind(JSON.stringify(validated.selections), id)
    .first<{ updated_at: string }>();

  return {
    ok: true,
    status: 200,
    body: { id, contentVersion: row.content_version, updatedAt: updated?.updated_at ?? row.updated_at },
  };
}
