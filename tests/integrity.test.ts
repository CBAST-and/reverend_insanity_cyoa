import { describe, expect, it } from 'vitest';
import contentJson from '../content/content.json';
import {
  CATEGORY_ORDER,
  ContentError,
  MULTIPLE_CATEGORY_KEYS,
  SINGLE_CATEGORY_KEYS,
  applyAction,
  createEmptySelections,
  loadContent,
  normalizeSelections,
  parseSelections,
  type BuildAction,
  type BuildSelections,
} from '../src/shared';
import { content, evaluate, roundTrip } from './helpers';

/* ------------------------------------------------------------------ */

describe('Contenido', () => {
  it('tiene 21 categorías y 160 opciones con ids únicos', () => {
    expect(CATEGORY_ORDER).toHaveLength(21);
    const ids = CATEGORY_ORDER.flatMap((key) => content.categories[key].options.map((option) => option.id));
    expect(ids).toHaveLength(160);
    expect(new Set(ids).size).toBe(160);
  });

  it('CATEGORY_ORDER es exactamente la unión de categorías únicas y múltiples', () => {
    const union = new Set<string>([...SINGLE_CATEGORY_KEYS, ...MULTIPLE_CATEGORY_KEYS]);
    expect(new Set<string>(CATEGORY_ORDER)).toEqual(union);
    expect(union.size).toBe(CATEGORY_ORDER.length);
  });

  it('ya no quedan referencias rotas (disables a ids que no son categorías)', () => {
    const everyDisable = CATEGORY_ORDER.flatMap((key) =>
      content.categories[key].options.flatMap((option) => option.disables ?? []),
    );
    expect(everyDisable).not.toContain('birth-custom-immortal');
  });

  it('describe los efectos de Giant Sun y Small Dream como datos, no como ids fijos en el código', () => {
    const giant = content.categories.venerable.options.find((option) => option.id === 'ven-giant');
    const dream = content.categories.tier5.options.find((option) => option.id === 'tier5-dreamven');
    expect(giant?.effects).toEqual({ grantsCategories: ['luck'] });
    expect(dream?.effects).toEqual({
      removesAttainmentLimits: true,
      attainmentCostMultiplier: 0.5,
      grantsAttainmentBaseline: 'master',
    });
    expect(content.rules.categorySurcharges).toEqual([{ category: 'tier5', perAdditionalPick: 200 }]);
  });
});

/* ------------------------------------------------------------------ */

interface MutableContent {
  categories: { soul: { options: { id: string; requires?: string[] }[] }; luck: { options: { id: string }[] } };
}

function cloneContent(): MutableContent {
  return JSON.parse(JSON.stringify(contentJson)) as MutableContent;
}

describe('loadContent', () => {
  it('rechaza referencias a opciones que no existen y lo dice con claridad', () => {
    const broken = cloneContent();
    const target = broken.categories.soul.options[1];
    if (target === undefined) throw new Error('fixture inesperado');
    target.requires = ['soul-fantasma'];

    expect(() => loadContent(broken)).toThrow(ContentError);
    expect(() => loadContent(broken)).toThrow(/soul-fantasma/);
  });

  it('rechaza ids repetidos', () => {
    const broken = cloneContent();
    const first = broken.categories.luck.options[0];
    const second = broken.categories.luck.options[1];
    if (first === undefined || second === undefined) throw new Error('fixture inesperado');
    second.id = first.id;

    expect(() => loadContent(broken)).toThrow(/is repeated/);
  });

  it('rechaza campos desconocidos y estructuras incompletas', () => {
    expect(() => loadContent({})).toThrow(ContentError);
    expect(() => loadContent({ ...(contentJson as object), extra: true })).toThrow(ContentError);
  });
});

/* ------------------------------------------------------------------ */

