import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER } from '../src/shared';
import { LEVEL_LABEL, formatCost, pathLabel } from '../src/web/labels';
import { TAB_GROUPS } from '../src/web/layout';
import { content } from './helpers';

describe('Agrupación de pestañas', () => {
  it('cubre cada categoría exactamente una vez', () => {
    const covered: string[] = TAB_GROUPS.flatMap((group) => [...group.categories]);
    expect([...covered].sort()).toEqual([...CATEGORY_ORDER].sort());
    expect(new Set(covered).size).toBe(CATEGORY_ORDER.length);
  });

  it('reduce las 21 categorías a 7 pestañas, más Attainments y Summary', () => {
    expect(TAB_GROUPS).toHaveLength(7);
    expect(TAB_GROUPS.map((group) => group.id)).toEqual([
      'origins', 'character', 'birth', 'fortune', 'inheritances', 'perks', 'challenges',
    ]);
  });

  it('los perks son sub-pestañas, una por tier', () => {
    const perks = TAB_GROUPS.find((group) => group.id === 'perks');
    expect(perks?.subTabs).toBe(true);
    expect(perks?.categories).toEqual(['tier1', 'tier2', 'tier3', 'tier4', 'tier5']);
  });
});

describe('Etiquetas', () => {
  it('escribe los caminos con mayúscula y el sufijo Path', () => {
    expect(pathLabel('blood')).toBe('Blood Path');
    expect(pathLabel('qi')).toBe('Qi Path');
    expect(pathLabel('some-new_one')).toBe('Some New One Path');
    for (const id of content.paths) {
      expect(pathLabel(id)).toMatch(/^[A-Z][A-Za-z0-9 ]* Path$/);
    }
  });

  it('nombra los niveles de attainment en inglés y con mayúscula', () => {
    expect(LEVEL_LABEL).toEqual({ master: 'Master', grandmaster: 'Grandmaster', greatgrandmaster: 'Great Grandmaster' });
  });

  it('formatea costos con signo menos tipográfico', () => {
    expect(formatCost(150)).toBe('+150');
    expect(formatCost(-50)).toBe('\u221250');
    expect(formatCost(0)).toBe('0');
  });
});
