/**
 * Genera seed/seed.sql a partir de content/content.json.
 * Uso: npm run db:seed:generate
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildSeedSql } from '../src/server/db';
import { loadContent } from '../src/shared';

async function main(): Promise<void> {
  const raw = JSON.parse(await readFile(path.resolve('content', 'content.json'), 'utf8')) as unknown;
  const content = loadContent(raw);
  const sql = buildSeedSql(content);

  await mkdir(path.resolve('seed'), { recursive: true });
  await writeFile(path.resolve('seed', 'seed.sql'), sql, 'utf8');
  console.log(
    `seed/seed.sql escrito (versión de contenido ${content.contentVersion}, ${sql.split('\n').length - 1} líneas).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
