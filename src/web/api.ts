import { z } from 'zod';
import { selectionsSchema, type BuildSelections } from '../shared';

/* ------------------------------ Respuestas ------------------------------ */

const createdSchema = z.object({ id: z.string(), editToken: z.string(), contentVersion: z.string() });
const updatedSchema = z.object({ id: z.string(), contentVersion: z.string(), updatedAt: z.string() });
const viewSchema = z.object({
  id: z.string(),
  contentVersion: z.string(),
  selections: selectionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
const errorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

export type CreatedBuild = z.infer<typeof createdSchema>;
export type BuildView = z.infer<typeof viewSchema>;

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiRequestError(0, 'network', 'No se pudo conectar con el servidor.');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorSchema.safeParse(payload);
    throw parsed.success
      ? new ApiRequestError(response.status, parsed.data.error.code, parsed.data.error.message)
      : new ApiRequestError(response.status, 'unknown', `Error ${response.status} del servidor.`);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new ApiRequestError(response.status, 'bad_response', 'Respuesta inesperada del servidor.');
  return parsed.data;
}

const jsonInit = (method: string, selections: BuildSelections, token?: string): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json', ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }) },
  body: JSON.stringify({ selections }),
});

export const createBuild = (selections: BuildSelections): Promise<CreatedBuild> =>
  request('/api/builds', jsonInit('POST', selections), createdSchema);

export const fetchBuild = (id: string): Promise<BuildView> => request(`/api/builds/${id}`, { method: 'GET' }, viewSchema);

export const updateBuild = (id: string, token: string, selections: BuildSelections): Promise<void> =>
  request(`/api/builds/${id}`, jsonInit('PUT', selections, token), updatedSchema).then(() => undefined);

/* ------------------------------ Rutas y enlaces ------------------------------ */

const PATH_PATTERN = /^\/b\/([0-9A-Za-z]{8})\/?$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** Id del build si la ruta es /b/:id; si no, null. */
export function buildIdFromPath(pathname: string): string | null {
  return PATH_PATTERN.exec(pathname)?.[1] ?? null;
}

/** Token de edición si el fragmento es #edit=<token> con formato válido; si no, null. */
export function tokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('edit');
  return token !== null && TOKEN_PATTERN.test(token) ? token : null;
}

export const publicUrl = (origin: string, id: string): string => `${origin}/b/${id}`;
export const editUrl = (origin: string, id: string, token: string): string => `${origin}/b/${id}#edit=${token}`;

/* ------------------------------ Tokens guardados en el navegador ------------------------------ */

const TOKENS_KEY = 'ri-cyoa:tokens:v1';
const tokensSchema = z.record(z.string(), z.string());

function readTokens(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(TOKENS_KEY);
    const parsed = tokensSchema.safeParse(raw === null ? {} : (JSON.parse(raw) as unknown));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export const getToken = (id: string): string | null => readTokens()[id] ?? null;

export function saveToken(id: string, token: string): void {
  try {
    window.localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...readTokens(), [id]: token }));
  } catch {
    /* sin almacenamiento: el usuario conserva el enlace de edición */
  }
}
