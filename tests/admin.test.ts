import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handleApi } from '../src/server/api';
import { clearAccessCache, type AdminContext } from '../src/server/access';
import { buildSeedSql } from '../src/server/db';
import { content, mode, run, toggle } from './helpers';
import { createMigratedDatabase, type SqliteD1 } from './sqlite-d1';

const TEAM = 'miequipo.cloudflareaccess.com';
const AUD = 'aud-tag-123';
const NOW = Date.UTC(2026, 9, 24, 12, 0, 0);
const NOW_SECONDS = Math.floor(NOW / 1000);

/* ------------------------------ JWT de prueba ------------------------------ */

const base64Url = (data: Uint8Array | string): string => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const RSA = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' } as const;

let signingKey: CryptoKey;
let otherKey: CryptoKey;
let jwks: { keys: { kid: string; kty: 'RSA'; n: string; e: string }[] };

async function sign(
  payload: Record<string, unknown>,
  key: CryptoKey = signingKey,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'k1', typ: 'JWT' },
): Promise<string> {
  const input = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input)));
  return `${input}.${base64Url(signature)}`;
}

const claims = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  aud: [AUD],
  iss: `https://${TEAM}`,
  exp: NOW_SECONDS + 3600,
  email: 'sebas@itla.edu.do',
  ...overrides,
});

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(RSA, true, ['sign', 'verify']);
  const other = await crypto.subtle.generateKey(RSA, true, ['sign', 'verify']);
  signingKey = pair.privateKey;
  otherKey = other.privateKey;
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  jwks = { keys: [{ kid: 'k1', kty: 'RSA', n: publicJwk.n ?? '', e: publicJwk.e ?? '' }] };
});

beforeEach(() => clearAccessCache());

const admin = (): AdminContext => ({
  teamDomain: TEAM,
  aud: AUD,
  fetchJwks: () => Promise.resolve(jwks),
  now: () => NOW,
});

/* ------------------------------ Utilidades ------------------------------ */

function seededDatabase(): SqliteD1 {
  const db = createMigratedDatabase();
  db.raw.exec(buildSeedSql(content));
  return db;
}

interface Reply {
  readonly status: number;
  readonly body: unknown;
}

async function call(
  db: SqliteD1,
  method: string,
  path: string,
  options: { jwt?: string; body?: unknown; headers?: Record<string, string>; context?: AdminContext | null } = {},
): Promise<Reply> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.jwt !== undefined) headers['Cf-Access-Jwt-Assertion'] = options.jwt;
  if (method !== 'GET' && headers['Content-Type'] === undefined) headers['Content-Type'] = 'application/json';
  const init: RequestInit = { method, headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  const context = options.context === undefined ? admin() : options.context;
  const response = await handleApi(new Request(`https://cyoa.test${path}`, init), db, undefined, context);
  const text = await response.text();
  return { status: response.status, body: text === '' ? null : (JSON.parse(text) as unknown) };
}

const validJwt = (): Promise<string> => sign(claims());

/* ------------------------------------------------------------------ */

describe('Acceso con Cloudflare Access', () => {
  it('acepta un JWT válido y expone el correo', async () => {
    const reply = await call(seededDatabase(), 'GET', '/api/admin/draft', { jwt: await validJwt() });
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ email: 'sebas@itla.edu.do', draftChanged: false });
  });

  it('acepta el aud como texto y el dominio con https://', async () => {
    const jwt = await sign(claims({ aud: AUD }));
    const reply = await call(seededDatabase(), 'GET', '/api/admin/draft', {
      jwt,
      context: { ...admin(), teamDomain: `https://${TEAM}/` },
    });
    expect(reply.status).toBe(200);
  });

  it('rechaza con 401 si falta el token o es ilegible', async () => {
    const db = seededDatabase();
    expect((await call(db, 'GET', '/api/admin/draft')).status).toBe(401);
    expect((await call(db, 'GET', '/api/admin/draft', { jwt: 'abc' })).status).toBe(401);
    expect((await call(db, 'GET', '/api/admin/draft', { jwt: 'a.b.c' })).status).toBe(401);
  });

  it('rechaza con 403 firmas ajenas, algoritmos no permitidos y claves desconocidas', async () => {
    const db = seededDatabase();
    const forged = await sign(claims(), otherKey);
    expect((await call(db, 'GET', '/api/admin/draft', { jwt: forged })).status).toBe(403);

    const none = `${base64Url(JSON.stringify({ alg: 'none', kid: 'k1' }))}.${base64Url(JSON.stringify(claims()))}.`;
    expect((await call(db, 'GET', '/api/admin/draft', { jwt: none })).status).toBe(403);

    const hs256 = await sign(claims(), signingKey, { alg: 'HS256', kid: 'k1' });
    expect((await call(db, 'GET', '/api/admin/draft', { jwt: hs256 })).status).toBe(403);

    const unknownKid = await sign(claims(), signingKey, { alg: 'RS256', kid: 'otra' });
    expect((await call(db, 'GET', '/api/admin/draft', { jwt: unknownKid })).status).toBe(403);
  });

  it('rechaza con 403 audiencia, emisor, expiración y nbf incorrectos', async () => {
    const db = seededDatabase();
    for (const overrides of [
      { aud: ['otra-app'] },
      { iss: 'https://otro.cloudflareaccess.com' },
      { exp: NOW_SECONDS - 1 },
      { nbf: NOW_SECONDS + 600 },
    ]) {
      const reply = await call(db, 'GET', '/api/admin/draft', { jwt: await sign(claims(overrides)) });
      expect(reply.status, JSON.stringify(overrides)).toBe(403);
    }
  });

  it('queda cerrado (503) si no está configurado', async () => {
    const reply = await call(seededDatabase(), 'GET', '/api/admin/draft', { jwt: await validJwt(), context: null });
    expect(reply.status).toBe(503);
    expect(reply.body).toMatchObject({ error: { code: 'admin_not_configured' } });
  });

  it('protege todas las rutas del admin, no solo el borrador', async () => {
    const db = seededDatabase();
    expect((await call(db, 'PATCH', '/api/admin/options/tier1-combat', { body: { cost: -60 } })).status).toBe(401);
    expect((await call(db, 'POST', '/api/admin/publish')).status).toBe(401);
    const unchanged = await call(db, 'GET', '/api/admin/draft', { jwt: await validJwt() });
    expect(unchanged.body).toMatchObject({ draftChanged: false });
  });

  it('guarda las claves de Access en caché y no las pide en cada petición', async () => {
    let calls = 0;
    const context: AdminContext = {
      ...admin(),
      fetchJwks: () => {
        calls += 1;
        return Promise.resolve(jwks);
      },
    };
    const db = seededDatabase();
    const jwt = await validJwt();
    await call(db, 'GET', '/api/admin/draft', { jwt, context });
    await call(db, 'GET', '/api/admin/draft', { jwt, context });
    expect(calls).toBe(1); // la segunda vez sale de la caché
  });
});

