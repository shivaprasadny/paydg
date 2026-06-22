import * as SQLite from "expo-sqlite";

/**
 * Expense data lives in its own database so PayDG's existing shift schema
 * remains untouched. It is still part of the same app and backup flow can
 * combine both databases later.
 */
export const moneyDbPromise = SQLite.openDatabaseAsync("paydg-money.db");

const DEFAULT_CATEGORIES = [
  ["Food", "🍔", "EXPENSE"],
  ["Travel", "🚕", "EXPENSE"],
  ["Groceries", "🛒", "EXPENSE"],
  ["Shopping", "🛍️", "EXPENSE"],
  ["Bills", "💡", "EXPENSE"],
  ["Health", "💊", "EXPENSE"],
  ["Entertainment", "🎬", "EXPENSE"],
  ["Subscription", "🔁", "EXPENSE"],
  ["Other", "💰", "EXPENSE"],
  ["Salary", "💼", "INCOME"],
  ["Freelance", "💻", "INCOME"],
  ["Tips", "💵", "INCOME"],
  ["Gift", "🎁", "INCOME"],
  ["Refund", "↩️", "INCOME"],
  ["Other Income", "💰", "INCOME"],
] as const;

export async function initMoneyDatabase() {
  const db = await moneyDbPromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS money_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '💰',
      type TEXT NOT NULL CHECK(type IN ('EXPENSE', 'INCOME')),
      UNIQUE(name, type)
    );

    CREATE TABLE IF NOT EXISTS money_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount >= 0),
      category_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      note TEXT NOT NULL DEFAULT '',
      transaction_date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('EXPENSE', 'INCOME')),
      is_favorite INTEGER NOT NULL DEFAULT 0,
      recurring_group_id TEXT,
      recurring_frequency TEXT,
      recurring_status TEXT DEFAULT 'ACTIVE',
      workplace_id TEXT,
      workplace_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES money_categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_money_transactions_date
      ON money_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_money_transactions_type
      ON money_transactions(type);

    CREATE TABLE IF NOT EXISTS money_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      monthly_budget REAL NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO money_settings (id, monthly_budget) VALUES (1, 0);
  `);

  // Existing PayDG Money databases receive the workplace link safely.
  try {
    await db.execAsync(
      `ALTER TABLE money_transactions ADD COLUMN workplace_id TEXT;`
    );
  } catch {}
  try {
    await db.execAsync(
      `ALTER TABLE money_transactions ADD COLUMN workplace_name TEXT;`
    );
  } catch {}

  for (const [name, icon, type] of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO money_categories (name, icon, type)
       VALUES (?, ?, ?)`,
      [name, icon, type]
    );
  }
}
