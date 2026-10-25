import { describe, expect, it } from 'vitest';
import {
  MAX_STATEMENT_BYTES,
  buildSeedSql,
  buildSeedStatements,
  loadContentFromTables,
  loadContentVersion,
  loadCurrentContent,
  sqlText,
} from '../src/server/db';
import { ContentError, loadContent, type CyoaContent } from '../src/shared';
import { content } from './helpers';
import { createMigratedDatabase, type SqliteD1 } from './sqlite-d1';

function seededDatabase(source: CyoaContent = content): SqliteD1 {
  const db = createMigratedDatabase();
  db.raw.exec(buildSeedSql(source));
  return db;
}

function expectFails(db: SqliteD1, sql: string, pattern: RegExp): void {
  expect(() => db.raw.exec(sql)).toThrow(pattern);
}

function count(db: SqliteD1, table: string): number {
  const row = db.raw.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get();
  return Number(row?.['total']);
}

const VALID_HASH = 'a'.repeat(64);
const insertBuild = (id: string, version: string = content.contentVersion, hash: string = VALID_HASH, data = '{}') =>
  `INSERT INTO builds (id, content_version, data, edit_token_hash) VALUES ('${id}', '${version}', '${data}', '${hash}')`;

/* ------------------------------------------------------------------ */

describe('Migración', () => {
  it('crea todas las tablas esperadas', () => {
    const db = createMigratedDatabase();
    const names = db.raw
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => String(row['name']));
    expect(names).toEqual([
      'attainment_levels',
      'builds',
      'categories',
      'category_surcharges',
      'clan_statuses',
      'content_versions',
      'difficulty_modes',
      'grab_bag_items',
      'option_conflicts',
      'option_disables',
      'option_requirements',
      'options',
      'paths',
    ]);
  });
});

/* ------------------------------------------------------------------ */

