import { describe, expect, it } from 'vitest';
import contentJson from '../content/content.json';
import { applyAction, createEmptySelections, evaluateBuild, loadContent } from '../src/shared';
import {
  attain,
  content,
  count,
  evaluate,
  expectError,
  mode,
  roundTrip,
  run,
  single,
  toggle,
} from './helpers';

describe('Dificultad', () => {
  it('cambiar de dificultad no devuelve los puntos ya gastados', () => {
    const { selections } = run([mode('normal'), toggle('tier1', 'tier1-combat')]);
    expect(evaluate(selections).availablePoints).toBe(950);

    const switched = run([mode('hard')], selections).selections;
    expect(evaluate(switched).availablePoints).toBe(450);
  });
});

describe('Repetibles', () => {
  it('un repetible comprado 3 veces cuesta exactamente 3 veces, también tras recargar', () => {
    const { selections } = run([mode('venerable'), count('tier1', 'tier1-wealth', 3)]);
    expect(evaluate(selections).availablePoints).toBe(10000 - 150);
    expect(evaluate(roundTrip(selections)).availablePoints).toBe(10000 - 150);
  });

  it('respeta maxCount y rechaza repetir lo que no es repetible', () => {
    const { selections } = run([mode('venerable'), count('tier2', 'tier2-superguset', 2)]);
    expect(expectError(count('tier2', 'tier2-superguset', 3), selections).code).toBe('max_count_exceeded');
    expect(expectError(count('tier1', 'tier1-combat', 1), selections).code).toBe('not_repeatable');
  });
});

describe('Recargo del Tier 5', () => {
  it('cobra +200 plano por cada perk adicional y lo devuelve al quitar perks', () => {
    const base = run([mode('venerable'), toggle('tier5', 'tier5-maps')]).selections;
    expect(evaluate(base).availablePoints).toBe(10000 - 200);

    const two = run([toggle('tier5', 'tier5-prodigy')], base).selections;
    expect(evaluate(two).availablePoints).toBe(10000 - 200 - 200 - 200);

    const three = run([toggle('tier5', 'tier5-legendary')], two).selections;
    const evaluation = evaluate(three);
    expect(evaluation.availablePoints).toBe(10000 - 200 - 200 - 350 - 400);
    expect(evaluation.lines.find((line) => line.kind === 'surcharge')).toMatchObject({
      extraPicks: 2,
      total: -400,
    });

    const backToTwo = run([toggle('tier5', 'tier5-prodigy')], three).selections;
    expect(evaluate(backToTwo).availablePoints).toBe(10000 - 200 - 350 - 200);
  });
});

describe('Giant Sun', () => {
  it('regala todas las Luck sin costo y el resultado no cambia al recargar', () => {
    const { selections } = run([mode('venerable'), single('venerable', 'ven-giant')]);
    const evaluation = evaluate(selections);

    expect(evaluation.availablePoints).toBe(10000 - 150);
    expect(evaluation.grantedOptionIds).toHaveLength(content.categories.luck.options.length);
    const nemesis = evaluation.lines.find((line) => line.kind === 'option' && line.optionId === 'luck-nemesis');
    expect(nemesis).toMatchObject({ granted: true, total: 0 });
    expect(evaluate(roundTrip(selections)).availablePoints).toBe(evaluation.availablePoints);
  });

  it('no deja elegir una Luck que ya viene regalada', () => {
    const { selections } = run([mode('venerable'), single('venerable', 'ven-giant')]);
    expect(expectError(toggle('luck', 'luck-peach'), selections).code).toBe('option_granted');
  });

  it('una Luck ya comprada pasa a ser gratis con Giant Sun y vuelve a costar si se cambia de herencia', () => {
    const bought = run([mode('venerable'), toggle('luck', 'luck-peach')]).selections;
    expect(evaluate(bought).availablePoints).toBe(10000 - 50);

    const withGiant = run([single('venerable', 'ven-giant')], bought).selections;
    expect(evaluate(withGiant).availablePoints).toBe(10000 - 150);

    const withStar = run([single('venerable', 'ven-star')], withGiant).selections;
    expect(evaluate(withStar).availablePoints).toBe(10000 - 500 - 50);
  });
});

