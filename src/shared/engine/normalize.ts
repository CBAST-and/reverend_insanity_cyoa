import {
  MAX_INPUT_LENGTH,
  MULTIPLE_CATEGORY_KEYS,
  SINGLE_CATEGORY_KEYS,
  type BuildSelections,
  type CyoaContent,
  type MultipleCategoryKey,
  type OptionPick,
  type SingleCategoryKey,
} from '../schema';
import { evaluateBuild } from './evaluate';
import type { BuildIssue, IssueCode, IssueTarget } from './types';

export interface RemovedItem {
  readonly target: IssueTarget;
  readonly reason: IssueCode;
}

export interface NormalizeResult {
  readonly selections: BuildSelections;
  readonly removed: readonly RemovedItem[];
}

const MAX_PASSES = 100;

/**
 * Quita de las selecciones todo lo que incumple las reglas, hasta estabilizarse.
 * Sirve para dos cosas: limpiar las dependencias en cascada tras una acción
 * (quitar soul-10k quita soul-100k) y sanear un build importado.
 * Usa evaluateBuild como única fuente de verdad de las reglas.
 */
export function normalizeSelections(content: CyoaContent, input: BuildSelections): NormalizeResult {
  let current = dedupe(input);
  const removed: RemovedItem[] = [];

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const errors = evaluateBuild(content, current).issues.filter((issue) => issue.severity === 'error');
    if (errors.length === 0) break;

    let next = current;
    for (const issue of errors) {
      const fixed = applyFix(next, issue);
      if (fixed !== next) {
        removed.push({ target: issue.target, reason: issue.code });
        next = fixed;
      }
    }
    if (next === current) break; // sin progreso: evita bucles infinitos
    current = next;
  }

  return { selections: cleanInputs(current), removed };
}

/* ------------------------------------------------------------------------
   Correcciones concretas por incidencia
   ------------------------------------------------------------------------ */

function applyFix(selections: BuildSelections, issue: BuildIssue): BuildSelections {
  const { target } = issue;
  switch (target.kind) {
    case 'build':
      return selections;
    case 'mode':
      return selections.modeId === null ? selections : { ...selections, modeId: null };
    case 'clanStatus':
      return selections.clanStatusId === null ? selections : { ...selections, clanStatusId: null };
    case 'attainment': {
      if (!(target.pathId in selections.attainments)) return selections;
      const { [target.pathId]: _removed, ...rest } = selections.attainments;
      void _removed;
      return { ...selections, attainments: rest };
    }
    case 'grabBagItem': {
      if (!selections.grabBagItemIds.includes(target.itemId)) return selections;
      return {
        ...selections,
        grabBagItemIds: selections.grabBagItemIds.filter((itemId) => itemId !== target.itemId),
      };
    }
    case 'option': {
      if (issue.code === 'max_count_exceeded') {
        const max = issue.params?.['max'];
        if (typeof max === 'number') return setCount(selections, target.optionId, max);
      }
      if (issue.code === 'invalid_count') {
        const repaired = setCount(selections, target.optionId, 1);
        // Los repetibles con conteo inválido (< 1) se descartan; los demás vuelven a 1.
        return repaired !== selections ? repaired : removeOption(selections, target.optionId);
      }
      return removeOption(selections, target.optionId);
    }
  }
}

function setCount(selections: BuildSelections, optionId: string, count: number): BuildSelections {
  let changed = false;
  const multiple = { ...selections.multiple };
  for (const key of MULTIPLE_CATEGORY_KEYS) {
    const picks = selections.multiple[key];
    if (picks.some((pick) => pick.optionId === optionId && pick.count !== count)) {
      multiple[key] = picks.map((pick) => (pick.optionId === optionId ? { ...pick, count } : pick));
      changed = true;
    }
  }
  return changed ? { ...selections, multiple } : selections;
}

export function removeOption(selections: BuildSelections, optionId: string): BuildSelections {
  let changed = false;

  const single: Record<SingleCategoryKey, string | null> = { ...selections.single };
  for (const key of SINGLE_CATEGORY_KEYS) {
    if (single[key] === optionId) {
      single[key] = null;
      changed = true;
    }
  }

  const multiple: Record<MultipleCategoryKey, OptionPick[]> = { ...selections.multiple };
  for (const key of MULTIPLE_CATEGORY_KEYS) {
    const picks = selections.multiple[key];
    if (picks.some((pick) => pick.optionId === optionId)) {
      multiple[key] = picks.filter((pick) => pick.optionId !== optionId);
      changed = true;
    }
  }

  return changed ? { ...selections, single, multiple } : selections;
}

/* ------------------------------------------------------------------------
   Limpieza previa y posterior
   ------------------------------------------------------------------------ */

function dedupe(selections: BuildSelections): BuildSelections {
  const seen = new Set<string>();
  const multiple: Record<MultipleCategoryKey, OptionPick[]> = { ...selections.multiple };
  for (const key of MULTIPLE_CATEGORY_KEYS) {
    multiple[key] = selections.multiple[key].filter((pick) => {
      if (seen.has(pick.optionId)) return false;
      seen.add(pick.optionId);
      return true;
    });
  }
  const grabBagItemIds = [...new Set(selections.grabBagItemIds)];
  return { ...selections, multiple, grabBagItemIds };
}

/** Conserva el texto libre solo de las opciones que siguen elegidas. */
function cleanInputs(selections: BuildSelections): BuildSelections {
  const pickedIds = new Set<string>();
  for (const key of SINGLE_CATEGORY_KEYS) {
    const id = selections.single[key];
    if (id !== null) pickedIds.add(id);
  }
  for (const key of MULTIPLE_CATEGORY_KEYS) {
    for (const pick of selections.multiple[key]) pickedIds.add(pick.optionId);
  }

  const inputs: Record<string, string> = {};
  for (const [optionId, text] of Object.entries(selections.inputs)) {
    if (pickedIds.has(optionId) && text !== '') {
      inputs[optionId] = text.slice(0, MAX_INPUT_LENGTH);
    }
  }
  const unchanged =
    Object.keys(inputs).length === Object.keys(selections.inputs).length &&
    Object.entries(inputs).every(([key, value]) => selections.inputs[key] === value);
  return unchanged ? selections : { ...selections, inputs };
}
