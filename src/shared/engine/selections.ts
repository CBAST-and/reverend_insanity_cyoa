import { selectionsSchema, type BuildSelections } from '../schema';

export function createEmptySelections(): BuildSelections {
  return {
    modeId: null,
    single: {
      timeline: null,
      prep: null,
      race: null,
      sex: null,
      appearance: null,
      clanTier: null,
      specialBirth: null,
      aptitude: null,
      venerable: null,
      grabBagBundles: null,
    },
    multiple: {
      specialTraits: [],
      luck: [],
      soul: [],
      tier1: [],
      tier2: [],
      tier3: [],
      tier4: [],
      tier5: [],
      premiumGu: [],
      missions: [],
      drawbacks: [],
    },
    clanStatusId: null,
    attainments: {},
    grabBagItemIds: [],
    inputs: {},
  };
}

export type ParseSelectionsResult =
  | { readonly ok: true; readonly selections: BuildSelections }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Valida la forma de un JSON desconocido (importación, cuerpo de una petición
 * al servidor, contenido de localStorage). No revisa las reglas del juego:
 * para eso están evaluateBuild y normalizeSelections.
 */
export function parseSelections(raw: unknown): ParseSelectionsResult {
  const parsed = selectionsSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, selections: parsed.data };
  }
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => `${issue.path.map(String).join('.') || '(raíz)'}: ${issue.message}`),
  };
}
