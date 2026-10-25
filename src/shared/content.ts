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
    super(`Contenido inválido (${problems.length} problema${problems.length === 1 ? '' : 's'}):\n- ${problems.join('\n- ')}`);
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
      problems.push(`El id "${id}" se repite (${previous} y ${where}).`);
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
        if (!optionIds.has(ref)) problems.push(`${where}: requires "${ref}", que no existe.`);
        if (ref === option.id) problems.push(`${where}: se requiere a sí misma.`);
      }
      for (const ref of option.conflicts ?? []) {
        if (!optionIds.has(ref)) problems.push(`${where}: conflicts con "${ref}", que no existe.`);
        if (ref === option.id) problems.push(`${where}: entra en conflicto consigo misma.`);
      }

      if (option.maxCount !== undefined && !option.repeatable) {
        problems.push(`${where}: maxCount solo aplica a opciones repetibles.`);
      }
      if (single && option.repeatable) {
        problems.push(`${where}: una categoría de selección única no admite opciones repetibles.`);
      }
      if (option.picks !== undefined && key !== 'grabBagBundles') {
        problems.push(`${where}: picks solo aplica a Grab Bag Bundles.`);
      }
      if (key === 'grabBagBundles' && option.picks === undefined) {
        problems.push(`${where}: todo bundle de Grab Bag debe definir picks.`);
      }
      if (option.statuses !== undefined && key !== 'clanTier') {
        problems.push(`${where}: statuses solo aplica a Clan Tier.`);
      }
    }
  }

  const modeIds = new Set<string>();
  for (const mode of content.modes) {
    if (modeIds.has(mode.id)) problems.push(`Modo de dificultad repetido: "${mode.id}".`);
    modeIds.add(mode.id);
  }

  const pathIds = new Set<string>();
  for (const path of content.paths) {
    if (pathIds.has(path)) problems.push(`Camino repetido: "${path}".`);
    pathIds.add(path);
  }

  const surchargeCategories = new Set<string>();
  for (const rule of content.rules.categorySurcharges) {
    if (surchargeCategories.has(rule.category)) {
      problems.push(`Hay dos recargos definidos para la categoría "${rule.category}".`);
    }
    surchargeCategories.add(rule.category);
  }

  return problems;
}