/* ------------------------------------------------------------------ */

describe('Edición y publicación', () => {
  const edit = async (db: SqliteD1, id: string, body: unknown): Promise<Reply> =>
    call(db, 'PATCH', `/api/admin/options/${id}`, { jwt: await validJwt(), body });

  it('editar cambia el borrador pero no lo publicado', async () => {
    const db = seededDatabase();
    expect((await edit(db, 'tier1-combat', { cost: -60, name: 'Combate renovado' })).status).toBe(200);

    const draft = await call(db, 'GET', '/api/admin/draft', { jwt: await validJwt() });
    expect(draft.body).toMatchObject({ draftChanged: true });

    const published = await call(db, 'GET', '/api/content');
    expect(published.status).toBe(200);
    const option = (published.body as typeof content).categories.tier1.options.find((o) => o.id === 'tier1-combat');
    expect(option).toMatchObject({ cost: -50 });
  });

  it('valida los cambios y responde 404 si la opción no existe', async () => {
    const db = seededDatabase();
    expect((await edit(db, 'tier1-combat', {})).status).toBe(400);
    expect((await edit(db, 'tier1-combat', { campo: 1 })).status).toBe(400);
    expect((await edit(db, 'tier1-combat', { cost: 1.5 })).status).toBe(400);
    expect((await edit(db, 'tier1-combat', { name: '' })).status).toBe(400);
    expect((await edit(db, 'no-existe', { cost: 1 })).status).toBe(404);
  });

  it('publicar crea una versión nueva vigente y conserva la anterior para los builds viejos', async () => {
    const db = seededDatabase();
    const build = await handleApi(
      new Request('https://cyoa.test/api/builds', {
        method: 'POST',
        body: JSON.stringify({ selections: run([mode('normal'), toggle('tier1', 'tier1-combat')]).selections }),
      }),
      db,
    );
    expect(build.status).toBe(201);
    const created = (await build.json()) as { id: string };

    await edit(db, 'tier1-combat', { cost: -60 });
    const published = await call(db, 'POST', '/api/admin/publish', { jwt: await validJwt() });
    expect(published.status).toBe(201);
    expect(published.body).toEqual({ version: '2026-10-24.1' });

    const current = (await call(db, 'GET', '/api/content')).body as typeof content;
    expect(current.contentVersion).toBe('2026-10-24.1');
    expect(current.categories.tier1.options.find((o) => o.id === 'tier1-combat')?.cost).toBe(-60);

    const old = (await call(db, 'GET', `/api/content/${content.contentVersion}`)).body as typeof content;
    expect(old.categories.tier1.options.find((o) => o.id === 'tier1-combat')?.cost).toBe(-50);

    const stored = await handleApi(new Request(`https://cyoa.test/api/builds/${created.id}`), db);
    expect(stored.status).toBe(200);
    expect(((await stored.json()) as { contentVersion: string }).contentVersion).toBe(content.contentVersion);

    const after = await call(db, 'GET', '/api/admin/draft', { jwt: await validJwt() });
    expect(after.body).toMatchObject({ contentVersion: '2026-10-24.1', draftChanged: false });
  });

  it('no publica si no hay cambios (409) y numera varias versiones del mismo día', async () => {
    const db = seededDatabase();
    expect((await call(db, 'POST', '/api/admin/publish', { jwt: await validJwt() })).status).toBe(409);

    await edit(db, 'tier1-combat', { cost: -60 });
    expect((await call(db, 'POST', '/api/admin/publish', { jwt: await validJwt() })).body).toEqual({ version: '2026-10-24.1' });
    await edit(db, 'tier1-combat', { cost: -70 });
    expect((await call(db, 'POST', '/api/admin/publish', { jwt: await validJwt() })).body).toEqual({ version: '2026-10-24.2' });
  });

  it('rechaza peticiones de otro origen o sin JSON (defensa contra CSRF)', async () => {
    const db = seededDatabase();
    const jwt = await validJwt();
    const crossOrigin = await call(db, 'PATCH', '/api/admin/options/tier1-combat', {
      jwt,
      body: { cost: -60 },
      headers: { Origin: 'https://evil.test' },
    });
    expect(crossOrigin.status).toBe(403);

    const notJson = await call(db, 'PATCH', '/api/admin/options/tier1-combat', {
      jwt,
      body: { cost: -60 },
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(notJson.status).toBe(415);

    const sameOrigin = await call(db, 'PATCH', '/api/admin/options/tier1-combat', {
      jwt,
      body: { cost: -60 },
      headers: { Origin: 'https://cyoa.test' },
    });
    expect(sameOrigin.status).toBe(200);
  });

  it('devuelve 405 con métodos incorrectos y 404 con rutas desconocidas', async () => {
    const db = seededDatabase();
    const jwt = await validJwt();
    expect((await call(db, 'POST', '/api/admin/draft', { jwt })).status).toBe(405);
    expect((await call(db, 'GET', '/api/admin/publish', { jwt })).status).toBe(405);
    expect((await call(db, 'GET', '/api/admin/nada', { jwt })).status).toBe(404);
    expect((await call(db, 'GET', '/api/admin/draft/extra/mas', { jwt })).status).toBe(404);
  });
});

/* ------------------------------------------------------------------ */

describe('Acceso con clave de administrador', () => {
  const KEY = 'K'.repeat(43);
  const keyOnly = (): AdminContext => ({ adminKey: KEY, now: () => NOW });
  const withKey = (key: string): Record<string, string> => ({ Authorization: `Bearer ${key}` });

  it('acepta la clave correcta', async () => {
    const reply = await call(seededDatabase(), 'GET', '/api/admin/draft', { headers: withKey(KEY), context: keyOnly() });
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ email: 'clave de administrador', draftChanged: false });
    expect(JSON.stringify(reply.body)).not.toContain(KEY);
  });

  it('rechaza una clave incorrecta (403) y la falta de credenciales (401)', async () => {
    const db = seededDatabase();
    const wrong = await call(db, 'GET', '/api/admin/draft', { headers: withKey('X'.repeat(43)), context: keyOnly() });
    expect(wrong.status).toBe(403);
    expect(wrong.body).toMatchObject({ error: { code: 'invalid_key' } });
    expect((await call(db, 'GET', '/api/admin/draft', { context: keyOnly() })).status).toBe(401);
    expect((await call(db, 'GET', '/api/admin/draft', { headers: { Authorization: 'Basic abc' }, context: keyOnly() })).status).toBe(401);
  });

  it('ignora una clave de menos de 32 caracteres: el admin sigue cerrado', async () => {
    const weak = 'corta123';
    const reply = await call(seededDatabase(), 'GET', '/api/admin/draft', {
      headers: withKey(weak),
      context: { adminKey: weak },
    });
    expect(reply.status).toBe(503);
  });

  it('no acepta una clave si el sitio solo usa Access', async () => {
    const reply = await call(seededDatabase(), 'GET', '/api/admin/draft', { headers: withKey(KEY) });
    expect(reply.status).toBe(401);
    expect(reply.body).toMatchObject({ error: { code: 'key_not_accepted' } });
  });

  it('con ambos modos configurados funcionan los dos', async () => {
    const db = seededDatabase();
    const both: AdminContext = { ...admin(), adminKey: KEY };
    expect((await call(db, 'GET', '/api/admin/draft', { headers: withKey(KEY), context: both })).status).toBe(200);
    expect((await call(db, 'GET', '/api/admin/draft', { jwt: await validJwt(), context: both })).status).toBe(200);
    expect((await call(db, 'GET', '/api/admin/draft', { headers: withKey('X'.repeat(43)), context: both })).status).toBe(403);
  });

  it('permite editar y publicar de principio a fin', async () => {
    const db = seededDatabase();
    const options = { headers: withKey(KEY), context: keyOnly() };
    const patched = await call(db, 'PATCH', '/api/admin/options/tier1-combat', { ...options, body: { cost: -60 } });
    expect(patched.status).toBe(200);
    const published = await call(db, 'POST', '/api/admin/publish', options);
    expect(published.status).toBe(201);
    expect(published.body).toEqual({ version: '2026-10-24.1' });
  });
});
