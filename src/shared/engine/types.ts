import type { AttainmentLevel, CategoryKey, ClanStatus, DisableTarget } from '../schema';

/* ========================================================================
   Incidencias
   Cada incidencia señala exactamente un elemento (target), de modo que
   normalizeSelections sepa qué quitar sin adivinar.
   Los textos para el usuario los pone la UI a partir de code + params.
   ======================================================================== */

export type IssueSeverity = 'error' | 'warning';

export type IssueCode =
  | 'unknown_mode'
  | 'unknown_option'
  | 'duplicate_pick'
  | 'invalid_count'
  | 'max_count_exceeded'
  | 'category_disabled'
  | 'requirement_unmet'
  | 'conflict'
  | 'unknown_status'
  | 'clan_status_without_tier'
  | 'clan_status_mismatch'
  | 'unknown_path'
  | 'attainment_below_baseline'
  | 'attainment_limit_exceeded'
  | 'unknown_grab_bag_item'
  | 'duplicate_grab_bag_item'
  | 'grab_bag_without_bundle'
  | 'grab_bag_over_limit'
  | 'missing_input'
  | 'over_budget'
  | 'no_mode_selected';

export type IssueTarget =
  | { readonly kind: 'build' }
  | { readonly kind: 'mode' }
  | { readonly kind: 'option'; readonly optionId: string }
  | { readonly kind: 'clanStatus' }
  | { readonly kind: 'attainment'; readonly pathId: string }
  | { readonly kind: 'grabBagItem'; readonly itemId: string };

export interface BuildIssue {
  readonly code: IssueCode;
  readonly severity: IssueSeverity;
  readonly target: IssueTarget;
  readonly params?: Readonly<Record<string, string | number>>;
}

/* ========================================================================
   Líneas de costo (alimentan el resumen)
   ======================================================================== */

export type CostLine =
  | {
      readonly kind: 'option';
      readonly categoryKey: CategoryKey;
      readonly optionId: string;
      readonly name: string;
      readonly count: number;
      readonly unitCost: number;
      readonly total: number;
      /** Se obtiene gratis por el efecto de otra opción (por ejemplo, Giant Sun). */
      readonly granted: boolean;
    }
  | {
      readonly kind: 'clanStatus';
      readonly statusId: string;
      readonly name: string;
      readonly total: number;
    }
  | {
      readonly kind: 'surcharge';
      readonly categoryKey: CategoryKey;
      readonly extraPicks: number;
      readonly perPick: number;
      readonly total: number;
    }
  | {
      readonly kind: 'attainment';
      readonly pathId: string;
      readonly level: AttainmentLevel;
      readonly total: number;
    };

/* ========================================================================
   Estado de cada opción (para pintar tarjetas habilitadas o bloqueadas)
   ======================================================================== */

export type BlockReason =
  | { readonly code: 'category_disabled' }
  | { readonly code: 'requirement_unmet'; readonly missing: readonly string[] }
  | { readonly code: 'conflict'; readonly with: readonly string[] }
  | { readonly code: 'max_count'; readonly max: number };

export interface OptionState {
  readonly optionId: string;
  readonly categoryKey: CategoryKey;
  readonly selected: boolean;
  readonly count: number;
  /** Se obtiene gratis por efecto de otra opción. */
  readonly granted: boolean;
  readonly blockedBy: readonly BlockReason[];
  /** true si se puede elegir ahora mismo (no estaba elegida y nada la bloquea). */
  readonly selectable: boolean;
}

export interface AttainmentLevelInfo {
  readonly used: number;
  /** null = sin límite. */
  readonly max: number | null;
  /** Precio de comprar este nivel en un camino nuevo; null si el nivel ya viene incluido. */
  readonly price: number | null;
}

export interface AttainmentInfo {
  /** Nivel que todos los caminos tienen gratis (Small Dream), o null. */
  readonly baseline: AttainmentLevel | null;
  readonly limitsRemoved: boolean;
  readonly levels: Readonly<Record<AttainmentLevel, AttainmentLevelInfo>>;
}

/* ========================================================================
   Resultado de evaluar un build
   ======================================================================== */

export interface BuildEvaluation {
  readonly startingPoints: number;
  /** Suma con signo de todas las líneas: negativo = se gastó más de lo que se ganó. */
  readonly netCost: number;
  readonly availablePoints: number;
  readonly pointsGained: number;
  readonly pointsSpent: number;
  readonly lines: readonly CostLine[];
  readonly issues: readonly BuildIssue[];
  /** true si no hay incidencias de tipo error (los warnings no invalidan el build). */
  readonly valid: boolean;
  readonly optionStates: Readonly<Record<string, OptionState>>;
  readonly grantedOptionIds: readonly string[];
  readonly disabledTargets: readonly DisableTarget[];
  /** Estatus que se pueden elegir según el Clan Tier actual (vacío si no aplica). */
  readonly clanStatusOptions: readonly ClanStatus[];
  readonly attainment: AttainmentInfo;
}
