import { describe, expect, it } from 'vitest';
import { defaultDeps, handleApi, hashToken, type ApiDeps } from '../src/server/api';
import { buildSeedSql } from '../src/server/db';
import { createEmptySelections, loadContent, type BuildSelections } from '../src/shared';
import { content, mode, run, toggle } from './helpers';
import { createMigratedDatabase, type SqliteD1 } from './sqlite-d1';

function seededDatabase(): SqliteD1 {
  const db = createMigratedDatabase();
  db.raw.exec(buildSeedSql(content));
  return db;
}

interface Reply {
  readonly status: number;
  readonly headers: Headers;
  readonly body: unknown;
}

async function call(
  db: SqliteD1,
  method: string,
  path: string,
  options: { body?: unknown; rawBody?: string; token?: string; headers?: Record<string, string>; deps?: ApiDeps } = {},
): Promise<Reply> {
  const headers: Record<string, string> = { ...options.headers };
  if (options.token !== undefined) headers['Authorization'] = `Bearer ${options.token}`;
  const raw = options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
  const init: RequestInit = { method, headers };
  if (raw !== undefined) init.body = raw;
  const response = await handleApi(new Request(`https://cyoa.test${path}`, init), db, options.deps ?? defaultDeps);
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text === '' ? null : (JSON.parse(text) as unknown) };
}

const validSelections = (): BuildSelections =>
  run([mode('normal'), toggle('tier1', 'tier1-combat')]).selections;

interface Created {
  readonly id: string;
  readonly editToken: string;
  readonly contentVersion: string;
}

async function createValid(db: SqliteD1, selections: BuildSelections = validSelections()): Promise<Created> {
  const reply = await call(db, 'POST', '/api/builds', { body: { selections } });
  expect(reply.status).toBe(201);
  return reply.body as Created;
}

/* ------------------------------------------------------------------ */

describe('GET /api/content', () => {
  it('sirve el contenido vigente con ETag y responde 304 si no cambió', async () => {
    const db = seededDatabase();
    const first = await call(db, 'GET', '/api/content');
    expect(first.status).toBe(200);
    expect(first.body).toStrictEqual(content);
    const etag = first.headers.get('etag');
    expect(etag).toBe(`"${content.contentVersion}"`);
    expect(first.headers.get('cache-control')).toContain('max-age=300');

    const second = await call(db, 'GET', '/api/content', { headers: { 'If-None-Match': etag ?? '' } });
    expect(second.status).toBe(304);
  });

  it('sirve una versión concreta como inmutable y rechaza versiones inexistentes o mal formadas', async () => {
    const db = seededDatabase();
    const found = await call(db, 'GET', `/api/content/${content.contentVersion}`);
    expect(found.status).toBe(200);
    expect(found.headers.get('cache-control')).toContain('immutable');
    expect((await call(db, 'GET', '/api/content/no-existe')).status).toBe(404);
    expect((await call(db, 'GET', '/api/content/mal%20formada')).status).toBe(404);
  });

  it('responde 503 si todavía no hay contenido publicado', async () => {
    expect((await call(createMigratedDatabase(), 'GET', '/api/content')).status).toBe(503);
  });
});

/* ------------------------------------------------------------------ */

