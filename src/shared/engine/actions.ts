import {
  MAX_INPUT_LENGTH,
  MULTIPLE_CATEGORY_KEYS,
  SINGLE_CATEGORY_KEYS,
  type AttainmentLevel,
  type BuildSelections,
  type CyoaContent,
  type MultipleCategoryKey,
  type OptionPick,
  type SingleCategoryKey,
} from '../schema';
import { LEVEL_RANK, evaluateBuild } from './evaluate';
import { getContentIndex } from './indexing';
import { normalizeSelections, removeOption, type RemovedItem } from './normalize';
import { createEmptySelections } from './selections';
import type { BlockReason, BuildEvaluation } from './types';

/* ========================================================================
   Acciones
   ======================================================================== */

export type BuildAction =
  | { readonly type: 'setMode'; readonly modeId: string }
  /** optionId = null deja la categoría sin elegir. */
  | { readonly type: 'selectSingle'; readonly category: SingleCategoryKey; readonly optionId: string | null }
  | { readonly type: 'toggleMultiple'; readonly category: MultipleCategoryKey; readonly optionId: string }
  /** Solo para opciones repetibles. count = 0 la quita. */
  | {
      readonly type: 'setCount';
      readonly category: MultipleCategoryKey;
      readonly optionId: string;
      readonly count: number;
    }
  | { readonly type: 'setClanStatus'; readonly statusId: string | null }
  /** level = null quita el attainment del camino. */
  | { readonly type: 'setAttainment'; readonly pathId: string; readonly level: AttainmentLevel | null }
  | { readonly type: 'toggleGrabBagItem'; readonly itemId: string }
  | { readonly type: 'setInput'; readonly optionId: string; readonly text: string }
  | { readonly type: 'reset' };

export type ActionErrorCode =
  | 'unknown_mode'
  | 'unknown_option'
  | 'unknown_status'
  | 'unknown_path'
  | 'unknown_grab_bag_item'
  | 'option_blocked'
  | 'option_granted'
  | 'not_repeatable'
  | 'invalid_count'
  | 'max_count_exceeded'
  | 'category_disabled'
  | 'clan_status_requires_tier'
  | 'attainment_below_baseline'
  | 'attainment_limit_exceeded'
  | 'grab_bag_without_bundle'
  | 'grab_bag_over_limit'
  | 'option_not_selected'
  | 'input_not_supported'
  | 'input_too_long';

export interface ActionError {
  readonly code: ActionErrorCode;
  /** Presente cuando code = 'option_blocked': por qué no se puede elegir. */
  readonly reasons?: readonly BlockReason[];
}

export type ActionResult =
  | {
      readonly ok: true;
      readonly selections: BuildSelections;
      /** Elementos que se quitaron en cascada (no incluye lo que el usuario quitó a propósito). */
      readonly removed: readonly RemovedItem[];
    }
  | { readonly ok: false; readonly error: ActionError };

/* ========================================================================
   Reducer
   ======================================================================== */

