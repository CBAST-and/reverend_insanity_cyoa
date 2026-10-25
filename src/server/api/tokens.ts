/**
 * Identificadores y tokens. Usa Web Crypto (disponible en Workers, navegadores y Node),
 * sin depender de Buffer ni de módulos de Node.
 */

const ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const BUILD_ID_LENGTH = 8;
export const BUILD_ID_PATTERN = /^[0-9A-Za-z]{8}$/;
export const EDIT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Id corto alfanumérico sin sesgo: se descartan los bytes que no caben en 62 símbolos exactos. */
export function generateBuildId(): string {
  let id = '';
  while (id.length < BUILD_ID_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < 248 && id.length < BUILD_ID_LENGTH) id += ID_ALPHABET.charAt(byte % 62);
    }
  }
  return id;
}

/** Token secreto de edición: 32 bytes aleatorios en base64url (43 caracteres). */
export function generateEditToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 en hexadecimal minúscula (lo único que se guarda del token). */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Comparación en tiempo constante para cadenas de la misma longitud. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let position = 0; position < a.length; position += 1) {
    difference |= a.charCodeAt(position) ^ b.charCodeAt(position);
  }
  return difference === 0;
}
