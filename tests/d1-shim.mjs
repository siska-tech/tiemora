// A D1Database look-alike over node:sqlite, so the Worker can be exercised by `node --test`
// without a running wrangler. Only the parts of the D1 API that worker/db.mjs uses are covered.
import {DatabaseSync} from 'node:sqlite';
import {readFile, readdir} from 'node:fs/promises';

class Statement {
  constructor(db, sql, params = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...params) { return new Statement(this.db, this.sql, params); }
  #prepared() { return this.db.prepare(this.sql); }
  // node:sqlite hands back null-prototype rows; D1 gives plain objects.
  async all() { return {results: this.#prepared().all(...this.params).map(row => ({...row})), success: true, meta: {}}; }
  async first(column) {
    const raw = this.#prepared().get(...this.params); const row = raw ? {...raw} : null;
    return column === undefined ? row : row?.[column] ?? null;
  }
  async run() {
    const {changes, lastInsertRowid} = this.#prepared().run(...this.params);
    return {success: true, meta: {changes: Number(changes), last_row_id: Number(lastInsertRowid)}};
  }
}
export class TestD1 {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec('PRAGMA foreign_keys = ON'); }
  prepare(sql) { return new Statement(this.db, sql); }
  async exec(sql) { this.db.exec(sql); }
  // D1 runs a batch as one transaction: either every statement applies or none does.
  async batch(statements) {
    this.db.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec('COMMIT');
      return results;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
export async function migratedDatabase() {
  const db = new TestD1();
  const folder = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(folder)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, folder), 'utf8'));
  return db;
}
