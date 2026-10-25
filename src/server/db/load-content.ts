import { z } from 'zod';
import { loadContent } from '../../shared/content';
import {
  CATEGORY_ORDER,
  effectsSchema,
  type CyoaContent,
  type CyoaOption,
} from '../../shared/schema';
import type { D1Like, D1ResultLike } from './d1';

/* ========================================================================
   Filas tal como salen de las tablas (se validan para no depender de casts)
   ======================================================================== */

const flag = z.number().int().min(0).max(1);

const categoryRow = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
});

const optionRow = z.object({
  id: z.string(),
  category_key: z.string(),
  name: z.string(),
  description: z.string(),
  cost: z.number().int(),
  image: z.string().nullable(),
  negative: flag,
  repeatable: flag,
  max_count: z.number().int().nullable(),
  picks: z.number().int().nullable(),
  input_label: z.string().nullable(),
  input_required: flag,
  effects_json: z.string().nullable(),
});

const requirementRow = z.object({ option_id: z.string(), required_option_id: z.string() });
const conflictRow = z.object({ option_id: z.string(), conflicting_option_id: z.string() });
const disableRow = z.object({ option_id: z.string(), target: z.string() });

const statusRow = z.object({
  id: z.string(),
  tier_option_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  cost: z.number().int(),
});

const modeRow = z.object({
  id: z.string(),
  name: z.string(),
  points: z.number().int(),
  description: z.string(),
});

const pathRow = z.object({ id: z.string() });
const itemRow = z.object({ id: z.string(), name: z.string(), description: z.string() });
const levelRow = z.object({ level: z.string(), cost: z.number().int(), max_count: z.number().int().nullable() });
const surchargeRow = z.object({ category_key: z.string(), per_additional_pick: z.number().int() });
const snapshotRow = z.object({ snapshot: z.string() });

const CONTENT_SCHEMA_VERSION = 1;

function parseRows<S extends z.ZodType>(
  results: readonly D1ResultLike<unknown>[],
  position: number,
  schema: S,
  table: string,
): z.infer<S>[] {
  const result = results[position];
  if (result === undefined) throw new Error(`Falta el resultado de la consulta a ${table}.`);
  return result.results.map((row, rowNumber) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) {
      throw new Error(`Fila ${rowNumber} de ${table} inválida: ${parsed.error.message}`);
    }
    return parsed.data as z.infer<S>;
  });
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const list = groups.get(key(row));
    if (list === undefined) {
      groups.set(key(row), [row]);
    } else {
      list.push(row);
    }
  }
  return groups;
}

/* ========================================================================
   Contenido desde las tablas editables
   ======================================================================== */

/**
 * Reensambla el contenido completo a partir de las tablas normalizadas, en una
 * sola llamada batch (una transacción, y una sola "consulta" para el límite de
 * invocación del plan gratis). Es lo que usará el admin al publicar una versión.
 * Lanza ContentError si lo que hay en las tablas no es un contenido válido.
 */