describe('Attainments', () => {
  it('aplica el límite de 4 Grandmaster y lo libera al quitar uno', () => {
    const four = run([
      mode('venerable'),
      attain('fire', 'grandmaster'),
      attain('water', 'grandmaster'),
      attain('earth', 'grandmaster'),
      attain('wind', 'grandmaster'),
    ]).selections;
    expect(evaluate(four).availablePoints).toBe(10000 - 400);
    expect(expectError(attain('wood', 'grandmaster'), four).code).toBe('attainment_limit_exceeded');

    const freed = run([attain('fire', null), attain('wood', 'grandmaster')], four).selections;
    expect(evaluate(freed).valid).toBe(true);
  });

  it('el contador de Great Grandmaster baja al quitar uno (bug anterior: nunca bajaba)', () => {
    const two = run([
      mode('venerable'),
      attain('fire', 'greatgrandmaster'),
      attain('water', 'greatgrandmaster'),
    ]).selections;
    expect(expectError(attain('earth', 'greatgrandmaster'), two).code).toBe('attainment_limit_exceeded');

    const afterRemoval = run([attain('fire', null), attain('earth', 'greatgrandmaster')], two).selections;
    expect(evaluate(afterRemoval).attainment.levels.greatgrandmaster.used).toBe(2);
  });

  it('el precio es acumulado por camino: subir de Master a Grandmaster no cobra de más', () => {
    const { selections } = run([mode('venerable'), attain('fire', 'master'), attain('fire', 'grandmaster')]);
    expect(evaluate(selections).availablePoints).toBe(10000 - 100);
  });

  it('subir un camino a Great Grandmaster libera un cupo de Grandmaster', () => {
    const { selections } = run([
      mode('venerable'),
      attain('fire', 'grandmaster'),
      attain('water', 'grandmaster'),
      attain('earth', 'grandmaster'),
      attain('wind', 'grandmaster'),
      attain('fire', 'greatgrandmaster'),
      attain('wood', 'grandmaster'),
    ]);
    const levels = evaluate(selections).attainment.levels;
    expect(levels.grandmaster.used).toBe(4);
    expect(levels.greatgrandmaster.used).toBe(1);
  });
});

describe('Small Dream (tier5-dreamven)', () => {
  const withDream = () => run([mode('venerable'), toggle('tier5', 'tier5-dreamven')]).selections;

  it('da Master gratis en todos los caminos y no deja comprarlo', () => {
    const selections = withDream();
    expect(evaluate(selections).availablePoints).toBe(10000 - 150);
    expect(expectError(attain('fire', 'master'), selections).code).toBe('attainment_below_baseline');
  });

  it('cobra la mitad del precio de lista de cada nivel (Grandmaster 50, Great Grandmaster 100)', () => {
    const { selections } = run([attain('fire', 'grandmaster'), attain('water', 'greatgrandmaster')], withDream());
    expect(evaluate(selections).availablePoints).toBe(10000 - 150 - 50 - 100);
  });

  it('quita los límites de Grandmaster', () => {
    const { selections } = run(
      ['blade', 'blood', 'bone', 'cloud', 'dark', 'dream'].map((path) => attain(path, 'grandmaster')),
      withDream(),
    );
    expect(evaluate(selections).valid).toBe(true);
    expect(evaluate(selections).availablePoints).toBe(10000 - 150 - 6 * 50);
  });

  it('al elegirlo, descarta los Master que ya se habían comprado', () => {
    const result = run([mode('venerable'), attain('fire', 'master'), toggle('tier5', 'tier5-dreamven')]);
    expect(result.removed).toEqual([
      { target: { kind: 'attainment', pathId: 'fire' }, reason: 'attainment_below_baseline' },
    ]);
    expect(result.selections.attainments).toEqual({});
  });

  it('al quitarlo, recorta los Grandmaster que exceden el límite normal', () => {
    const five = run(
      ['blade', 'blood', 'bone', 'cloud', 'dark'].map((path) => attain(path, 'grandmaster')),
      withDream(),
    ).selections;
    const result = run([toggle('tier5', 'tier5-dreamven')], five);
    expect(result.removed).toEqual([
      { target: { kind: 'attainment', pathId: 'dark' }, reason: 'attainment_limit_exceeded' },
    ]);
    expect(Object.keys(result.selections.attainments)).toHaveLength(4);
  });
});