describe('POST /api/builds', () => {
  it('crea un build con id de 8 caracteres y token de 43, y guarda solo el hash', async () => {
    const db = seededDatabase();
    const created = await createValid(db);
    expect(created.id).toMatch(/^[0-9A-Za-z]{8}$/);
    expect(created.editToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(created.contentVersion).toBe(content.contentVersion);

    const row = db.raw.prepare('SELECT * FROM builds').get();
    expect(row?.['edit_token_hash']).toBe(await hashToken(created.editToken));
    expect(JSON.stringify(row)).not.toContain(created.editToken);
  });

  it('rechaza JSON inválido, cuerpos sin "selections" y formatos incorrectos', async () => {
    const db = seededDatabase();
    expect((await call(db, 'POST', '/api/builds', { rawBody: '{no es json' })).status).toBe(400);
    expect((await call(db, 'POST', '/api/builds', { body: { otra: 1 } })).status).toBe(400);
    const wrongShape = await call(db, 'POST', '/api/builds', { body: { selections: { modeId: 5 } } });
    expect(wrongShape.status).toBe(400);
    expect(wrongShape.body).toMatchObject({ error: { code: 'invalid_selections' } });
  });

  it('rechaza con 422 los builds que incumplen las reglas y explica cuáles', async () => {
    const db = seededDatabase();
    const base = createEmptySelections();
    const broken: BuildSelections = {
      ...base,
      modeId: 'normal',
      multiple: { ...base.multiple, soul: [{ optionId: 'soul-100k', count: 1 }] },
    };
    const reply = await call(db, 'POST', '/api/builds', { body: { selections: broken } });
    expect(reply.status).toBe(422);
    expect(reply.body).toMatchObject({
      error: {
        code: 'invalid_build',
        issues: [{ code: 'requirement_unmet', target: { kind: 'option', optionId: 'soul-100k' } }],
      },
    });
    expect(db.raw.prepare('SELECT COUNT(*) AS total FROM builds').get()?.['total']).toBe(0);
  });

  it('acepta pasarse del presupuesto (es una advertencia, no un error)', async () => {
    const db = seededDatabase();
    const overBudget = run([mode('hard'), toggle('tier5', 'tier5-maps'), toggle('tier5', 'tier5-prodigy')]).selections;
    expect((await call(db, 'POST', '/api/builds', { body: { selections: overBudget } })).status).toBe(201);
  });

  it('rechaza cuerpos demasiado grandes', async () => {
    const db = seededDatabase();
    const reply = await call(db, 'POST', '/api/builds', { rawBody: JSON.stringify({ selections: 'x'.repeat(70_000) }) });
    expect(reply.status).toBe(413);
  });

  it('guarda la versión canónica: descarta texto libre de opciones que no están elegidas', async () => {
    const db = seededDatabase();
    const dirty: BuildSelections = { ...validSelections(), inputs: { 'tier1-combat': 'basura', fantasma: 'más basura' } };
    const created = await createValid(db, dirty);
    const stored = await call(db, 'GET', `/api/builds/${created.id}`);
    expect(stored.body).toMatchObject({ selections: { inputs: {} } });
  });

  it('reintenta con otro id si el generado ya existe', async () => {
    const db = seededDatabase();
    const ids = ['AAAAAAAA', 'AAAAAAAA', 'BBBBBBBB'];
    const deps: ApiDeps = { generateToken: defaultDeps.generateToken, generateId: () => ids.shift() ?? 'ZZZZZZZZ' };

    const first = await call(db, 'POST', '/api/builds', { body: { selections: validSelections() }, deps });
    const second = await call(db, 'POST', '/api/builds', { body: { selections: validSelections() }, deps });
    expect(first.body).toMatchObject({ id: 'AAAAAAAA' });
    expect(second.body).toMatchObject({ id: 'BBBBBBBB' });
  });

  it('responde 503 si no hay contenido publicado', async () => {
    const reply = await call(createMigratedDatabase(), 'POST', '/api/builds', { body: { selections: validSelections() } });
    expect(reply.status).toBe(503);
  });
});

/* ------------------------------------------------------------------ */

describe('GET /api/builds/:id', () => {
  it('devuelve el build sin exponer el hash ni el token', async () => {
    const db = seededDatabase();
    const created = await createValid(db);
    const reply = await call(db, 'GET', `/api/builds/${created.id}`);

    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({
      id: created.id,
      contentVersion: content.contentVersion,
      selections: validSelections(),
    });
    const text = JSON.stringify(reply.body);
    expect(text).not.toContain('edit_token_hash');
    expect(text).not.toContain(created.editToken);
    expect(reply.headers.get('cache-control')).toBe('no-store');
  });

  it('responde 404 si no existe o el id está mal formado', async () => {
    const db = seededDatabase();
    expect((await call(db, 'GET', '/api/builds/zzzzzzzz')).status).toBe(404);
    expect((await call(db, 'GET', '/api/builds/corto')).status).toBe(404);
    expect((await call(db, 'GET', '/api/builds/con-guion')).status).toBe(404);
  });
});

/* ------------------------------------------------------------------ */

describe('PUT /api/builds/:id', () => {
  const edited = (): BuildSelections =>
    run([toggle('tier1', 'tier1-wealth')], validSelections()).selections;

  it('edita con el token correcto', async () => {
    const db = seededDatabase();
    const created = await createValid(db);

    const reply = await call(db, 'PUT', `/api/builds/${created.id}`, {
      token: created.editToken,
      body: { selections: edited() },
    });
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ id: created.id, contentVersion: content.contentVersion });

    const stored = await call(db, 'GET', `/api/builds/${created.id}`);
    expect(stored.body).toMatchObject({ selections: edited() });
  });

  it('pide el token (401) y rechaza uno incorrecto (403) sin modificar nada', async () => {
    const db = seededDatabase();
    const created = await createValid(db);
    const path = `/api/builds/${created.id}`;
    const body = { selections: edited() };

    expect((await call(db, 'PUT', path, { body })).status).toBe(401);
    expect((await call(db, 'PUT', path, { body, token: 'corto' })).status).toBe(401);
    const wrong = await call(db, 'PUT', path, { body, token: 'A'.repeat(43) });
    expect(wrong.status).toBe(403);
    expect(wrong.body).toMatchObject({ error: { code: 'invalid_token' } });

    const stored = await call(db, 'GET', path);
    expect(stored.body).toMatchObject({ selections: validSelections() });
  });

  it('responde 404 si el build no existe y 422 si la edición rompe las reglas', async () => {
    const db = seededDatabase();
    const created = await createValid(db);
    expect((await call(db, 'PUT', '/api/builds/zzzzzzzz', { token: created.editToken, body: { selections: edited() } })).status).toBe(404);

    const base = createEmptySelections();
    const broken: BuildSelections = {
      ...base,
      modeId: 'normal',
      multiple: { ...base.multiple, soul: [{ optionId: 'soul-100k', count: 1 }] },
    };
    const reply = await call(db, 'PUT', `/api/builds/${created.id}`, { token: created.editToken, body: { selections: broken } });
    expect(reply.status).toBe(422);
  });

  it('conserva la versión de contenido original aunque haya una vigente más nueva', async () => {
    const db = seededDatabase();
    const created = await createValid(db);

    const next = structuredClone(content);
    next.contentVersion = '2026-10-24.1';
    db.raw.exec(buildSeedSql(loadContent(next)));
    expect((await call(db, 'GET', '/api/content')).headers.get('etag')).toBe('"2026-10-24.1"');

    const reply = await call(db, 'PUT', `/api/builds/${created.id}`, {
      token: created.editToken,
      body: { selections: edited() },
    });
    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({ contentVersion: content.contentVersion });
    expect(db.raw.prepare('SELECT content_version FROM builds').get()?.['content_version']).toBe(content.contentVersion);
  });
});

/* ------------------------------------------------------------------ */

describe('Rutas y métodos', () => {
  it('devuelve 405 con Allow y 404 para rutas desconocidas', async () => {
    const db = seededDatabase();
    const created = await createValid(db);

    const wrongMethod = await call(db, 'DELETE', `/api/builds/${created.id}`);
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('GET, PUT');
    expect((await call(db, 'GET', '/api/builds')).headers.get('allow')).toBe('POST');
    expect((await call(db, 'POST', '/api/content')).status).toBe(405);

    expect((await call(db, 'GET', '/api/nada')).status).toBe(404);
    expect((await call(db, 'GET', '/otra/ruta')).status).toBe(404);
    expect((await call(db, 'GET', `/api/builds/${created.id}/extra`)).status).toBe(404);
  });
});