describe('Seed y carga del contenido', () => {
  it('las tablas reconstruyen el contenido exactamente (sin perder ni inventar nada)', async () => {
    const db = seededDatabase();
    const loaded = await loadContentFromTables(db, content.contentVersion);
    expect(loaded).toStrictEqual(content);
  });

  it('el snapshot vigente es idéntico al contenido y se puede pedir por versión', async () => {
    const db = seededDatabase();
    expect(await loadCurrentContent(db)).toStrictEqual(content);
    expect(await loadContentVersion(db, content.contentVersion)).toStrictEqual(content);
    await expect(loadContentVersion(db, 'no-existe')).rejects.toThrow(/no-existe/);
  });

  it('cuenta lo esperado en cada tabla', () => {
    const db = seededDatabase();
    expect(count(db, 'categories')).toBe(21);
    expect(count(db, 'options')).toBe(130);
    expect(count(db, 'paths')).toBe(content.paths.length);
    expect(count(db, 'difficulty_modes')).toBe(4);
    expect(count(db, 'attainment_levels')).toBe(3);
    expect(count(db, 'category_surcharges')).toBe(1);
    expect(count(db, 'content_versions')).toBe(1);
  });

  it('ninguna sentencia del seed se acerca al límite de 100 KB de D1', () => {
    const sizes = buildSeedStatements(content).map((statement) => new TextEncoder().encode(statement).length);
    expect(Math.max(...sizes)).toBeLessThan(MAX_STATEMENT_BYTES);
  });

  it('es seguro con comillas, saltos de línea, punto y coma, comentarios y unicode', async () => {
    const tricky = structuredClone(content);
    const option = tricky.categories.timeline.options[0];
    if (option === undefined) throw new Error('fixture inesperado');
    option.description = "O'Brien's \"quote\" -- ; DROP TABLE options;\nSegunda línea\r\nacentos áéíñ 蛊真人 \\n literal";
    tricky.contentVersion = 'tricky.1';

    const db = seededDatabase(loadContent(tricky));
    const loaded = await loadContentFromTables(db, 'tricky.1');
    expect(loaded.categories.timeline.options[0]?.description).toBe(option.description);
    expect(count(db, 'options')).toBe(130);
  });

  it('sqlText escribe cada sentencia en una sola línea', () => {
    const literal = sqlText("a'b\nc\r\nd");
    expect(literal).not.toContain('\n');
    expect(literal).not.toContain('\r');
    expect(literal).toBe("'a''b' || char(10) || 'c' || char(13) || '' || char(10) || 'd'");
  });

  it('se puede volver a ejecutar sin duplicar nada y sin tocar los builds', async () => {
    const db = seededDatabase();
    db.raw.exec(insertBuild('k3x9Qm7P'));

    db.raw.exec(buildSeedSql(content));

    expect(count(db, 'options')).toBe(130);
    expect(count(db, 'content_versions')).toBe(1);
    expect(count(db, 'builds')).toBe(1);
    expect(await loadContentFromTables(db, content.contentVersion)).toStrictEqual(content);
  });

  it('una versión nueva pasa a ser la vigente y la anterior sigue intacta para los builds viejos', async () => {
    const db = seededDatabase();
    db.raw.exec(insertBuild('oldBuild1'.slice(0, 8)));

    const next = structuredClone(content);
    next.contentVersion = '2026-10-24.1';
    const firstTier1 = next.categories.tier1.options[0];
    if (firstTier1 === undefined) throw new Error('fixture inesperado');
    firstTier1.cost = -123;
    db.raw.exec(buildSeedSql(loadContent(next)));

    expect(count(db, 'content_versions')).toBe(2);
    expect((await loadCurrentContent(db)).contentVersion).toBe('2026-10-24.1');
    expect((await loadCurrentContent(db)).categories.tier1.options[0]?.cost).toBe(-123);
    expect(await loadContentVersion(db, content.contentVersion)).toStrictEqual(content);
    expect(count(db, 'builds')).toBe(1);
  });

  it('falla con claridad si las tablas no forman un contenido válido', async () => {
    const missingLevel = seededDatabase();
    missingLevel.raw.exec("DELETE FROM attainment_levels WHERE level = 'master'");
    await expect(loadContentFromTables(missingLevel, 'x')).rejects.toThrow(ContentError);

    const badEffects = seededDatabase();
    badEffects.raw.exec(
      "UPDATE options SET effects_json = '{\"grantsCategories\":[\"nope\"]}' WHERE id = 'ven-giant'",
    );
    await expect(loadContentFromTables(badEffects, 'x')).rejects.toThrow();

    const unseeded = createMigratedDatabase();
    await expect(loadCurrentContent(unseeded)).rejects.toThrow(/vigente/);
  });
});

/* ------------------------------------------------------------------ */