export async function loadContentFromTables(db: D1Like, contentVersion: string): Promise<CyoaContent> {
  const results = await db.batch([
    db.prepare('SELECT key, title, description FROM categories ORDER BY position'),
    db.prepare(
      'SELECT id, category_key, name, description, cost, image, negative, repeatable, max_count, picks, ' +
        'input_label, input_required, effects_json FROM options ORDER BY category_key, position',
    ),
    db.prepare('SELECT option_id, required_option_id FROM option_requirements ORDER BY option_id, position'),
    db.prepare('SELECT option_id, conflicting_option_id FROM option_conflicts ORDER BY option_id, position'),
    db.prepare('SELECT option_id, target FROM option_disables ORDER BY option_id, position'),
    db.prepare('SELECT id, tier_option_id, name, description, cost FROM clan_statuses ORDER BY tier_option_id, position'),
    db.prepare('SELECT id, name, points, description FROM difficulty_modes ORDER BY position'),
    db.prepare('SELECT id FROM paths ORDER BY position'),
    db.prepare('SELECT id, name, description FROM grab_bag_items ORDER BY position'),
    db.prepare('SELECT level, cost, max_count FROM attainment_levels'),
    db.prepare('SELECT category_key, per_additional_pick FROM category_surcharges ORDER BY category_key'),
  ]);

  const categories = parseRows(results, 0, categoryRow, 'categories');
  const options = parseRows(results, 1, optionRow, 'options');
  const requirements = groupBy(parseRows(results, 2, requirementRow, 'option_requirements'), (row) => row.option_id);
  const conflicts = groupBy(parseRows(results, 3, conflictRow, 'option_conflicts'), (row) => row.option_id);
  const disables = groupBy(parseRows(results, 4, disableRow, 'option_disables'), (row) => row.option_id);
  const statuses = groupBy(parseRows(results, 5, statusRow, 'clan_statuses'), (row) => row.tier_option_id);
  const modes = parseRows(results, 6, modeRow, 'difficulty_modes');
  const paths = parseRows(results, 7, pathRow, 'paths');
  const items = parseRows(results, 8, itemRow, 'grab_bag_items');
  const levels = parseRows(results, 9, levelRow, 'attainment_levels');
  const surcharges = parseRows(results, 10, surchargeRow, 'category_surcharges');

  const optionsByCategory = groupBy(options, (row) => row.category_key);

  const categoryEntries = categories.map((category) => {
    const rows = optionsByCategory.get(category.key) ?? [];
    const assembled = rows.map((row): CyoaOption => {
      const option: { -readonly [K in keyof CyoaOption]: CyoaOption[K] } = {
        id: row.id,
        name: row.name,
        description: row.description,
        cost: row.cost,
      };
      if (row.image !== null) option.image = row.image;
      if (row.negative === 1) option.negative = true;
      if (row.repeatable === 1) option.repeatable = true;
      if (row.max_count !== null) option.maxCount = row.max_count;
      if (row.picks !== null) option.picks = row.picks;
      if (row.input_label !== null) {
        option.input = { label: row.input_label, required: row.input_required === 1 };
      }
      if (row.effects_json !== null) {
        option.effects = effectsSchema.parse(JSON.parse(row.effects_json) as unknown);
      }

      const required = requirements.get(row.id);
      if (required !== undefined) option.requires = required.map((rule) => rule.required_option_id);
      const conflicting = conflicts.get(row.id);
      if (conflicting !== undefined) option.conflicts = conflicting.map((rule) => rule.conflicting_option_id);
      const disabled = disables.get(row.id);
      if (disabled !== undefined) {
        // Los valores válidos los comprueba loadContent contra DISABLE_TARGETS.
        option.disables = disabled.map((rule) => rule.target) as NonNullable<CyoaOption['disables']>;
      }
      const tierStatuses = statuses.get(row.id);
      if (tierStatuses !== undefined) {
        option.statuses = tierStatuses.map((status) =>
          status.description === null
            ? { id: status.id, name: status.name, cost: status.cost }
            : { id: status.id, name: status.name, cost: status.cost, description: status.description },
        );
      }
      return option;
    });

    const entry: { title: string; description?: string; options: CyoaOption[] } = {
      title: category.title,
      options: assembled,
    };
    if (category.description !== null) entry.description = category.description;
    return [category.key, entry] as const;
  });

  const levelCost = (level: string): number | undefined => levels.find((row) => row.level === level)?.cost;
  const levelLimit = (level: string): number | undefined => {
    const limit = levels.find((row) => row.level === level)?.max_count;
    return limit === null ? undefined : limit;
  };

  const limits: { master?: number; grandmaster?: number; greatgrandmaster?: number } = {};
  for (const level of ['master', 'grandmaster', 'greatgrandmaster'] as const) {
    const limit = levelLimit(level);
    if (limit !== undefined) limits[level] = limit;
  }

  const raw = {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    contentVersion,
    modes: modes.map((mode) => ({
      id: mode.id,
      name: mode.name,
      points: mode.points,
      description: mode.description,
    })),
    paths: paths.map((path) => path.id),
    rules: {
      attainmentCosts: {
        master: levelCost('master'),
        grandmaster: levelCost('grandmaster'),
        greatgrandmaster: levelCost('greatgrandmaster'),
      },
      attainmentLimits: limits,
      categorySurcharges: surcharges.map((row) => ({
        category: row.category_key,
        perAdditionalPick: row.per_additional_pick,
      })),
    },
    // Se arma en el orden canónico; si falta alguna categoría, loadContent lo reporta.
    categories: Object.fromEntries(
      CATEGORY_ORDER.flatMap((key) => {
        const found = categoryEntries.find(([entryKey]) => entryKey === key);
        return found === undefined ? [] : [found];
      }),
    ),
    grabBagItems: items.map((item) => ({ id: item.id, name: item.name, description: item.description })),
  };

  return loadContent(raw);
}

/* ========================================================================
   Contenido desde snapshots publicados (lo que sirve la API)
   ======================================================================== */

async function loadSnapshot(statement: ReturnType<D1Like['prepare']>, description: string): Promise<CyoaContent> {
  const row = await statement.first();
  if (row === null) throw new Error(`No existe ${description}.`);
  const parsed = snapshotRow.safeParse(row);
  if (!parsed.success) throw new Error(`Snapshot inválido para ${description}.`);
  return loadContent(JSON.parse(parsed.data.snapshot) as unknown);
}

/** Contenido de la versión vigente: una sola lectura de una sola fila. */
export function loadCurrentContent(db: D1Like): Promise<CyoaContent> {
  return loadSnapshot(
    db.prepare('SELECT snapshot FROM content_versions WHERE is_current = 1'),
    'una versión de contenido vigente',
  );
}

/** Contenido de una versión concreta (para abrir builds creados con contenido anterior). */
export function loadContentVersion(db: D1Like, version: string): Promise<CyoaContent> {
  return loadSnapshot(
    db.prepare('SELECT snapshot FROM content_versions WHERE version = ?').bind(version),
    `la versión de contenido "${version}"`,
  );
}

/* ========================================================================
   Lectura del snapshot como texto (la API lo sirve sin volver a parsearlo)
   ======================================================================== */

const versionedSnapshotRow = z.object({ version: z.string(), snapshot: z.string() });

export interface SnapshotText {
  readonly version: string;
  readonly snapshot: string;
}

async function readSnapshotText(statement: ReturnType<D1Like['prepare']>): Promise<SnapshotText | null> {
  const row = await statement.first();
  if (row === null) return null;
  const parsed = versionedSnapshotRow.safeParse(row);
  if (!parsed.success) throw new Error('Fila de content_versions inválida.');
  return parsed.data;
}

/** Versión vigente como texto JSON, o null si todavía no se publicó ninguna. */
export function readCurrentSnapshot(db: D1Like): Promise<SnapshotText | null> {
  return readSnapshotText(db.prepare('SELECT version, snapshot FROM content_versions WHERE is_current = 1'));
}

/** Una versión concreta como texto JSON, o null si no existe. */
export function readSnapshot(db: D1Like, version: string): Promise<SnapshotText | null> {
  return readSnapshotText(
    db.prepare('SELECT version, snapshot FROM content_versions WHERE version = ?').bind(version),
  );
}
