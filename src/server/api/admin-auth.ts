import { defaultDeps as defaultAccessDeps, verifyAccessJwt, type AdminContext } from '../access';
import { hashToken, safeEqual } from './tokens';

/** Una clave más corta se trata como no configurada, para que nunca abra el admin una clave débil. */
export const MIN_ADMIN_KEY_LENGTH = 32;

export type AdminAuth =
  | { readonly ok: true; readonly email: string }
  | { readonly ok: false; readonly status: 401 | 403 | 503; readonly code: string; readonly reason: string };

const deny = (status: 401 | 403 | 503, code: string, reason: string): AdminAuth => ({ ok: false, status, code, reason });

/**
 * Acepta una de dos credenciales:
 *  - "Authorization: Bearer <clave>" si hay ADMIN_KEY configurada.
 *  - El JWT de Cloudflare Access (Cf-Access-Jwt-Assertion) si hay Access configurado.
 * Sin ninguna configurada, el admin queda cerrado (503).
 */
export async function authenticateAdmin(request: Request, admin: AdminContext | null): Promise<AdminAuth> {
  const key = admin?.adminKey ?? '';
  const teamDomain = admin?.teamDomain ?? '';
  const aud = admin?.aud ?? '';
  const keyConfigured = key.length >= MIN_ADMIN_KEY_LENGTH;
  const accessConfigured = teamDomain !== '' && aud !== '';

  if (!keyConfigured && !accessConfigured) {
    return deny(503, 'admin_not_configured', 'El administrador no está configurado.');
  }

  const bearer = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (bearer !== undefined) {
    if (!keyConfigured) return deny(401, 'key_not_accepted', 'Este sitio no usa clave de administrador.');
    // Se comparan los hashes: misma longitud siempre y tiempo constante.
    if (safeEqual(await hashToken(bearer), await hashToken(key))) {
      return { ok: true, email: 'clave de administrador' };
    }
    console.warn('Intento de acceso al administrador con una clave incorrecta.');
    return deny(403, 'invalid_key', 'La clave no es correcta.');
  }

  const jwt = request.headers.get('cf-access-jwt-assertion');
  if (jwt !== null && accessConfigured) {
    const result = await verifyAccessJwt(
      jwt,
      { teamDomain, aud },
      { fetchJwks: admin?.fetchJwks ?? defaultAccessDeps.fetchJwks, now: admin?.now ?? defaultAccessDeps.now },
    );
    return result.ok ? { ok: true, email: result.email } : deny(result.status, 'access_denied', result.reason);
  }

  return deny(401, 'auth_required', 'Falta autenticación de administrador.');
}
