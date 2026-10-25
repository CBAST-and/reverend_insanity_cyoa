import { z } from 'zod';

/* ========================================================================
   Claves de categoría
   El orden de CATEGORY_ORDER es el orden canónico del CYOA: define el orden
   de las pestañas y desempata cuál de dos opciones en conflicto se descarta.
   ======================================================================== */

export const SINGLE_CATEGORY_KEYS = [
  'timeline',
  'prep',
  'race',
  'sex',
  'appearance',
  'clanTier',
  'specialBirth',
  'aptitude',
  'venerable',
  'grabBagBundles',
] as const;

export const MULTIPLE_CATEGORY_KEYS = [
  'specialTraits',
  'luck',
  'soul',
  'tier1',
  'tier2',
  'tier3',
  'tier4',
  'tier5',
  'premiumGu',
  'missions',
  'drawbacks',
] as const;

export const CATEGORY_ORDER = [
  'timeline',
  'prep',
  'race',
  'sex',
  'appearance',
  'specialTraits',
  'clanTier',
  'specialBirth',
  'aptitude',
  'luck',
  'soul',
  'venerable',
  'grabBagBundles',
  'tier1',
  'tier2',
  'tier3',
  'tier4',
  'tier5',
  'premiumGu',
  'missions',
  'drawbacks',
] as const;

/** Lo que una opción puede deshabilitar: una categoría o el estatus del clan. */
export const DISABLE_TARGETS = [...CATEGORY_ORDER, 'clanStatus'] as const;

export const ATTAINMENT_LEVELS = ['master', 'grandmaster', 'greatgrandmaster'] as const;

export type SingleCategoryKey = (typeof SINGLE_CATEGORY_KEYS)[number];
export type MultipleCategoryKey = (typeof MULTIPLE_CATEGORY_KEYS)[number];
export type CategoryKey = (typeof CATEGORY_ORDER)[number];
export type DisableTarget = (typeof DISABLE_TARGETS)[number];
export type AttainmentLevel = (typeof ATTAINMENT_LEVELS)[number];

const SINGLE_KEY_SET: ReadonlySet<string> = new Set<string>(SINGLE_CATEGORY_KEYS);

export function isSingleCategory(key: CategoryKey): key is SingleCategoryKey {
  return SINGLE_KEY_SET.has(key);
}

/* ========================================================================
   Esquema del contenido (lo que vive en content.json / D1)
   ======================================================================== */

const idSchema = z.string().min(1).max(100);
const attainmentLevelSchema = z.enum(ATTAINMENT_LEVELS);
const categoryKeySchema = z.enum(CATEGORY_ORDER);
const disableTargetSchema = z.enum(DISABLE_TARGETS);

export const effectsSchema = z
  .object({
    /** Todas las opciones de estas categorías se obtienen gratis (Giant Sun). */
    grantsCategories: z.array(categoryKeySchema).optional(),
    /** Multiplicador del precio de los attainments (0.5 = mitad de precio). */
    attainmentCostMultiplier: z.number().min(0).max(1).optional(),
    /** Quita los límites de Grandmaster y Great Grandmaster. */
    removesAttainmentLimits: z.boolean().optional(),
    /** Todos los caminos empiezan con este nivel sin costo. */
    grantsAttainmentBaseline: attainmentLevelSchema.optional(),
  })
  .strict();

const clanStatusSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    description: z.string().optional(),
    cost: z.number().int(),
  })
  .strict();

const optionSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    description: z.string(),
    /** Costo con signo: positivo otorga puntos, negativo los gasta. */
    cost: z.number().int(),
    image: z.string().optional(),
    /** Opción con desventaja (por ejemplo, Luck negativa); solo afecta al estilo visual. */
    negative: z.boolean().optional(),
    repeatable: z.boolean().optional(),
    maxCount: z.number().int().min(1).optional(),
    requires: z.array(idSchema).optional(),
    conflicts: z.array(idSchema).optional(),
    disables: z.array(disableTargetSchema).optional(),
    effects: effectsSchema.optional(),
    input: z.object({ label: z.string().min(1), required: z.boolean() }).strict().optional(),
    /** Solo en bundles de Grab Bag: cuántos ítems se pueden elegir. */
    picks: z.number().int().min(1).optional(),
    /** Solo en Clan Tier: estatus disponibles dentro de ese tier. */
    statuses: z.array(clanStatusSchema).optional(),
  })
  .strict();

const categorySchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    options: z.array(optionSchema),
  })
  .strict();

const modeSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    points: z.number().int().min(0),
    description: z.string(),
  })
  .strict();

const grabBagItemSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    description: z.string(),
  })
  .strict();

const rulesSchema = z
  .object({
    /** Precio acumulado de cada nivel de attainment en un camino. */
    attainmentCosts: z
      .object({
        master: z.number().int().min(0),
        grandmaster: z.number().int().min(0),
        greatgrandmaster: z.number().int().min(0),
      })
      .strict(),
    /** Máximo de caminos por nivel exacto; un nivel sin límite se omite. */
    attainmentLimits: z
      .object({
        master: z.number().int().min(0).optional(),
        grandmaster: z.number().int().min(0).optional(),
        greatgrandmaster: z.number().int().min(0).optional(),
      })
      .strict(),
    /** Cada opción adicional (después de la primera) de la categoría cuesta este extra. */
    categorySurcharges: z
      .array(z.object({ category: categoryKeySchema, perAdditionalPick: z.number().int().min(0) }).strict())
      .max(21),
  })
  .strict();

export const contentSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: z.string().min(1),
    modes: z.array(modeSchema).min(1),
    paths: z.array(idSchema).min(1),
    rules: rulesSchema,
    categories: z
      .object({
        timeline: categorySchema,
        prep: categorySchema,
        race: categorySchema,
        sex: categorySchema,
        appearance: categorySchema,
        specialTraits: categorySchema,
        clanTier: categorySchema,
        specialBirth: categorySchema,
        aptitude: categorySchema,
        luck: categorySchema,
        soul: categorySchema,
        venerable: categorySchema,
        grabBagBundles: categorySchema,
        tier1: categorySchema,
        tier2: categorySchema,
        tier3: categorySchema,
        tier4: categorySchema,
        tier5: categorySchema,
        premiumGu: categorySchema,
        missions: categorySchema,
        drawbacks: categorySchema,
      })
      .strict(),
    grabBagItems: z.array(grabBagItemSchema),
  })
  .strict();

export type CyoaContent = z.infer<typeof contentSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CyoaOption = z.infer<typeof optionSchema>;
export type OptionEffects = z.infer<typeof effectsSchema>;
export type ClanStatus = z.infer<typeof clanStatusSchema>;
export type DifficultyMode = z.infer<typeof modeSchema>;
export type GrabBagItem = z.infer<typeof grabBagItemSchema>;
export type ContentRules = z.infer<typeof rulesSchema>;

/* ========================================================================
   Esquema de las selecciones (lo que guarda y valida el servidor)
   Los límites de tamaño evitan que un cliente malicioso mande payloads enormes.
   ======================================================================== */

export const MAX_INPUT_LENGTH = 2000;

const pickSchema = z
  .object({
    optionId: idSchema,
    /** 1 para opciones normales; 1..maxCount para repetibles. */
    count: z.number().int().min(1).max(100),
  })
  .strict();

const picksSchema = z.array(pickSchema).max(100);
const nullableIdSchema = idSchema.nullable();

export const selectionsSchema = z
  .object({
    modeId: nullableIdSchema,
    single: z
      .object({
        timeline: nullableIdSchema,
        prep: nullableIdSchema,
        race: nullableIdSchema,
        sex: nullableIdSchema,
        appearance: nullableIdSchema,
        clanTier: nullableIdSchema,
        specialBirth: nullableIdSchema,
        aptitude: nullableIdSchema,
        venerable: nullableIdSchema,
        grabBagBundles: nullableIdSchema,
      })
      .strict(),
    multiple: z
      .object({
        specialTraits: picksSchema,
        luck: picksSchema,
        soul: picksSchema,
        tier1: picksSchema,
        tier2: picksSchema,
        tier3: picksSchema,
        tier4: picksSchema,
        tier5: picksSchema,
        premiumGu: picksSchema,
        missions: picksSchema,
        drawbacks: picksSchema,
      })
      .strict(),
    clanStatusId: nullableIdSchema,
    /** camino -> nivel comprado. Un camino aparece una sola vez. */
    attainments: z.record(z.string().min(1).max(100), attainmentLevelSchema),
    grabBagItemIds: z.array(idSchema).max(50),
    /** optionId -> texto libre (por ejemplo, la descripción de los padres inmortales). */
    inputs: z.record(z.string().min(1).max(100), z.string().max(MAX_INPUT_LENGTH)),
  })
  .strict();

export type BuildSelections = z.infer<typeof selectionsSchema>;
export type OptionPick = z.infer<typeof pickSchema>;