describe('Restricciones de contenido', () => {
  const baseOption = (extra: string, values: string) =>
    `INSERT INTO options (id, category_key, position, name, description, cost${extra}) ` +
    `VALUES ('nueva', 'timeline', 99, 'Nueva', 'Desc', 0${values})`;

  it('rechaza opciones con categoría inexistente o posición repetida', () => {
    const db = seededDatabase();
    expectFails(
      db,
      "INSERT INTO options (id, category_key, position, name, description, cost) VALUES ('x', 'noexiste', 0, 'X', 'D', 0)",
      /FOREIGN KEY|CHECK/,
    );
    expectFails(
      db,
      "INSERT INTO options (id, category_key, position, name, description, cost) VALUES ('x', 'timeline', 0, 'X', 'D', 0)",
      /UNIQUE/,
    );
    expectFails(db, "INSERT INTO categories (key, kind, position, title) VALUES ('inventada', 'single', 50, 'T')", /CHECK/);
  });

  it('rechaza combinaciones incoherentes de campos', () => {
    const db = seededDatabase();
    expectFails(db, baseOption(', max_count', ', 2'), /CHECK/); // maxCount sin repeatable
    expectFails(db, baseOption(', picks', ', 3'), /CHECK/); // picks fuera de Grab Bag
    expectFails(db, baseOption(', input_required', ', 1'), /CHECK/); // obligatorio sin etiqueta
    expectFails(db, baseOption(', effects_json', ", 'no es json'"), /CHECK/);
  });

  it('rechaza reglas rotas: auto-referencias, ids inexistentes y destinos inválidos', () => {
    const db = seededDatabase();
    expectFails(db, "INSERT INTO option_requirements VALUES ('soul-100k', 'soul-100k', 5)", /CHECK/);
    expectFails(db, "INSERT INTO option_requirements VALUES ('soul-100k', 'fantasma', 5)", /FOREIGN KEY/);
    expectFails(db, "INSERT INTO option_conflicts VALUES ('fantasma', 'soul-100k', 0)", /FOREIGN KEY/);
    expectFails(db, "INSERT INTO option_disables VALUES ('timeline-alternative', 'birth-custom-immortal', 9)", /CHECK/);
  });

  it('no deja borrar una opción de la que otras dependen, y al borrarla limpia sus propias reglas', () => {
    const db = seededDatabase();
    expectFails(db, "DELETE FROM options WHERE id = 'soul-100k'", /FOREIGN KEY/);
    expectFails(db, "DELETE FROM categories WHERE key = 'soul'", /FOREIGN KEY/);

    db.raw.exec("DELETE FROM option_requirements WHERE required_option_id = 'soul-100k'");
    expect(count(db, "option_requirements WHERE option_id = 'soul-100k'")).toBe(1);
    db.raw.exec("DELETE FROM options WHERE id = 'soul-100k'");
    expect(count(db, "option_requirements WHERE option_id = 'soul-100k'")).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

describe('Restricciones de builds y versiones', () => {
  it('acepta un build válido con valores por defecto', () => {
    const db = seededDatabase();
    db.raw.exec(insertBuild('k3x9Qm7P'));
    const row = db.raw.prepare('SELECT schema_version, created_at, updated_at FROM builds').get();
    expect(row?.['schema_version']).toBe(1);
    expect(String(row?.['created_at'])).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(row?.['updated_at']).toBe(row?.['created_at']);
  });

  it('rechaza ids mal formados', () => {
    const db = seededDatabase();
    expectFails(db, insertBuild('corto'), /CHECK/);
    expectFails(db, insertBuild('largo-largo-id'), /CHECK/);
    expectFails(db, insertBuild('abc-defg'), /CHECK/);
    expectFails(db, insertBuild('abc defg'), /CHECK/);
    expectFails(db, insertBuild('abcdefg!'), /CHECK/);
  });

  it('rechaza hashes de token que no sean SHA-256 en hex minúscula', () => {
    const db = seededDatabase();
    expectFails(db, insertBuild('k3x9Qm7P', content.contentVersion, 'a'.repeat(63)), /CHECK/);
    expectFails(db, insertBuild('k3x9Qm7P', content.contentVersion, 'A'.repeat(64)), /CHECK/);
    expectFails(db, insertBuild('k3x9Qm7P', content.contentVersion, `${'a'.repeat(63)}z`), /CHECK/);
  });

  it('rechaza datos que no son JSON o que exceden el tamaño máximo', () => {
    const db = seededDatabase();
    expectFails(db, insertBuild('k3x9Qm7P', content.contentVersion, VALID_HASH, 'no es json'), /CHECK/);
    const huge = JSON.stringify({ texto: 'x'.repeat(50_001) });
    expectFails(db, insertBuild('k3x9Qm7P', content.contentVersion, VALID_HASH, huge), /CHECK/);
  });

  it('rechaza builds de una versión de contenido que no existe y ids repetidos', () => {
    const db = seededDatabase();
    expectFails(db, insertBuild('k3x9Qm7P', 'version-fantasma'), /FOREIGN KEY/);
    db.raw.exec(insertBuild('k3x9Qm7P'));
    expectFails(db, insertBuild('k3x9Qm7P'), /UNIQUE|PRIMARY KEY/);
  });

  it('impide borrar una versión de contenido que tiene builds', () => {
    const db = seededDatabase();
    db.raw.exec(insertBuild('k3x9Qm7P'));
    expectFails(db, `DELETE FROM content_versions WHERE version = '${content.contentVersion}'`, /FOREIGN KEY/);
  });

  it('solo permite una versión vigente a la vez', () => {
    const db = seededDatabase();
    db.raw.exec("INSERT INTO content_versions (version, schema_version, snapshot) VALUES ('otra', 1, '{}')");
    expectFails(db, "UPDATE content_versions SET is_current = 1 WHERE version = 'otra'", /UNIQUE/);
  });
});
