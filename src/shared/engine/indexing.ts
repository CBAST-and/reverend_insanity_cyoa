import {
  CATEGORY_ORDER,
  type CategoryKey,
  type ClanStatus,
  type CyoaContent,
  type CyoaOption,
  type DifficultyMode,
  type GrabBagItem,
} from '../schema';

export interface IndexedOption {
  readonly option: CyoaOption;
  readonly categoryKey: CategoryKey;
  /** Posición canónica global (categoría, luego posición dentro de la categoría). */
  readonly order: number;
}

export interface IndexedStatus {
  readonly status: ClanStatus;
  readonly tierId: string;
}

export interface ContentIndex {
  readonly options: ReadonlyMap<string, IndexedOption>;
  readonly statuses: ReadonlyMap<string, IndexedStatus>;
  readonly grabBagItems: ReadonlyMap<string, GrabBagItem>;
  readonly modes: ReadonlyMap<string, DifficultyMode>;
  readonly pathOrder: ReadonlyMap<string, number>;
}

const cache = new WeakMap<CyoaContent, ContentIndex>();

export function getContentIndex(content: CyoaContent): ContentIndex {
  const cached = cache.get(content);
  if (cached !== undefined) return cached;

  const options = new Map<string, IndexedOption>();
  const statuses = new Map<string, IndexedStatus>();
  let order = 0;

  for (const categoryKey of CATEGORY_ORDER) {
    for (const option of content.categories[categoryKey].options) {
      options.set(option.id, { option, categoryKey, order });
      order += 1;
      for (const status of option.statuses ?? []) {
        statuses.set(status.id, { status, tierId: option.id });
      }
    }
  }

  const index: ContentIndex = {
    options,
    statuses,
    grabBagItems: new Map(content.grabBagItems.map((item) => [item.id, item])),
    modes: new Map(content.modes.map((mode) => [mode.id, mode])),
    pathOrder: new Map(content.paths.map((path, position) => [path, position])),
  };
  cache.set(content, index);
  return index;
}
