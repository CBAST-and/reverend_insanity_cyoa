import {
  CATEGORY_ORDER,
  isSingleCategory,
  type AttainmentLevel,
  type BuildSelections,
  type CategoryKey,
  type ClanStatus,
  type CyoaContent,
  type DisableTarget,
} from '../schema';
import { getContentIndex, type ContentIndex, type IndexedOption } from './indexing';
import type {
  AttainmentInfo,
  AttainmentLevelInfo,
  BlockReason,
  BuildEvaluation,
  BuildIssue,
  CostLine,
  IssueCode,
  IssueSeverity,
  IssueTarget,
  OptionState,
} from './types';

export const LEVEL_RANK: Readonly<Record<AttainmentLevel, number>> = {
  master: 1,
  grandmaster: 2,
  greatgrandmaster: 3,
};

const WARNING_CODES: ReadonlySet<IssueCode> = new Set<IssueCode>([
  'missing_input',
  'over_budget',
  'no_mode_selected',
]);

/* ========================================================================
   Recolector de incidencias (sin duplicados)
   ======================================================================== */

class IssueCollector {
  private readonly seen = new Set<string>();
  readonly list: BuildIssue[] = [];

  add(code: IssueCode, target: IssueTarget, params?: Readonly<Record<string, string | number>>): void {
    const key = `${code}|${JSON.stringify(target)}|${JSON.stringify(params ?? {})}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    const severity: IssueSeverity = WARNING_CODES.has(code) ? 'warning' : 'error';
    this.list.push(params === undefined ? { code, severity, target } : { code, severity, target, params });
  }
}

/* ========================================================================
   Paso 1: reunir las opciones elegidas
   ======================================================================== */

interface ResolvedPick {
  readonly categoryKey: CategoryKey;
  readonly indexed: IndexedOption;
  readonly count: number;
}

function collectPicks(
  index: ContentIndex,
  selections: BuildSelections,
  issues: IssueCollector,
): ResolvedPick[] {
  const picks: ResolvedPick[] = [];
  const seen = new Set<string>();

  const consider = (categoryKey: CategoryKey, optionId: string, count: number): void => {
    const target: IssueTarget = { kind: 'option', optionId };
    const indexed = index.options.get(optionId);
    if (indexed === undefined || indexed.categoryKey !== categoryKey) {
      issues.add('unknown_option', target);
      return;
    }
    if (seen.has(optionId)) {
      issues.add('duplicate_pick', target);
      return;
    }
    seen.add(optionId);

    const { option } = indexed;
    if (!Number.isInteger(count) || count < 1) {
      issues.add('invalid_count', target);
    } else if (option.repeatable === true) {
      if (option.maxCount !== undefined && count > option.maxCount) {
        issues.add('max_count_exceeded', target, { max: option.maxCount });
      }
    } else if (count !== 1) {
      issues.add('invalid_count', target);
    }
    picks.push({ categoryKey, indexed, count });
  };

  for (const key of CATEGORY_ORDER) {
    if (isSingleCategory(key)) {
      const optionId = selections.single[key];
      if (optionId !== null) consider(key, optionId, 1);
    } else {
      for (const pick of selections.multiple[key]) {
        consider(key, pick.optionId, pick.count);
      }
    }
  }
  return picks;
}

/* ========================================================================
   Paso 2: efectos (grants, disables, attainments)
   Se resuelven hasta estabilizarse: una opción regalada puede traer efectos.
   ======================================================================== */

interface MergedEffects {
  readonly grantedCategories: ReadonlySet<CategoryKey>;
  readonly attainmentCostMultiplier: number;
  readonly removesAttainmentLimits: boolean;
  readonly attainmentBaseline: AttainmentLevel | null;
  readonly disabled: ReadonlySet<DisableTarget>;
}

function mergeEffects(index: ContentIndex, effectiveIds: ReadonlySet<string>): MergedEffects {
  const grantedCategories = new Set<CategoryKey>();
  const disabled = new Set<DisableTarget>();
  let multiplier = 1;
  let removesLimits = false;
  let baseline: AttainmentLevel | null = null;

  for (const id of effectiveIds) {
    const option = index.options.get(id)?.option;
    if (option === undefined) continue;

    for (const target of option.disables ?? []) disabled.add(target);

    const effects = option.effects;
    if (effects === undefined) continue;
    for (const category of effects.grantsCategories ?? []) grantedCategories.add(category);
    if (effects.attainmentCostMultiplier !== undefined) {
      multiplier = Math.min(multiplier, effects.attainmentCostMultiplier);
    }
    if (effects.removesAttainmentLimits === true) removesLimits = true;
    const level = effects.grantsAttainmentBaseline;
    if (level !== undefined && (baseline === null || LEVEL_RANK[level] > LEVEL_RANK[baseline])) {
      baseline = level;
    }
  }

  return {
    grantedCategories,
    attainmentCostMultiplier: multiplier,
    removesAttainmentLimits: removesLimits,
    attainmentBaseline: baseline,
    disabled,
  };
}

interface ResolvedEffects {
  readonly effective: ReadonlySet<string>;
  readonly granted: ReadonlySet<string>;
  readonly merged: MergedEffects;
}

const MAX_EFFECT_PASSES = 10;

function resolveEffects(
  content: CyoaContent,
  index: ContentIndex,
  pickedIds: ReadonlySet<string>,
): ResolvedEffects {
  const granted = new Set<string>();
  let effective: Set<string> = new Set(pickedIds);
  let merged = mergeEffects(index, effective);

  for (let pass = 0; pass < MAX_EFFECT_PASSES; pass += 1) {
    let changed = false;
    for (const category of merged.grantedCategories) {
      for (const option of content.categories[category].options) {
        if (!granted.has(option.id)) {
          granted.add(option.id);
          changed = true;
        }
      }
    }
    if (!changed) break;
    effective = new Set([...pickedIds, ...granted]);
    merged = mergeEffects(index, effective);
  }

  return { effective, granted, merged };
}

/* ========================================================================
   Conflictos (simétricos: basta con que uno de los dos lo declare)
   ======================================================================== */

function conflictingIds(
  optionId: string,
  index: ContentIndex,
  effectiveIds: ReadonlySet<string>,
): string[] {
  const own = index.options.get(optionId)?.option.conflicts ?? [];
  const found: string[] = [];
  for (const otherId of effectiveIds) {
    if (otherId === optionId) continue;
    const other = index.options.get(otherId)?.option;
    if (other === undefined) continue;
    if (own.includes(otherId) || (other.conflicts ?? []).includes(optionId)) {
      found.push(otherId);
    }
  }
  return found;
}

/* ========================================================================
   Evaluación completa
   ======================================================================== */

export function evaluateBuild(content: CyoaContent, selections: BuildSelections): BuildEvaluation {
  const index = getContentIndex(content);
  const issues = new IssueCollector();

  const picks = collectPicks(index, selections, issues);
  const pickedIds = new Set(picks.map((pick) => pick.indexed.option.id));
  const pickOrder = new Map(picks.map((pick) => [pick.indexed.option.id, pick.indexed.order]));
  const { effective, granted, merged } = resolveEffects(content, index, pickedIds);

  /* ---- Modo de dificultad ---- */
  let startingPoints = 0;
  if (selections.modeId !== null) {
    const mode = index.modes.get(selections.modeId);
    if (mode === undefined) {
      issues.add('unknown_mode', { kind: 'mode' });
    } else {
      startingPoints = mode.points;
    }
  }

  /* ---- Reglas por opción elegida ---- */
  for (const pick of picks) {
    const { option, categoryKey } = pick.indexed;
    const target: IssueTarget = { kind: 'option', optionId: option.id };

    if (merged.disabled.has(categoryKey)) {
      issues.add('category_disabled', target, { category: categoryKey });
    }

    for (const required of option.requires ?? []) {
      if (!effective.has(required)) {
        issues.add('requirement_unmet', target, { required });
      }
    }

    for (const otherId of conflictingIds(option.id, index, effective)) {
      const otherOrder = pickOrder.get(otherId);
      // Si el otro solo está regalado (no elegido), se descarta esta opción.
      // Si ambos están elegidos, se descarta el que va después en el orden canónico.
      const discardThis = otherOrder === undefined || pick.indexed.order > otherOrder;
      if (discardThis) issues.add('conflict', target, { with: otherId });
    }

    if (option.input?.required === true && (selections.inputs[option.id] ?? '').trim() === '') {
      issues.add('missing_input', target);
    }
  }

  /* ---- Estatus del clan ---- */
  let clanStatusLine: Extract<CostLine, { kind: 'clanStatus' }> | null = null;
  if (selections.clanStatusId !== null) {
    const entry = index.statuses.get(selections.clanStatusId);
    const target: IssueTarget = { kind: 'clanStatus' };
    if (entry === undefined) {
      issues.add('unknown_status', target);
    } else {
      const tierId = selections.single.clanTier;
      if (tierId === null) {
        issues.add('clan_status_without_tier', target);
      } else if (tierId !== entry.tierId) {
        issues.add('clan_status_mismatch', target);
      }
      if (merged.disabled.has('clanStatus')) {
        issues.add('category_disabled', target, { category: 'clanStatus' });
      }
      clanStatusLine = {
        kind: 'clanStatus',
        statusId: entry.status.id,
        name: entry.status.name,
        total: entry.status.cost,
      };
    }
  }

  /* ---- Attainments ---- */
  const rules = content.rules;
  const baseline = merged.attainmentBaseline;
  const attainmentEntries = Object.entries(selections.attainments)
    .filter(([pathId]) => {
      if (index.pathOrder.has(pathId)) return true;
      issues.add('unknown_path', { kind: 'attainment', pathId });
      return false;
    })
    .sort(([a], [b]) => (index.pathOrder.get(a) ?? 0) - (index.pathOrder.get(b) ?? 0));

  const levelUsage: Record<AttainmentLevel, number> = { master: 0, grandmaster: 0, greatgrandmaster: 0 };
  const attainmentLines: CostLine[] = [];

  for (const [pathId, level] of attainmentEntries) {
    const target: IssueTarget = { kind: 'attainment', pathId };
    levelUsage[level] += 1;

    if (baseline !== null && LEVEL_RANK[level] <= LEVEL_RANK[baseline]) {
      issues.add('attainment_below_baseline', target, { level });
    } else if (!merged.removesAttainmentLimits) {
      const max = rules.attainmentLimits[level];
      if (max !== undefined && levelUsage[level] > max) {
        issues.add('attainment_limit_exceeded', target, { level, max });
      }
    }

    const belowBaseline = baseline !== null && LEVEL_RANK[level] <= LEVEL_RANK[baseline];
    const price = belowBaseline
      ? 0
      : Math.floor(rules.attainmentCosts[level] * merged.attainmentCostMultiplier);
    attainmentLines.push({ kind: 'attainment', pathId, level, total: -price });
  }

  /* ---- Grab Bag ---- */
  const bundleId = selections.single.grabBagBundles;
  const bundlePicks = bundleId === null ? null : (index.options.get(bundleId)?.option.picks ?? null);
  const seenItems = new Set<string>();
  let acceptedItems = 0;
  for (const itemId of selections.grabBagItemIds) {
    const target: IssueTarget = { kind: 'grabBagItem', itemId };
    if (!index.grabBagItems.has(itemId)) {
      issues.add('unknown_grab_bag_item', target);
    } else if (seenItems.has(itemId)) {
      issues.add('duplicate_grab_bag_item', target);
    } else {
      seenItems.add(itemId);
      if (bundlePicks === null) {
        issues.add('grab_bag_without_bundle', target);
      } else {
        acceptedItems += 1;
        if (acceptedItems > bundlePicks) {
          issues.add('grab_bag_over_limit', target, { max: bundlePicks });
        }
      }
    }
  }

  /* ---- Líneas de costo ---- */
  const lines: CostLine[] = [];

  for (const pick of picks) {
    const { option, categoryKey } = pick.indexed;
    const isGranted = granted.has(option.id);
    lines.push({
      kind: 'option',
      categoryKey,
      optionId: option.id,
      name: option.name,
      count: pick.count,
      unitCost: isGranted ? 0 : option.cost,
      total: isGranted ? 0 : option.cost * pick.count,
      granted: isGranted,
    });
  }

  const grantedOrdered: string[] = [];
  for (const categoryKey of CATEGORY_ORDER) {
    for (const option of content.categories[categoryKey].options) {
      if (!granted.has(option.id)) continue;
      grantedOrdered.push(option.id);
      if (!pickedIds.has(option.id)) {
        lines.push({
          kind: 'option',
          categoryKey,
          optionId: option.id,
          name: option.name,
          count: 1,
          unitCost: 0,
          total: 0,
          granted: true,
        });
      }
    }
  }

  if (clanStatusLine !== null) lines.push(clanStatusLine);

  for (const rule of rules.categorySurcharges) {
    const owned = picks
      .filter((pick) => pick.categoryKey === rule.category && !granted.has(pick.indexed.option.id))
      .reduce((sum, pick) => sum + pick.count, 0);
    const extraPicks = Math.max(0, owned - 1);
    if (extraPicks > 0 && rule.perAdditionalPick > 0) {
      lines.push({
        kind: 'surcharge',
        categoryKey: rule.category,
        extraPicks,
        perPick: rule.perAdditionalPick,
        total: -extraPicks * rule.perAdditionalPick,
      });
    }
  }

  lines.push(...attainmentLines);

  /* ---- Totales ---- */
  let netCost = 0;
  let pointsGained = 0;
  let pointsSpent = 0;
  for (const line of lines) {
    netCost += line.total;
    if (line.total > 0) pointsGained += line.total;
    if (line.total < 0) pointsSpent += -line.total;
  }
  const availablePoints = startingPoints + netCost;

  if (selections.modeId === null && lines.length > 0) {
    issues.add('no_mode_selected', { kind: 'build' });
  }
  if (availablePoints < 0) {
    issues.add('over_budget', { kind: 'build' }, { deficit: -availablePoints });
  }

  /* ---- Estado de cada opción ---- */
  const optionStates: Record<string, OptionState> = {};
  for (const [optionId, indexed] of index.options) {
    const { option, categoryKey } = indexed;
    const pick = picks.find((candidate) => candidate.indexed.option.id === optionId);
    const selected = pick !== undefined;
    const isGranted = granted.has(optionId);
    const blockedBy: BlockReason[] = [];

    if (selected) {
      if (option.repeatable === true && option.maxCount !== undefined && (pick?.count ?? 0) >= option.maxCount) {
        blockedBy.push({ code: 'max_count', max: option.maxCount });
      }
    } else if (!isGranted) {
      if (merged.disabled.has(categoryKey)) blockedBy.push({ code: 'category_disabled' });
      const missing = (option.requires ?? []).filter((required) => !effective.has(required));
      if (missing.length > 0) blockedBy.push({ code: 'requirement_unmet', missing });
      const clashes = conflictingIds(optionId, index, effective);
      if (clashes.length > 0) blockedBy.push({ code: 'conflict', with: clashes });
    }

    optionStates[optionId] = {
      optionId,
      categoryKey,
      selected,
      count: pick?.count ?? 0,
      granted: isGranted,
      blockedBy,
      selectable: !selected && !isGranted && blockedBy.length === 0,
    };
  }

  /* ---- Información de attainments para la UI ---- */
  const levelInfo = (level: AttainmentLevel): AttainmentLevelInfo => {
    const included = baseline !== null && LEVEL_RANK[level] <= LEVEL_RANK[baseline];
    return {
      used: levelUsage[level],
      max: merged.removesAttainmentLimits ? null : (rules.attainmentLimits[level] ?? null),
      price: included
        ? null
        : Math.floor(rules.attainmentCosts[level] * merged.attainmentCostMultiplier),
    };
  };
  const attainment: AttainmentInfo = {
    baseline,
    limitsRemoved: merged.removesAttainmentLimits,
    levels: {
      master: levelInfo('master'),
      grandmaster: levelInfo('grandmaster'),
      greatgrandmaster: levelInfo('greatgrandmaster'),
    },
  };

  /* ---- Estatus de clan disponibles ---- */
  const tierId = selections.single.clanTier;
  const tierOption = tierId === null ? undefined : index.options.get(tierId)?.option;
  const clanStatusOptions: readonly ClanStatus[] =
    tierOption?.statuses !== undefined && !merged.disabled.has('clanStatus') ? tierOption.statuses : [];

  const issueList = issues.list;
  return {
    startingPoints,
    netCost,
    availablePoints,
    pointsGained,
    pointsSpent,
    lines,
    issues: issueList,
    valid: issueList.every((issue) => issue.severity !== 'error'),
    optionStates,
    grantedOptionIds: grantedOrdered,
    disabledTargets: [...merged.disabled],
    clanStatusOptions,
    attainment,
  };
}
