/**
 * Adaptador de Cloudflare Pages Functions: todo lo que cuelga de /api/* se resuelve
 * en handleApi, que es lógica pura y está probada sin el runtime de Workers.
 *
 * Secretos de Pages para el administrador (basta con uno de los dos modos):
 *   ADMIN_KEY           clave de administrador, mínimo 32 caracteres
 *   ACCESS_TEAM_DOMAIN  p. ej. miequipo.cloudflareaccess.com   (junto con ACCESS_AUD)
 *   ACCESS_AUD          etiqueta AUD de la aplicación de Access
 * Sin ninguno, las rutas /api/admin/* responden 503 (el admin queda cerrado).
 */
import { handleApi } from '../../src/server/api';
import type { D1Like } from '../../src/server/db';

interface Env {
  readonly DB: D1Like;
  readonly ACCESS_TEAM_DOMAIN?: string;
  readonly ACCESS_AUD?: string;
  readonly ADMIN_KEY?: string;
}

interface Context {
  readonly request: Request;
  readonly env: Env;
}

export const onRequest = (context: Context): Promise<Response> => {
  const { request, env } = context;
  const admin = {
    teamDomain: env.ACCESS_TEAM_DOMAIN ?? '',
    aud: env.ACCESS_AUD ?? '',
    adminKey: env.ADMIN_KEY ?? '',
  };
  const configured = admin.adminKey !== '' || (admin.teamDomain !== '' && admin.aud !== '');
  return handleApi(request, env.DB, undefined, configured ? admin : null);
};