describe('Alternative Timeline (disables)', () => {
  const populated = () =>
    run([
      mode('venerable'),
      single('race', 'race-human'),
      single('clanTier', 'clan-mortal'),
      { type: 'setClanStatus', statusId: 'status-mortal-heir' },
      single('appearance', 'appear-average'),
    ]).selections;

  it('al elegirla, quita en cascada raza, clan, estatus y apariencia', () => {
    const result = run([single('timeline', 'timeline-alternative')], populated());
    const targets = result.removed.map((item) => JSON.stringify(item.target));
    expect(targets).toContain(JSON.stringify({ kind: 'option', optionId: 'race-human' }));
    expect(targets).toContain(JSON.stringify({ kind: 'option', optionId: 'clan-mortal' }));
    expect(targets).toContain(JSON.stringify({ kind: 'option', optionId: 'appear-average' }));
    expect(targets).toContain(JSON.stringify({ kind: 'clanStatus' }));
    expect(result.removed.every((item) => item.reason === 'category_disabled')).toBe(true);
    expect(result.selections.clanStatusId).toBeNull();
    expect(evaluate(result.selections).availablePoints).toBe(10000 + 300);
  });

  it('bloquea las categorías deshabilitadas y las libera al cambiar de timeline', () => {
    const alternative = run([single('timeline', 'timeline-alternative')], populated()).selections;
    const error = expectError(single('race', 'race-random'), alternative);
    expect(error.code).toBe('option_blocked');
    expect(error.reasons?.[0]?.code).toBe('category_disabled');

    const restored = run([single('timeline', 'timeline-first'), single('race', 'race-random')], alternative);
    expect(evaluate(restored.selections).valid).toBe(true);
  });
});

describe('Requisitos y conflictos', () => {
  it('quitar un requisito quita en cascada lo que dependía de él', () => {
    const chain = run([
      mode('venerable'),
      toggle('soul', 'soul-10k'),
      toggle('soul', 'soul-100k'),
      toggle('soul', 'soul-1m'),
    ]).selections;
    const result = run([toggle('soul', 'soul-10k')], chain);

    expect(result.removed.map((item) => item.target)).toEqual([
      { kind: 'option', optionId: 'soul-100k' },
      { kind: 'option', optionId: 'soul-1m' },
    ]);
    expect(result.selections.multiple.soul).toEqual([]);
  });

  it('informa qué requisito falta', () => {
    const { selections } = run([mode('venerable')]);
    const error = expectError(toggle('soul', 'soul-100k'), selections);
    expect(error.code).toBe('option_blocked');
    expect(error.reasons).toEqual([{ code: 'requirement_unmet', missing: ['soul-10k'] }]);
  });

  it('los conflictos funcionan en ambos sentidos', () => {
    const first = run([mode('venerable'), toggle('tier2', 'tier2-dualdao')]).selections;
    expect(expectError(toggle('drawbacks', 'draw-daomono'), first).reasons).toEqual([
      { code: 'conflict', with: ['tier2-dualdao'] },
    ]);

    const second = run([mode('venerable'), toggle('drawbacks', 'draw-daomono')]).selections;
    expect(expectError(toggle('tier2', 'tier2-dualdao'), second).code).toBe('option_blocked');
  });

  it('Enemy - Fang Yuan solo existe en la segunda timeline', () => {
    const first = run([mode('venerable'), single('timeline', 'timeline-first')]).selections;
    expect(expectError(toggle('drawbacks', 'draw-fangyuan'), first).code).toBe('option_blocked');

    const second = run([single('timeline', 'timeline-second'), toggle('drawbacks', 'draw-fangyuan')], first);
    expect(evaluate(second.selections).valid).toBe(true);

    const switched = run([single('timeline', 'timeline-first')], second.selections);
    expect(switched.removed.map((item) => item.target)).toEqual([
      { kind: 'option', optionId: 'draw-fangyuan' },
    ]);
  });
});