export function applyAction(
  content: CyoaContent,
  selections: BuildSelections,
  action: BuildAction,
): ActionResult {
  const index = getContentIndex(content);

  switch (action.type) {
    case 'setMode': {
      if (!index.modes.has(action.modeId)) return fail('unknown_mode');
      return finish(content, { ...selections, modeId: action.modeId });
    }

    case 'selectSingle': {
      const { category, optionId } = action;

      if (optionId === null) {
        return finish(content, withSingle(selections, category, null));
      }

      const indexed = index.options.get(optionId);
      if (indexed === undefined || indexed.categoryKey !== category) return fail('unknown_option');
      if (selections.single[category] === optionId) return succeed(selections);

      // Se evalúa sin la elección actual de la categoría, porque va a ser reemplazada.
      const base = withSingle(selections, category, null);
      const blocked = checkSelectable(evaluateBuild(content, base), optionId);
      if (blocked !== null) return { ok: false, error: blocked };

      return finish(content, withSingle(base, category, optionId));
    }

    case 'toggleMultiple': {
      const { category, optionId } = action;
      const indexed = index.options.get(optionId);
      if (indexed === undefined || indexed.categoryKey !== category) return fail('unknown_option');

      const picks = selections.multiple[category];
      if (picks.some((pick) => pick.optionId === optionId)) {
        return finish(content, removeOption(selections, optionId));
      }

      const blocked = checkSelectable(evaluateBuild(content, selections), optionId);
      if (blocked !== null) return { ok: false, error: blocked };
      return finish(content, withPicks(selections, category, [...picks, { optionId, count: 1 }]));
    }

    case 'setCount': {
      const { category, optionId, count } = action;
      const indexed = index.options.get(optionId);
      if (indexed === undefined || indexed.categoryKey !== category) return fail('unknown_option');

      const { option } = indexed;
      if (option.repeatable !== true) return fail('not_repeatable');
      if (!Number.isInteger(count) || count < 0) return fail('invalid_count');
      if (option.maxCount !== undefined && count > option.maxCount) return fail('max_count_exceeded');

      const picks = selections.multiple[category];
      const exists = picks.some((pick) => pick.optionId === optionId);

      if (count === 0) {
        return exists ? finish(content, removeOption(selections, optionId)) : succeed(selections);
      }
      if (exists) {
        return finish(
          content,
          withPicks(
            selections,
            category,
            picks.map((pick) => (pick.optionId === optionId ? { ...pick, count } : pick)),
          ),
        );
      }

      const blocked = checkSelectable(evaluateBuild(content, selections), optionId);
      if (blocked !== null) return { ok: false, error: blocked };
      return finish(content, withPicks(selections, category, [...picks, { optionId, count }]));
    }

    case 'setClanStatus': {
      if (action.statusId === null) return finish(content, { ...selections, clanStatusId: null });

      const entry = index.statuses.get(action.statusId);
      if (entry === undefined) return fail('unknown_status');
      if (selections.single.clanTier !== entry.tierId) return fail('clan_status_requires_tier');
      if (evaluateBuild(content, selections).disabledTargets.includes('clanStatus')) {
        return fail('category_disabled');
      }
      return finish(content, { ...selections, clanStatusId: action.statusId });
    }

    case 'setAttainment': {
      const { pathId, level } = action;
      if (!index.pathOrder.has(pathId)) return fail('unknown_path');

      if (level === null) {
        const { [pathId]: _removed, ...rest } = selections.attainments;
        void _removed;
        return finish(content, { ...selections, attainments: rest });
      }

      const info = evaluateBuild(content, selections).attainment;
      if (info.baseline !== null && LEVEL_RANK[level] <= LEVEL_RANK[info.baseline]) {
        return fail('attainment_below_baseline');
      }
      const levelInfo = info.levels[level];
      const alreadyAtLevel = selections.attainments[pathId] === level ? 1 : 0;
      if (levelInfo.max !== null && levelInfo.used - alreadyAtLevel >= levelInfo.max) {
        return fail('attainment_limit_exceeded');
      }
      return finish(content, {
        ...selections,
        attainments: { ...selections.attainments, [pathId]: level },
      });
    }

    case 'toggleGrabBagItem': {
      const { itemId } = action;
      if (!index.grabBagItems.has(itemId)) return fail('unknown_grab_bag_item');

      if (selections.grabBagItemIds.includes(itemId)) {
        return finish(content, {
          ...selections,
          grabBagItemIds: selections.grabBagItemIds.filter((id) => id !== itemId),
        });
      }

      const bundleId = selections.single.grabBagBundles;
      const allowed = bundleId === null ? null : (index.options.get(bundleId)?.option.picks ?? null);
      if (allowed === null) return fail('grab_bag_without_bundle');
      if (selections.grabBagItemIds.length >= allowed) return fail('grab_bag_over_limit');
      return finish(content, {
        ...selections,
        grabBagItemIds: [...selections.grabBagItemIds, itemId],
      });
    }

    case 'setInput': {
      const { optionId, text } = action;
      const indexed = index.options.get(optionId);
      if (indexed === undefined) return fail('unknown_option');
      if (indexed.option.input === undefined) return fail('input_not_supported');
      if (!isPicked(selections, optionId)) return fail('option_not_selected');
      if (text.length > MAX_INPUT_LENGTH) return fail('input_too_long');

      if (text === '') {
        const { [optionId]: _removed, ...rest } = selections.inputs;
        void _removed;
        return succeed({ ...selections, inputs: rest });
      }
      return succeed({ ...selections, inputs: { ...selections.inputs, [optionId]: text } });
    }

    case 'reset':
      return succeed(createEmptySelections());
  }
}

/* ========================================================================
   Utilidades internas
   ======================================================================== */

function fail(code: ActionErrorCode): ActionResult {
  return { ok: false, error: { code } };
}

function succeed(selections: BuildSelections): ActionResult {
  return { ok: true, selections, removed: [] };
}

/** Aplica la poda en cascada y devuelve lo que se quitó. */
function finish(content: CyoaContent, next: BuildSelections): ActionResult {
  const { selections, removed } = normalizeSelections(content, next);
  return { ok: true, selections, removed };
}

function checkSelectable(evaluation: BuildEvaluation, optionId: string): ActionError | null {
  const state = evaluation.optionStates[optionId];
  if (state === undefined) return { code: 'unknown_option' };
  if (state.granted && !state.selected) return { code: 'option_granted' };
  if (state.blockedBy.length > 0) return { code: 'option_blocked', reasons: state.blockedBy };
  return null;
}

/** Cambia una categoría de selección única; si es Clan Tier, limpia el estatus. */
function withSingle(
  selections: BuildSelections,
  category: SingleCategoryKey,
  optionId: string | null,
): BuildSelections {
  const next: BuildSelections = {
    ...selections,
    single: { ...selections.single, [category]: optionId },
  };
  return category === 'clanTier' ? { ...next, clanStatusId: null } : next;
}

function withPicks(
  selections: BuildSelections,
  category: MultipleCategoryKey,
  picks: readonly OptionPick[],
): BuildSelections {
  return { ...selections, multiple: { ...selections.multiple, [category]: [...picks] } };
}

function isPicked(selections: BuildSelections, optionId: string): boolean {
  for (const key of SINGLE_CATEGORY_KEYS) {
    if (selections.single[key] === optionId) return true;
  }
  for (const key of MULTIPLE_CATEGORY_KEYS) {
    if (selections.multiple[key].some((pick) => pick.optionId === optionId)) return true;
  }
  return false;
}
