import { describe, expect, it } from 'vitest';
import { content, count, evaluate, expectError, mode, run, single, toggle } from './helpers';

const aptitudeId = content.categories.aptitude.options[1]?.id ?? '';

describe('Opciones añadidas desde el CYOA 4.0', () => {
  it('Dao Physique deshabilita Aptitude y quita lo que ya estaba elegido', () => {
    const picked = run([mode('venerable'), single('aptitude', aptitudeId)]).selections;
    const result = run([toggle('tier3', 'tier3-daophysique')], picked);

    expect(result.removed).toEqual([{ target: { kind: 'option', optionId: aptitudeId }, reason: 'category_disabled' }]);
    expect(expectError(single('aptitude', aptitudeId), result.selections).code).toBe('option_blocked');
  });

  it('Supremacy exige la raza Variant Human', () => {
    const start = run([mode('venerable')]).selections;
    expect(expectError(toggle('missions', 'mission-supremacy'), start).reasons).toEqual([
      { code: 'requirement_unmet', missing: ['race-variant'] },
    ]);
    const ok = run([single('race', 'race-variant'), toggle('missions', 'mission-supremacy')], start);
    expect(evaluate(ok.selections).valid).toBe(true);
  });

  it('Pseudo Venerable y Dao Opponent solo se permiten con una timeline Late Antiquity', () => {
    for (const missionId of ['mission-pseudovenerable', 'mission-daoopponent']) {
      for (const blocked of ['timeline-first', 'timeline-second', 'timeline-alternative']) {
        const start = run([mode('venerable'), single('timeline', blocked)]).selections;
        expect(expectError(toggle('missions', missionId), start).code, `${missionId} con ${blocked}`).toBe('option_blocked');
      }
      for (const allowed of ['timeline-righteous', 'timeline-demonic']) {
        const start = run([mode('venerable'), single('timeline', allowed)]).selections;
        expect(evaluate(run([toggle('missions', missionId)], start).selections).valid).toBe(true);
      }
    }
  });

  it('con una de esas misiones elegida, no deja cambiar a una timeline normal y explica por qué', () => {
    const picked = run([
      mode('venerable'),
      single('timeline', 'timeline-righteous'),
      toggle('missions', 'mission-pseudovenerable'),
    ]).selections;
    const error = expectError(single('timeline', 'timeline-first'), picked);
    expect(error.code).toBe('option_blocked');
    expect(error.reasons).toEqual([{ code: 'conflict', with: ['mission-pseudovenerable'] }]);
  });

  it('Weakness se puede repetir, y los pares equivalentes de drawbacks son incompatibles', () => {
    const { selections } = run([mode('venerable'), count('drawbacks', 'draw-weakness', 3)]);
    expect(evaluate(selections).availablePoints).toBe(10000 + 3 * 100);

    const truthbound = run([mode('venerable'), toggle('drawbacks', 'draw-truthbound')]).selections;
    expect(expectError(toggle('drawbacks', 'draw-clearconscience'), truthbound).code).toBe('option_blocked');
    const ofWorld = run([mode('venerable'), toggle('drawbacks', 'draw-ofworld')]).selections;
    expect(expectError(toggle('drawbacks', 'draw-localdao'), ofWorld).code).toBe('option_blocked');
  });

  it('los costos de las opciones nuevas siguen la conversión documentada', () => {
    const price = (id: string): number | undefined =>
      Object.values(content.categories)
        .flatMap((category) => category.options)
        .find((option) => option.id === id)?.cost;
    expect(price('timeline-righteous')).toBe(150);
    expect(price('timeline-demonic')).toBe(250);
    expect(price('mission-supremacy')).toBe(400);
    expect(price('draw-forgetme')).toBe(200);
    expect(price('tier2-wealthfood')).toBe(-100);
    expect(price('tier4-guhouse')).toBe(-250);
  });
});
