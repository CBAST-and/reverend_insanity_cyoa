import { z } from 'zod';

/**
 * Verificación del JWT que Cloudflare Access añade en la cabecera Cf-Access-Jwt-Assertion.
 * Access solo lo adjunta en los hostnames que tengan una aplicación asociada, así que la API
 * no confía en que la ruta esté protegida: comprueba firma (RS256), emisor, audiencia y expiración.
 */

export interface AccessConfig {
  /** Dominio del equipo de Zero Trust, p. ej. "miequipo.cloudflareaccess.com". */
  readonly teamDomain: string;
  /** Etiqueta AUD de la aplicación de Access. */
  readonly aud: string;
}

export interface AccessDeps {
  readonly fetchJwks: (url: string) => Promise<unknown>;
  /** Milisegundos desde la época. */
  readonly now: () => number;
}

/** Configuración del administrador: Cloudflare Access, una clave propia, o ambas. */
export type AdminContext = Partial<AccessConfig> &
  Partial<AccessDeps> & {
    /** Clave de administrador (mínimo 32 caracteres; una más corta se ignora). */
    readonly adminKey?: string;
  };

export type AccessResult =
  | { readonly ok: true; readonly email: string }
  | { readonly ok: false; readonly status: 401 | 403; readonly reason: string };

const JWKS_TTL_MS = 10 * 60 * 1000;

const jwksSchema = z.object({
  keys: z.array(z.looseObject({ kid: z.string(), kty: z.literal('RSA'), n: z.string(), e: z.string() })),
});
const headerSchema = z.object({ alg: z.string(), kid: z.string() });
const payloadSchema = z.object({
  aud: z.union([z.string(), z.array(z.string())]),
  iss: z.string(),
  exp: z.number(),
  nbf: z.number().optional(),
  email: z.string().optional(),
});

type Jwk = z.infer<typeof jwksSchema>['keys'][number];

const jwksCache = new Map<string, { readonly keys: readonly Jwk[]; readonly fetchedAt: number }>();

export const defaultDeps: AccessDeps = {
  fetchJwks: async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`No se pudieron obtener las claves de Access (${response.status}).`);
    return response.json() as Promise<unknown>;
  },
  now: () => Date.now(),
};

function decodeBase64Url(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

const decodeJson = (input: string): unknown => JSON.parse(new TextDecoder().decode(decodeBase64Url(input))) as unknown;

const normalizeDomain = (teamDomain: string): string => teamDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');

async function findKey(config: AccessConfig, deps: AccessDeps, kid: string): Promise<Jwk | null> {
  const domain = normalizeDomain(config.teamDomain);
  const url = `https://${domain}/cdn-cgi/access/certs`;
  const cached = jwksCache.get(url);
  const fresh = cached !== undefined && deps.now() - cached.fetchedAt < JWKS_TTL_MS;

  const known = fresh ? cached.keys.find((key) => key.kid === kid) : undefined;
  if (known !== undefined) return known;

  // Caché vencida o clave desconocida (posible rotación): se vuelve a pedir.
  const keys = jwksSchema.parse(await deps.fetchJwks(url)).keys;
  jwksCache.set(url, { keys, fetchedAt: deps.now() });
  return keys.find((key) => key.kid === kid) ?? null;
}

export async function verifyAccessJwt(
  token: string | null,
  config: AccessConfig,
  deps: AccessDeps = defaultDeps,
): Promise<AccessResult> {
  if (token === null || token === '') return { ok: false, status: 401, reason: 'Falta el token de Access.' };

  const parts = token.split('.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (parts.length !== 3 || encodedHeader === undefined || encodedPayload === undefined || encodedSignature === undefined) {
    return { ok: false, status: 401, reason: 'Token mal formado.' };
  }

  try {
    const header = headerSchema.parse(decodeJson(encodedHeader));
    if (header.alg !== 'RS256') return { ok: false, status: 403, reason: 'Algoritmo no permitido.' };

    const jwk = await findKey(config, deps, header.kid);
    if (jwk === null) return { ok: false, status: 403, reason: 'Clave de firma desconocida.' };

    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!signatureValid) return { ok: false, status: 403, reason: 'Firma inválida.' };

    const payload = payloadSchema.parse(decodeJson(encodedPayload));
    const nowSeconds = Math.floor(deps.now() / 1000);
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (payload.iss !== `https://${normalizeDomain(config.teamDomain)}`) {
      return { ok: false, status: 403, reason: 'Emisor no válido.' };
    }
    if (!audiences.includes(config.aud)) return { ok: false, status: 403, reason: 'Audiencia no válida.' };
    if (payload.exp <= nowSeconds) return { ok: false, status: 403, reason: 'Token vencido.' };
    if (payload.nbf !== undefined && payload.nbf > nowSeconds) return { ok: false, status: 403, reason: 'Token aún no válido.' };

    return { ok: true, email: payload.email ?? 'service-token' };
  } catch {
    return { ok: false, status: 401, reason: 'Token ilegible.' };
  }
}

/** Solo para pruebas: limpia las claves en caché. */
export function clearAccessCache(): void {
  jwksCache.clear();
}
