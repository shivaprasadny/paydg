import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("paydg.db");

export function exec(sql: string) {
  db.execSync(sql);
}

export function run(sql: string, params: any[] = []) {
  db.runSync(sql, params);
}

export function getFirst<T = any>(sql: string, params: any[] = []): T | null {
  const rows = db.getAllSync(sql, params) as T[];
  return rows.length ? rows[0] : null;
}

export function getAll<T = any>(sql: string, params: any[] = []): T[] {
  return db.getAllSync(sql, params) as T[];
}
