import { z } from 'zod';
import type { CyoaContent } from '../../shared';
import type { D1Like, SqlValue } from '../db/d1';
import { loadContentFromTables, loadCurrentContent } from '../db/load-content';
import type { ApiResult } from './builds';

const fail = (status: number, code: string, message: string): ApiResult<never> => ({
  ok: false,
  status,
  error: { code, message },
});

export interface DraftView {
  readonly contentVersion: string;
  /** true si las tablas editables difieren de la versión publicada. */
  readonly draftChanged: boolean;
  readonly content: CyoaContent;
}

/** Contenido de las tablas sin la versión: sirve para comparar borrador y publicado. */
const sameContent = (a: CyoaContent, b: CyoaContent): boolean =>
  JSON.stringify({ ...a, contentVersion: '' }) === JSON.stringify({ ...b, contentVersion: '' });

async function currentContent(db: D1Like): Promise<CyoaContent | null> {
  try {
    return await loadCurrentContent(db);
  } catch {
    return null;
  }
}

export async function getDraft(db: D1Like): Promise<ApiResult<DraftView>> {
  const current = await currentContent(db);
  if (current === null) return fail(503, 'content_unavailable', 'Todavía no hay una versión de contenido publicada.');
  const draft = await loadContentFromTables(db, current.contentVersion);
  return {
    ok: true,
    status: 200,
    body: { contentVersion: current.contentVersion, draftChanged: !sameContent(draft, current), content: draft },
  };
}

/* ------------------------------ Editar una opción ------------------------------ */

const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    cost: z.number().int().min(-100_000).max(100_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Se necesita al menos un campo.');

export async function patchOption(db: D1Like, id: string, raw: unknown): Promise<ApiResult<{ id: string }>> {
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, 'invalid_patch', `Cambios no válidos: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);
  }

  const sets: string[] = [];
  const values: SqlValue[] = [];
  if (parsed.data.name !== undefined) {
    sets.push('name = ?');
    values.push(parsed.data.name);
  }
  if (parsed.data.description !== undefined) {
    sets.push('description = ?');
    values.push(parsed.data.description);
  }
  if (parsed.data.cost !== undefined) {
    sets.push('cost = ?');
    values.push(parsed.data.cost);
  }

  const updated = await db
    .prepare(`UPDATE options SET ${sets.join(', ')} WHERE id = ? RETURNING id`)
    .bind(...values, id)
    .first();
  return updated === null ? fail(404, 'option_not_found', 'Esa opción no existe.') : { ok: true, status: 200, body: { id } };
}

/* ------------------------------ Publicar ------------------------------ */

export interface PublishedVersion {
  readonly version: string;
}

async function nextVersion(db: D1Like, now: Date): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  for (let serial = 1; serial <= 1000; serial += 1) {
    const candidate = `${day}.${serial}`;
    const existing = await db.prepare('SELECT 1 AS found FROM content_versions WHERE version = ?').bind(candidate).first();
    if (existing === null) return candidate;
  }
  throw new Error('No se pudo asignar un número de versión.');
}

export async function publishDraft(db: D1Like, now: Date): Promise<ApiResult<PublishedVersion>> {
  const current = await currentContent(db);
  if (current === null) return fail(503, 'content_unavailable', 'Todavía no hay una versión de contenido publicada.');

  const version = await nextVersion(db, now);
  let draft: CyoaContent;
  try {
    draft = await loadContentFromTables(db, version);
  } catch (error) {
    return fail(422, 'invalid_content', error instanceof Error ? error.message : 'El borrador no es un contenido válido.');
  }
  if (sameContent(draft, current)) return fail(409, 'no_changes', 'No hay cambios para publicar.');

  // Atómico: la versión anterior deja de ser la vigente en la misma transacción.
  await db.batch([
    db.prepare('UPDATE content_versions SET is_current = 0 WHERE is_current = 1'),
    db
      .prepare('INSERT INTO content_versions (version, schema_version, snapshot, is_current) VALUES (?, ?, ?, 1)')
      .bind(version, draft.schemaVersion, JSON.stringify(draft)),
  ]);
  return { ok: true, status: 201, body: { version } };
}