describe('Estatus del clan', () => {
  it('solo acepta estatus del tier elegido y se limpia al cambiar de tier', () => {
    const mid = run([
      mode('venerable'),
      single('clanTier', 'clan-mid'),
      { type: 'setClanStatus', statusId: 'status-mid-leader' },
    ]).selections;
    expect(evaluate(mid).availablePoints).toBe(10000 + 50 - 50);
    expect(expectError({ type: 'setClanStatus', statusId: 'status-high-r2' }, mid).code).toBe(
      'clan_status_requires_tier',
    );

    const high = run([single('clanTier', 'clan-high')], mid).selections;
    expect(high.clanStatusId).toBeNull();
    expect(evaluate(high).clanStatusOptions.map((status) => status.id)).toContain('status-high-r2');
  });
});

describe('Grab Bag', () => {
  it('limita los ítems al tamaño del bundle y recorta al cambiar a uno menor', () => {
    const items = content.grabBagItems.map((item) => item.id);
    const five = run([
      mode('venerable'),
      single('grabBagBundles', 'grab-5'),
      ...items.slice(0, 5).map((itemId) => ({ type: 'toggleGrabBagItem', itemId }) as const),
    ]).selections;
    expect(expectError({ type: 'toggleGrabBagItem', itemId: items[5] ?? '' }, five).code).toBe(
      'grab_bag_over_limit',
    );

    const smaller = run([single('grabBagBundles', 'grab-3')], five);
    expect(smaller.selections.grabBagItemIds).toHaveLength(3);
    expect(smaller.removed).toHaveLength(2);
    expect(evaluate(smaller.selections).availablePoints).toBe(10000 - 50);
  });

  it('no deja elegir ítems sin bundle y los quita si se quita el bundle', () => {
    const firstItem = content.grabBagItems[0]?.id ?? '';
    const { selections } = run([mode('venerable')]);
    expect(expectError({ type: 'toggleGrabBagItem', itemId: firstItem }, selections).code).toBe(
      'grab_bag_without_bundle',
    );

    const withItem = run([
      single('grabBagBundles', 'grab-3'),
      { type: 'toggleGrabBagItem', itemId: firstItem },
    ], selections).selections;
    const cleared = run([single('grabBagBundles', null)], withItem);
    expect(cleared.selections.grabBagItemIds).toEqual([]);
  });
});

