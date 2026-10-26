import type { AttainmentLevel } from '../shared';

/** "blood" -> "Blood Path". Los ids de camino se guardan en minúscula; solo el texto mostrado cambia. */
export function pathLabel(pathId: string): string {
  const words = pathId.split(/[^A-Za-z0-9]+/).filter((word) => word !== '');
  return `${words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Path`;
}

export const LEVEL_LABEL: Readonly<Record<AttainmentLevel, string>> = {
  master: 'Master',
  grandmaster: 'Grandmaster',
  greatgrandmaster: 'Great Grandmaster',
};

/** Costo con signo para mostrar: +150, −50 (signo menos tipográfico) o 0. */
export function formatCost(cost: number): string {
  if (cost > 0) return `+${cost}`;
  if (cost < 0) return `\u2212${-cost}`;
  return '0';
}
