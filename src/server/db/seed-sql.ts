import {
  ATTAINMENT_LEVELS,
  CATEGORY_ORDER,
  isSingleCategory,
  type CyoaContent,
  type CyoaOption,
} from '../../shared/schema';

/**
 * D1 limita cada sentencia a 100 KB. Se deja margen para que un snapshot que
 * crezca falle aquí, con un mensaje claro, y no al ejecutar el seed en Cloudflare.
 */
export const MAX_STATEMENT_BYTES = 90_000;

/** Literal de texto SQL. Los saltos de línea se escriben con char() para que cada sentencia quede en una sola línea. */
export function sqlText(value: string): string {
  const escaped = value
    .replace(/'/g, "''")
    .replace(/\r/g, "' || char(13) || '")
    .replace(/\n/g, "' || char(10) || '");
  return `'${escaped}'`;
}

function sqlNullableText(value: string | undefined): string {
  return value === undefined ? 'NULL' : sqlText(value);
}

function sqlNullableInt(value: number | undefined): string {
  return value === undefined ? 'NULL' : String(value);
}

function sqlBool(value: boolean | undefined): string {
  return value === true ? '1' : '0';
}

function optionInsert(categoryKey: string, position: number, option: CyoaOption): string {
  const effects = option.effects === undefined ? 'NULL' : sqlText(JSON.stringify(option.effects));
  return (
    'INSERT INTO options (id, category_key, position, name, description, cost, image, negative, repeatable, ' +
    'max_count, picks, input_label, input_required, effects_json) VALUES (' +
    [
      sqlText(option.id),
      sqlText(categoryKey),
      String(position),
      sqlText(option.name),
      sqlText(option.description),
      String(option.cost),
      sqlNullableText(option.image),
      sqlBool(option.negative),
      sqlBool(option.repeatable),
      sqlNullableInt(option.maxCount),
      sqlNullableInt(option.picks),
      sqlNullableText(option.input?.label),
      sqlBool(option.input?.required),
      effects,
    ].join(', ') +
    ')'
  );
}

/**
 * Sentencias que dejan las tablas de contenido idénticas a `content` y marcan
 * su versión como la vigente. Se puede ejecutar varias veces:
 *  - Las tablas editables se vacían y se vuelven a llenar (los builds no se tocan).
 *  - La versión publicada se inserta solo si no existía (INSERT OR IGNORE),
 *    porque las versiones son inmutables. Al cambiar el contenido hay que
 *    subir `contentVersion`.
 */
export function buildSeedStatements(content: CyoaContent): string[] {
  const statements: string[] = [];

  // Borrado en orden inverso a las dependencias.
  for (const table of [
    'category_surcharges',
    'attainment_levels',
    'option_disables',
    'option_conflicts',
    'option_requirements',
    'clan_statuses',
    'grab_bag_items',
    'paths',
    'difficulty_modes',
    'options',
    'categories',
  ]) {
    statements.push(`DELETE FROM ${table}`);
  }

  CATEGORY_ORDER.forEach((key, position) => {
    const category = content.categories[key];
    statements.push(
      'INSERT INTO categories (key, kind, position, title, description) VALUES (' +
        [
          sqlText(key),
          sqlText(isSingleCategory(key) ? 'single' : 'multiple'),
          String(position),
          sqlText(category.title),
          sqlNullableText(category.description),
        ].join(', ') +
        ')',
    );
  });

  // Primero todas las opciones, para que las reglas puedan referenciarse entre sí.
  for (const key of CATEGORY_ORDER) {
    content.categories[key].options.forEach((option, position) => {
      statements.push(optionInsert(key, position, option));
    });
  }

  for (const key of CATEGORY_ORDER) {
    for (const option of content.categories[key].options) {
      (option.requires ?? []).forEach((requiredId, position) => {
        statements.push(
          'INSERT INTO option_requirements (option_id, required_option_id, position) VALUES (' +
            `${sqlText(option.id)}, ${sqlText(requiredId)}, ${position})`,
        );
      });
      (option.conflicts ?? []).forEach((otherId, position) => {
        statements.push(
          'INSERT INTO option_conflicts (option_id, conflicting_option_id, position) VALUES (' +
            `${sqlText(option.id)}, ${sqlText(otherId)}, ${position})`,
        );
      });
      (option.disables ?? []).forEach((target, position) => {
        statements.push(
          'INSERT INTO option_disables (option_id, target, position) VALUES (' +
            `${sqlText(option.id)}, ${sqlText(target)}, ${position})`,
        );
      });
      (option.statuses ?? []).forEach((status, position) => {
        statements.push(
          'INSERT INTO clan_statuses (id, tier_option_id, position, name, description, cost) VALUES (' +
            [
              sqlText(status.id),
              sqlText(option.id),
              String(position),
              sqlText(status.name),
              sqlNullableText(status.description),
              String(status.cost),
            ].join(', ') +
            ')',
        );
      });
    }
  }

  content.modes.forEach((mode, position) => {
    statements.push(
      'INSERT INTO difficulty_modes (id, position, name, points, description) VALUES (' +
        [sqlText(mode.id), String(position), sqlText(mode.name), String(mode.points), sqlText(mode.description)].join(
          ', ',
        ) +
        ')',
    );
  });

  content.paths.forEach((pathId, position) => {
    statements.push(`INSERT INTO paths (id, position) VALUES (${sqlText(pathId)}, ${position})`);
  });

  content.grabBagItems.forEach((item, position) => {
    statements.push(
      'INSERT INTO grab_bag_items (id, position, name, description) VALUES (' +
        [sqlText(item.id), String(position), sqlText(item.name), sqlText(item.description)].join(', ') +
        ')',
    );
  });

  for (const level of ATTAINMENT_LEVELS) {
    statements.push(
      'INSERT INTO attainment_levels (level, cost, max_count) VALUES (' +
        [sqlText(level), String(content.rules.attainmentCosts[level]), sqlNullableInt(content.rules.attainmentLimits[level])].join(
          ', ',
        ) +
        ')',
    );
  }

  for (const rule of content.rules.categorySurcharges) {
    statements.push(
      'INSERT INTO category_surcharges (category_key, per_additional_pick) VALUES (' +
        `${sqlText(rule.category)}, ${rule.perAdditionalPick})`,
    );
  }

  // Versión publicada: copia inmutable del contenido completo.
  const snapshot = JSON.stringify(content);
  statements.push(
    'INSERT OR IGNORE INTO content_versions (version, schema_version, snapshot) VALUES (' +
      `${sqlText(content.contentVersion)}, ${content.schemaVersion}, ${sqlText(snapshot)})`,
  );
  statements.push('UPDATE content_versions SET is_current = 0 WHERE is_current = 1');
  statements.push(
    `UPDATE content_versions SET is_current = 1 WHERE version = ${sqlText(content.contentVersion)}`,
  );

  for (const statement of statements) {
    const bytes = new TextEncoder().encode(statement).length;
    if (bytes > MAX_STATEMENT_BYTES) {
      throw new Error(
        `Una sentencia del seed pesa ${bytes} bytes y D1 admite 100000 por sentencia: ${statement.slice(0, 80)}...`,
      );
    }
  }
  return statements;
}

/** Archivo SQL completo, listo para `wrangler d1 execute --file`. */
export function buildSeedSql(content: CyoaContent): string {
  const header =
    `-- Generado por scripts/generate-seed.ts. No editar a mano.\n` +
    `-- Contenido: versión ${content.contentVersion}\n`;
  return `${header}${buildSeedStatements(content)
    .map((statement) => `${statement};`)
    .join('\n')}\n`;
}
