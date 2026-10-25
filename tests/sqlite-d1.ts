import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import type { D1Like, D1ResultLike, D1StatementLike, SqlValue } from '../src/server/db';

/** Implementa la interfaz mínima de D1 sobre node:sqlite (SQLite real, en memoria). */
class SqliteStatement implements D1StatementLike {
  private readonly db: DatabaseSync;
  private readonly sql: string;
  private readonly values: readonly SqlValue[];

  constructor(db: DatabaseSync, sql: string, values: readonly SqlValue[] = []) {
    this.db = db;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: SqlValue[]): D1StatementLike {
    return new SqliteStatement(this.db, this.sql, values);
  }

  all<T = unknown>(): Promise<D1ResultLike<T>> {
    // node:sqlite devuelve filas como objetos; el código que consume valida con Zod.
    const rows = this.db.prepare(this.sql).all(...this.values) as unknown as T[];
    return Promise.resolve({ results: rows });
  }

  first<T = unknown>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values) as unknown as T | undefined;
    return Promise.resolve(row ?? null);
  }

  run(): Promise<unknown> {
    return Promise.resolve(this.db.prepare(this.sql).run(...this.values));
  }
}

export class SqliteD1 implements D1Like {
  readonly raw: DatabaseSync;

  constructor(raw: DatabaseSync) {
    this.raw = raw;
  }

  prepare(sql: string): D1StatementLike {
    return new SqliteStatement(this.raw, sql);
  }

  async batch<T = unknown>(statements: D1StatementLike[]): Promise<D1ResultLike<T>[]> {
    const results: D1ResultLike<T>[] = [];
    for (const statement of statements) {
      results.push(await statement.all<T>());
    }
    return results;
  }
}

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));

/** Base vacía con todas las migraciones aplicadas, igual que `wrangler d1 migrations apply`. */
export function createMigratedDatabase(): SqliteD1 {
  const raw = new DatabaseSync(':memory:');
  // D1 hace cumplir las claves foráneas; aquí también.
  raw.exec('PRAGMA foreign_keys = ON');
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const file of files) {
    raw.exec(readFileSync(`${MIGRATIONS_DIR}${file}`, 'utf8'));
  }
  return new SqliteD1(raw);
}
