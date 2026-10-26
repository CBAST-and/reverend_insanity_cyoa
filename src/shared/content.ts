import {
  CATEGORY_ORDER,
  contentSchema,
  isSingleCategory,
  type CyoaContent,
} from './schema';

/** Se lanza cuando el contenido no cumple el esquema o tiene referencias rotas. */
export class ContentError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Invalid content (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n- ${problems.join('\n- ')}`);
    this.name = 'ContentError';
    this.problems = problems;
  }
}

/**
 * Valida la estructura con Zod y luego revisa la integridad referencial:
 * ids únicos, requires/conflicts apuntando a opciones que existen, y
 * campos que solo tienen sentido en ciertas categorías.
 */
export function loadContent(raw: unknown): CyoaContent {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContentError(
      parsed.error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`),
    );
  }

  const content = parsed.data;
  const problems = findIntegrityProblems(content);
  if (problems.length > 0) {
    throw new ContentError(problems);
  }
  return content;
}

function findIntegrityProblems(content: CyoaContent): string[] {
  const problems: string[] = [];

  const optionIds = new Map<string, string>();
  const allIds = new Map<string, string>();

  const claimId = (id: string, where: string): void => {
    const previous = allIds.get(id);
    if (previous !== undefined) {
      problems.push(`The id "${id}" is repeated (${previous} and ${where}).`);
    } else {
      allIds.set(id, where);
    }
  };

  for (const key of CATEGORY_ORDER) {
    const category = content.categories[key];
    for (const option of category.options) {
      claimId(option.id, `${key}`);
      optionIds.set(option.id, key);

      for (const status of option.statuses ?? []) {
        claimId(status.id, `${key}/${option.id}`);
      }
    }
  }
  for (const item of content.grabBagItems) {
    claimId(item.id, 'grabBagItems');
  }

  for (const key of CATEGORY_ORDER) {
    const single = isSingleCategory(key);
    for (const option of content.categories[key].options) {
      const where = `${key}/${option.id}`;

      for (const ref of option.requires ?? []) {
        if (!optionIds.has(ref)) problems.push(`${where}: requires "${ref}", which does not exist.`);
        if (ref === option.id) problems.push(`${where}: requires itself.`);
      }
      for (const ref of option.conflicts ?? []) {
        if (!optionIds.has(ref)) problems.push(`${where}: conflicts con "${ref}", which does not exist.`);
        if (ref === option.id) problems.push(`${where}: conflicts with itself.`);
      }

      if (option.maxCount !== undefined && !option.repeatable) {
        problems.push(`${where}: maxCount only applies to repeatable options.`);
      }
      if (single && option.repeatable) {
        problems.push(`${where}: a single-choice category cannot have repeatable options.`);
      }
      if (option.picks !== undefined && key !== 'grabBagBundles') {
        problems.push(`${where}: picks only applies to Grab Bag Bundles.`);
      }
      if (key === 'grabBagBundles' && option.picks === undefined) {
        problems.push(`${where}: every Grab Bag bundle must define picks.`);
      }
      if (option.statuses !== undefined && key !== 'clanTier') {
        problems.push(`${where}: statuses only applies to Clan Tier.`);
      }
    }
  }

  const modeIds = new Set<string>();
  for (const mode of content.modes) {
    if (modeIds.has(mode.id)) problems.push(`Repeated difficulty mode: "${mode.id}".`);
    modeIds.add(mode.id);
  }

  const pathIds = new Set<string>();
  for (const path of content.paths) {
    if (pathIds.has(path)) problems.push(`Repeated path: "${path}".`);
    pathIds.add(path);
  }

  const surchargeCategories = new Set<string>();
  for (const rule of content.rules.categorySurcharges) {
    if (surchargeCategories.has(rule.category)) {
      problems.push(`Two surcharges are defined for the category "${rule.category}".`);
    }
    surchargeCategories.add(rule.category);
  }

  return problems;
}
