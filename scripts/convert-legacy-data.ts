/**
 * Convierte js/data.js del proyecto anterior a content/content.json.
 *
 * Uso:  npm run convert-data -- ../reverend_insanity_cyoa/js/data.js
 *
 * Cambios respecto al formato anterior:
 *  - requiresTimeline pasa a ser un requires normal.
 *  - needsInput/inputLabel pasan a input { label, required }.
 *  - statusOptions pasa a statuses; count (Grab Bag) pasa a picks.
 *  - grantsAllLuck y removesAttainmentLimits pasan a effects, con los
 *    efectos que el texto de la opción ya prometía pero el código no aplicaba.
 *  - Se descartan referencias de disables que no son categorías.
 *  - El recargo del Tier 5 se declara en rules.categorySurcharges.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadContent } from '../src/shared/content';
import {
  CATEGORY_ORDER,
  DISABLE_TARGETS,
  type CategoryKey,
  type CyoaOption,
  type OptionEffects,
} from '../src/shared/schema';

/* ------------------------------ Formato anterior ------------------------------ */

interface LegacyStatus {
  id: string;
  name: string;
  cost: number;
  description?: string;
}

interface LegacyOption {
  id: string;
  name: string;
  cost: number;
  description: string;
  disables?: string[];
  statusOptions?: LegacyStatus[];
  needsInput?: boolean;
  inputLabel?: string;
  negative?: boolean;
  requires?: string | string[];
  grantsAllLuck?: boolean;
  count?: number;
  repeatable?: boolean;
  conflicts?: string | string[];
  maxCount?: number;
  removesAttainmentLimits?: boolean;
  requiresTimeline?: string;
  image?: string;
}

interface LegacyCategory {
  type: 'single' | 'multiple';
  title: string;
  description?: string;
  options: LegacyOption[];
}

interface LegacyMode {
  id: string;
  name: string;
  points: number;
  description: string;
}

interface LegacyGrabBagItem {
  id: string;
  name: string;
  description: string;
}

interface LegacyModule {
  CYOA_DATA: {
    modes: LegacyMode[];
    paths: string[];
    categories: Record<string, LegacyCategory | undefined>;
    grabBagItems: LegacyGrabBagItem[];
  };
  ATTAINMENT_COSTS: { master: number; grandmaster: number; greatgrandmaster: number };
  ATTAINMENT_LIMITS: { grandmaster: number; greatgrandmaster: number };
}

/* ------------------------------ Conversión ------------------------------ */

const VALID_DISABLE_TARGETS: ReadonlySet<string> = new Set<string>(DISABLE_TARGETS);
const CONTENT_VERSION = '2026-10-23.1';

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function convertOption(legacy: LegacyOption, warnings: string[]): CyoaOption {
  const requires = [...toArray(legacy.requires)];
  if (legacy.requiresTimeline !== undefined) requires.push(legacy.requiresTimeline);
  const conflicts = toArray(legacy.conflicts);

  const disables: CyoaOption['disables'] = [];
  for (const target of legacy.disables ?? []) {
    if (VALID_DISABLE_TARGETS.has(target)) {
      disables.push(target as NonNullable<CyoaOption['disables']>[number]);
    } else {
      warnings.push(`${legacy.id}: se descarta disables "${target}" (no es una categoría).`);
    }
  }

  const effects: { -readonly [K in keyof OptionEffects]: OptionEffects[K] } = {};
  if (legacy.grantsAllLuck === true) effects.grantsCategories = ['luck'];
  if (legacy.removesAttainmentLimits === true) {
    // Texto de Small Dream: sin límites, precio a la mitad y Master en todos los caminos.
    effects.removesAttainmentLimits = true;
    effects.attainmentCostMultiplier = 0.5;
    effects.grantsAttainmentBaseline = 'master';
  }

  const option: { -readonly [K in keyof CyoaOption]: CyoaOption[K] } = {
    id: legacy.id,
    name: legacy.name,
    description: legacy.description,
    cost: legacy.cost,
  };
  if (legacy.image !== undefined) option.image = legacy.image;
  if (legacy.negative === true) option.negative = true;
  if (legacy.repeatable === true) option.repeatable = true;
  if (legacy.maxCount !== undefined) option.maxCount = legacy.maxCount;
  if (requires.length > 0) option.requires = requires;
  if (conflicts.length > 0) option.conflicts = conflicts;
  if (disables.length > 0) option.disables = disables;
  if (Object.keys(effects).length > 0) option.effects = effects;
  if (legacy.needsInput === true) {
    option.input = { label: legacy.inputLabel ?? 'Detalles', required: false };
  }
  if (legacy.count !== undefined) option.picks = legacy.count;
  if (legacy.statusOptions !== undefined) {
    option.statuses = legacy.statusOptions.map((status) =>
      status.description === undefined
        ? { id: status.id, name: status.name, cost: status.cost }
        : { id: status.id, name: status.name, cost: status.cost, description: status.description },
    );
  }
  return option;
}

function convertCategory(
  key: CategoryKey,
  legacy: LegacyCategory | undefined,
  warnings: string[],
): { title: string; description?: string; options: CyoaOption[] } {
  if (legacy === undefined) {
    throw new Error(`Falta la categoría "${key}" en el archivo anterior.`);
  }
  const category: { title: string; description?: string; options: CyoaOption[] } = {
    title: legacy.title,
    options: legacy.options.map((option) => convertOption(option, warnings)),
  };
  if (legacy.description !== undefined && legacy.description !== '') {
    category.description = legacy.description;
  }
  return category;
}

async function main(): Promise<void> {
  const source = process.argv[2];
  if (source === undefined) {
    throw new Error('Indica la ruta de data.js: npm run convert-data -- <ruta/a/data.js>');
  }
  const legacy = (await import(pathToFileURL(path.resolve(source)).href)) as LegacyModule;
  const warnings: string[] = [];

  const categories = Object.fromEntries(
    CATEGORY_ORDER.map((key) => [key, convertCategory(key, legacy.CYOA_DATA.categories[key], warnings)]),
  );

  const raw = {
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    modes: legacy.CYOA_DATA.modes,
    paths: legacy.CYOA_DATA.paths,
    rules: {
      attainmentCosts: legacy.ATTAINMENT_COSTS,
      attainmentLimits: legacy.ATTAINMENT_LIMITS,
      // Texto de Tier 5: "Each additional Tier 5 perk after first costs +200 CP extra".
      categorySurcharges: [{ category: 'tier5', perAdditionalPick: 200 }],
    },
    categories,
    grabBagItems: legacy.CYOA_DATA.grabBagItems,
  };

  // Si algo no cuadra, loadContent lanza un error con la lista de problemas.
  const content = loadContent(raw);

  const outDir = path.resolve('content');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'content.json'), `${JSON.stringify(content, null, 2)}\n`, 'utf8');

  const optionCount = CATEGORY_ORDER.reduce((sum, key) => sum + content.categories[key].options.length, 0);
  console.log(`content/content.json escrito: ${CATEGORY_ORDER.length} categorías, ${optionCount} opciones.`);
  for (const warning of warnings) console.warn(`aviso: ${warning}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
