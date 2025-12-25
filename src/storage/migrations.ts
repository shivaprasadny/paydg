import { exec, getFirst } from "./database";

const MIGRATIONS: string[] = [
  // 1) Always keep this first: creates migrations table + pragmas
  `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY NOT NULL,
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL
  );
  `,

  // 2) Profile
  `
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    user_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  `,

  // 3) Original workplaces (older schema). This might already exist in your DB.
  `
  CREATE TABLE IF NOT EXISTS workplaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    default_hourly_wage REAL,
    default_lunch_deduct INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  `,

  // 4) Shifts
  `
  CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY NOT NULL,
    workplace_id TEXT NOT NULL,
    shift_date TEXT NOT NULL,
    start_ts TEXT NOT NULL,
    end_ts TEXT NOT NULL,
    role TEXT NOT NULL,
    hourly_wage REAL NOT NULL,
    lunch_deducted INTEGER NOT NULL DEFAULT 0,

    cash_tips REAL NOT NULL DEFAULT 0,
    credit_tips REAL NOT NULL DEFAULT 0,
    notes TEXT,

    worked_minutes INTEGER NOT NULL,
    hourly_pay REAL NOT NULL,
    total_tips REAL NOT NULL,
    total_earned REAL NOT NULL,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
  CREATE INDEX IF NOT EXISTS idx_shifts_workplace ON shifts(workplace_id);
  `,

  // 5) NEW migration: rebuild workplaces without wage/break defaults
  `
  -- Rebuild workplaces to remove default_hourly_wage and default_lunch_deduct
  CREATE TABLE IF NOT EXISTS workplaces_new (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  INSERT INTO workplaces_new (id, name, created_at, updated_at)
  SELECT id, name, created_at, updated_at
  FROM workplaces;

  DROP TABLE workplaces;
  ALTER TABLE workplaces_new RENAME TO workplaces;

  CREATE INDEX IF NOT EXISTS idx_workplaces_name ON workplaces(name);
  `,
];

export function migrate() {
  // Always create migrations table first
  exec(MIGRATIONS[0]);

  const row = getFirst<{ version: number }>(
    "SELECT version FROM migrations ORDER BY version DESC LIMIT 1"
  );
  const currentVersion = row?.version ?? 0;

  // Apply remaining migrations in order
  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    if (i === 0) continue;

    exec("BEGIN;");
    try {
      exec(MIGRATIONS[i]);
      exec(
        `INSERT INTO migrations (version, applied_at) VALUES (${i + 1}, datetime('now'));`
      );
      exec("COMMIT;");
    } catch (e) {
      exec("ROLLBACK;");
      throw e;
    }
  }
}