describe('Texto libre', () => {
  it('el campo de los padres inmortales es opcional: se guarda y se limpia al quitar la opción', () => {
    const picked = run([mode('venerable'), single('specialBirth', 'birth-custom-immortal')]).selections;
    expect(evaluate(picked).issues.map((issue) => issue.code)).not.toContain('missing_input');

    const written = run(
      [{ type: 'setInput', optionId: 'birth-custom-immortal', text: 'Padres de la secta' }],
      picked,
    ).selections;
    expect(written.inputs).toEqual({ 'birth-custom-immortal': 'Padres de la secta' });

    const cleared = run([single('specialBirth', null)], written).selections;
    expect(cleared.inputs).toEqual({});
  });

  it('si un campo se marca como obligatorio, avisa mientras esté vacío sin invalidar el build', () => {
    const strict = loadContent(
      JSON.parse(
        JSON.stringify(contentJson).replace('"label":"Describe your immortal parents (personalities, clan, location):","required":false', '"label":"Describe your immortal parents (personalities, clan, location):","required":true'),
      ) as unknown,
    );
    const first = applyAction(strict, createEmptySelections(), { type: 'setMode', modeId: 'venerable' });
    if (!first.ok) throw new Error('setMode falló');
    const second = applyAction(strict, first.selections, {
      type: 'selectSingle',
      category: 'specialBirth',
      optionId: 'birth-custom-immortal',
    });
    if (!second.ok) throw new Error('selectSingle falló');

    const empty = evaluateBuild(strict, second.selections);
    expect(empty.issues.map((issue) => issue.code)).toContain('missing_input');
    expect(empty.valid).toBe(true);

    const third = applyAction(strict, second.selections, {
      type: 'setInput',
      optionId: 'birth-custom-immortal',
      text: 'Padres de la secta',
    });
    if (!third.ok) throw new Error('setInput falló');
    expect(evaluateBuild(strict, third.selections).issues.map((issue) => issue.code)).not.toContain(
      'missing_input',
    );
  });

  it('rechaza texto en opciones sin campo o sin elegir', () => {
    const { selections } = run([mode('venerable')]);
    expect(expectError({ type: 'setInput', optionId: 'tier1-combat', text: 'x' }, selections).code).toBe(
      'input_not_supported',
    );
    expect(expectError({ type: 'setInput', optionId: 'birth-custom-immortal', text: 'x' }, selections).code).toBe(
      'option_not_selected',
    );
  });
});

describe('Resumen y presupuesto', () => {
  it('las líneas incluyen estatus del clan, attainments, recargos y regalos, y suman el total', () => {
    const { selections } = run([
      mode('venerable'),
      single('clanTier', 'clan-mid'),
      { type: 'setClanStatus', statusId: 'status-mid-leader' },
      toggle('tier5', 'tier5-maps'),
      toggle('tier5', 'tier5-prodigy'),
      single('venerable', 'ven-giant'),
      attain('fire', 'grandmaster'),
    ]);
    const evaluation = evaluate(selections);
    const kinds = new Set(evaluation.lines.map((line) => line.kind));
    expect(kinds).toEqual(new Set(['option', 'clanStatus', 'surcharge', 'attainment']));
    expect(evaluation.lines.some((line) => line.kind === 'option' && line.granted)).toBe(true);

    const sum = evaluation.lines.reduce((total, line) => total + line.total, 0);
    expect(evaluation.netCost).toBe(sum);
    expect(evaluation.availablePoints).toBe(evaluation.startingPoints + sum);
  });

  it('pasarse del presupuesto es una advertencia, no un error', () => {
    const { selections } = run([mode('hard'), single('venerable', 'ven-star'), toggle('tier1', 'tier1-combat')]);
    const evaluation = evaluate(selections);
    expect(evaluation.availablePoints).toBe(-50);
    expect(evaluation.valid).toBe(true);
    expect(evaluation.issues).toContainEqual({
      code: 'over_budget',
      severity: 'warning',
      target: { kind: 'build' },
      params: { deficit: 50 },
    });
  });

  it('avisa si hay selecciones sin dificultad elegida', () => {
    const { selections } = run([toggle('tier1', 'tier1-combat')]);
    expect(evaluate(selections).issues.map((issue) => issue.code)).toContain('no_mode_selected');
  });
});

describe('Acciones inválidas', () => {
  it('rechaza ids desconocidos y categorías equivocadas', () => {
    const { selections } = run([mode('venerable')]);
    expect(applyAction(content, selections, { type: 'setMode', modeId: 'imposible' })).toMatchObject({
      ok: false,
      error: { code: 'unknown_mode' },
    });
    expect(expectError(toggle('tier1', 'no-existe'), selections).code).toBe('unknown_option');
    expect(expectError(toggle('tier2', 'tier1-combat'), selections).code).toBe('unknown_option');
    expect(expectError(attain('no-es-un-camino', 'master'), selections).code).toBe('unknown_path');
  });
});