describe('parseSelections', () => {
  it('acepta las selecciones vacías y las de un build real', () => {
    expect(parseSelections(createEmptySelections()).ok).toBe(true);
  });

  it('rechaza basura, tipos equivocados y claves de más', () => {
    expect(parseSelections({}).ok).toBe(false);
    expect(parseSelections(null).ok).toBe(false);
    expect(parseSelections({ ...createEmptySelections(), modeId: 5 }).ok).toBe(false);
    expect(parseSelections({ ...createEmptySelections(), extra: 'x' }).ok).toBe(false);
    expect(
      parseSelections({ ...createEmptySelections(), attainments: { fire: 'supreme' } }).ok,
    ).toBe(false);
  });

  it('limita el tamaño del texto libre', () => {
    const tooLong = { ...createEmptySelections(), inputs: { 'birth-custom-immortal': 'x'.repeat(2001) } };
    expect(parseSelections(tooLong).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe('normalizeSelections (sanear un build importado)', () => {
  it('descarta ids desconocidos, categorías equivocadas, duplicados y conteos inválidos', () => {
    const dirty: BuildSelections = {
      ...createEmptySelections(),
      modeId: 'normal',
      single: { ...createEmptySelections().single, race: 'tier1-wealth' },
      multiple: {
        ...createEmptySelections().multiple,
        tier1: [
          { optionId: 'tier1-combat', count: 3 },
          { optionId: 'no-existe', count: 1 },
          { optionId: 'tier1-combat', count: 1 },
        ],
      },
    };

    const { selections, removed } = normalizeSelections(content, dirty);

    expect(selections.single.race).toBeNull();
    expect(selections.multiple.tier1).toEqual([{ optionId: 'tier1-combat', count: 1 }]);
    expect(removed.map((item) => item.reason).sort()).toEqual(['invalid_count', 'unknown_option', 'unknown_option']);
    expect(evaluate(selections).valid).toBe(true);
  });

  it('ante un conflicto conserva la opción que va primero en el orden canónico', () => {
    const conflicting: BuildSelections = {
      ...createEmptySelections(),
      modeId: 'venerable',
      multiple: {
        ...createEmptySelections().multiple,
        tier2: [{ optionId: 'tier2-dualdao', count: 1 }],
        drawbacks: [{ optionId: 'draw-daomono', count: 1 }],
      },
    };
    const { selections, removed } = normalizeSelections(content, conflicting);

    expect(selections.multiple.tier2).toHaveLength(1);
    expect(selections.multiple.drawbacks).toEqual([]);
    expect(removed).toEqual([{ target: { kind: 'option', optionId: 'draw-daomono' }, reason: 'conflict' }]);
  });

  it('un build ya válido no cambia', () => {
    const valid: BuildSelections = {
      ...createEmptySelections(),
      modeId: 'normal',
      multiple: { ...createEmptySelections().multiple, tier1: [{ optionId: 'tier1-combat', count: 1 }] },
    };
    const result = normalizeSelections(content, valid);
    expect(result.removed).toEqual([]);
    expect(result.selections).toEqual(valid);
  });
});

/* ------------------------------------------------------------------ */
/* Prueba de propiedades: acciones aleatorias nunca producen un estado inválido. */

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1016004223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('lista vacía');
  return item;
}

function buildActionPool(): readonly BuildAction[] {
  const actions: BuildAction[] = [];

  for (const mode of content.modes) actions.push({ type: 'setMode', modeId: mode.id });

  for (const key of SINGLE_CATEGORY_KEYS) {
    actions.push({ type: 'selectSingle', category: key, optionId: null });
    for (const option of content.categories[key].options) {
      actions.push({ type: 'selectSingle', category: key, optionId: option.id });
      for (const status of option.statuses ?? []) {
        actions.push({ type: 'setClanStatus', statusId: status.id });
      }
    }
  }
  for (const key of MULTIPLE_CATEGORY_KEYS) {
    for (const option of content.categories[key].options) {
      actions.push({ type: 'toggleMultiple', category: key, optionId: option.id });
      if (option.repeatable === true) {
        for (const amount of [0, 1, 2, 3]) {
          actions.push({ type: 'setCount', category: key, optionId: option.id, count: amount });
        }
      }
      if (option.input !== undefined) {
        actions.push({ type: 'setInput', optionId: option.id, text: 'texto de prueba' });
      }
    }
  }
  for (const pathId of content.paths.slice(0, 8)) {
    actions.push({ type: 'setAttainment', pathId, level: null });
    actions.push({ type: 'setAttainment', pathId, level: 'master' });
    actions.push({ type: 'setAttainment', pathId, level: 'grandmaster' });
    actions.push({ type: 'setAttainment', pathId, level: 'greatgrandmaster' });
  }
  for (const item of content.grabBagItems) {
    actions.push({ type: 'toggleGrabBagItem', itemId: item.id });
  }
  actions.push({ type: 'reset' });
  return actions;
}

describe('Propiedades con acciones aleatorias', () => {
  const pool = buildActionPool();

  it.each([1, 2, 3, 4, 5, 6, 7, 8])('semilla %i: el estado siempre es válido, estable y reproducible', (seed) => {
    const random = createRandom(seed);
    let selections = createEmptySelections();
    let applied = 0;

    for (let step = 0; step < 1500; step += 1) {
      const action = pick(random, pool);
      const result = applyAction(content, selections, action);
      if (!result.ok) continue;
      applied += 1;
      selections = result.selections;

      const evaluation = evaluate(selections);
      expect(evaluation.valid, `${JSON.stringify(action)} dejó incidencias: ${JSON.stringify(evaluation.issues)}`).toBe(
        true,
      );

      // Los puntos salen solo de las selecciones: guardar y recargar no cambia nada.
      expect(evaluate(roundTrip(selections)).availablePoints).toBe(evaluation.availablePoints);

      // Las líneas explican exactamente el total.
      const sum = evaluation.lines.reduce((total, line) => total + line.total, 0);
      expect(evaluation.availablePoints).toBe(evaluation.startingPoints + sum);

      // Normalizar un estado ya válido no quita nada.
      expect(normalizeSelections(content, selections).removed).toEqual([]);
    }

    expect(applied).toBeGreaterThan(200);
  });
});
