/**
 * Subconjunto de la API de D1 que usa la aplicación. D1Database de Cloudflare
 * la cumple estructuralmente, y en las pruebas se implementa sobre node:sqlite,
 * así el mismo código corre contra SQLite real sin depender del runtime de Workers.
 */

export type SqlValue = string | number | null;

export interface D1ResultLike<T> {
  readonly results: T[];
}

export interface D1StatementLike {
  bind(...values: SqlValue[]): D1StatementLike;
  all<T = unknown>(): Promise<D1ResultLike<T>>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1Like {
  prepare(sql: string): D1StatementLike;
  batch<T = unknown>(statements: D1StatementLike[]): Promise<D1ResultLike<T>[]>;
}
