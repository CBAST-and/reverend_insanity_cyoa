import type { CategoryKey } from '../shared';

export interface TabGroup {
  readonly id: string;
  readonly label: string;
  readonly categories: readonly CategoryKey[];
  /** true: cada categoría es una sub-pestaña en lugar de una sección apilada. */
  readonly subTabs?: boolean;
}

/**
 * Pestañas de la barra lateral. Cada una agrupa varias categorías del contenido.
 * Toda categoría debe aparecer exactamente una vez (lo comprueba tests/layout.test.ts).
 */
export const TAB_GROUPS = [
  { id: 'origins', label: 'Origins', categories: ['timeline', 'prep'] },
  { id: 'character', label: 'Character', categories: ['race', 'sex', 'appearance', 'aptitude', 'specialTraits'] },
  { id: 'birth', label: 'Birth', categories: ['clanTier', 'specialBirth'] },
  { id: 'fortune', label: 'Fortune and Soul', categories: ['luck', 'soul'] },
  { id: 'inheritances', label: 'Inheritances', categories: ['venerable', 'grabBagBundles', 'premiumGu'] },
  { id: 'perks', label: 'Perks', categories: ['tier1', 'tier2', 'tier3', 'tier4', 'tier5'], subTabs: true },
  { id: 'challenges', label: 'Challenges', categories: ['missions', 'drawbacks'] },
] as const satisfies readonly TabGroup[];

export type GroupId = (typeof TAB_GROUPS)[number]['id'];
