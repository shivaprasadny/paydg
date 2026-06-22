import { moneyDbPromise } from "./database";
import {
  MoneyCategory,
  MoneyPeriod,
  MoneySummary,
  MoneyTransaction,
  MoneyTransactionInput,
  MoneyTransactionType,
  MoneyTrendPoint,
  MoneyRecurringConfig,
} from "./types";

function dateRange(period: MoneyPeriod, anchor = new Date()) {
  if (period === "ALL") return null;

  let start: Date;
  let end: Date;
  if (period === "DAY") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    end = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1);
  } else if (period === "WEEK") {
    start = new Date(anchor);
    start.setDate(anchor.getDate() - anchor.getDay());
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 7);
  } else if (period === "MONTH") {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  } else {
    start = new Date(anchor.getFullYear(), 0, 1);
    end = new Date(anchor.getFullYear() + 1, 0, 1);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

const transactionSelect = `
  SELECT
    t.id,
    t.title,
    t.amount,
    t.category_id AS categoryId,
    c.name AS categoryName,
    c.icon AS categoryIcon,
    t.payment_method AS paymentMethod,
    t.note,
    t.transaction_date AS transactionDate,
    t.type,
    t.is_favorite AS isFavorite,
    t.recurring_group_id AS recurringGroupId,
    t.recurring_frequency AS recurringFrequency,
    t.recurring_status AS recurringStatus,
    t.workplace_id AS workplaceId,
    t.workplace_name AS workplaceName
  FROM money_transactions t
  JOIN money_categories c ON c.id = t.category_id
`;

export async function listMoneyCategories(type?: MoneyTransactionType) {
  const db = await moneyDbPromise;
  const where = type ? "WHERE type = ?" : "";
  return db.getAllAsync<MoneyCategory>(
    `SELECT id, name, icon, type
     FROM money_categories ${where}
     ORDER BY type, name`,
    type ? [type] : []
  );
}

export async function saveMoneyCategory(
  values: Omit<MoneyCategory, "id">,
  id?: number
) {
  const db = await moneyDbPromise;
  if (id) {
    await db.runAsync(
      `UPDATE money_categories SET name = ?, icon = ?, type = ? WHERE id = ?`,
      [values.name.trim(), values.icon.trim() || "💰", values.type, id]
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO money_categories (name, icon, type) VALUES (?, ?, ?)`,
    [values.name.trim(), values.icon.trim() || "💰", values.type]
  );
}

export async function deleteMoneyCategory(category: MoneyCategory) {
  const db = await moneyDbPromise;
  const fallbackName = category.type === "INCOME" ? "Other Income" : "Other";
  const fallback = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM money_categories WHERE name = ? AND type = ?`,
    [fallbackName, category.type]
  );
  if (!fallback || fallback.id === category.id) {
    throw new Error("The default fallback category cannot be deleted.");
  }
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE money_transactions SET category_id = ? WHERE category_id = ?`,
      [fallback.id, category.id]
    );
    await db.runAsync(`DELETE FROM money_categories WHERE id = ?`, [
      category.id,
    ]);
  });
}

export async function saveMoneyTransaction(
  input: MoneyTransactionInput,
  id?: number
) {
  const db = await moneyDbPromise;
  if (id) {
    await db.runAsync(
      `UPDATE money_transactions
       SET title = ?, amount = ?, category_id = ?, payment_method = ?,
           note = ?, transaction_date = ?, type = ?,
           recurring_frequency = ?, workplace_id = ?, workplace_name = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        input.title.trim(),
        input.amount,
        input.categoryId,
        input.paymentMethod,
        input.note?.trim() ?? "",
        input.transactionDate,
        input.type,
        input.recurringFrequency ?? null,
        input.type === "INCOME" ? (input.workplaceId ?? null) : null,
        input.type === "INCOME" ? (input.workplaceName ?? null) : null,
        id,
      ]
    );
    return;
  }

  const groupId = input.recurringFrequency
    ? `money-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    : null;
  const occurrenceDates = buildRecurringDates(
    input.transactionDate,
    input.recurringFrequency,
    input.recurringConfig
  );

  await db.withTransactionAsync(async () => {
    for (const transactionDate of occurrenceDates) {
      await db.runAsync(
        `INSERT INTO money_transactions
          (title, amount, category_id, payment_method, note, transaction_date,
           type, recurring_group_id, recurring_frequency, workplace_id,
           workplace_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.title.trim(),
          input.amount,
          input.categoryId,
          input.paymentMethod,
          input.note?.trim() ?? "",
          transactionDate,
          input.type,
          groupId,
          input.recurringFrequency ?? null,
          input.type === "INCOME" ? (input.workplaceId ?? null) : null,
          input.type === "INCOME" ? (input.workplaceName ?? null) : null,
        ]
      );
    }
  });
}

/**
 * Recurring records are intentionally bounded. This avoids silently creating
 * years of local data while still giving useful forward-looking budgets.
 */
function buildRecurringDates(
  startIso: string,
  frequency?: string | null,
  config?: MoneyRecurringConfig | null
) {
  if (!frequency) return [startIso];

  const unit =
    config?.unit ??
    (frequency === "WEEKLY"
      ? "WEEK"
      : frequency === "YEARLY"
        ? "YEAR"
        : "MONTH");
  const interval = Math.max(1, config?.interval ?? 1);
  const start = new Date(startIso);
  const dates: string[] = [];

  let count =
    unit === "WEEK" ? 52 : unit === "MONTH" ? 24 : 5;
  if (config?.endType === "PAYMENTS") {
    count = Math.max(1, config.paymentCount ?? 1);
  }

  if (config?.endType === "DURATION") {
    const durationCount = Math.max(1, config.durationCount ?? 1);
    const durationUnit = config.durationUnit ?? unit;
    const end = addRecurringTime(start, durationCount, durationUnit);
    let cursor = new Date(start);
    while (cursor <= end && dates.length < 260) {
      dates.push(cursor.toISOString());
      cursor = addRecurringTime(cursor, interval, unit);
    }
    return dates;
  }

  for (let index = 0; index < count; index += 1) {
    const date = addRecurringTime(start, index * interval, unit);
    dates.push(date.toISOString());
  }
  return dates;
}

function addRecurringTime(
  source: Date,
  amount: number,
  unit: "WEEK" | "MONTH" | "YEAR"
) {
  const date = new Date(source);
  if (unit === "WEEK") date.setDate(date.getDate() + amount * 7);
  if (unit === "MONTH") date.setMonth(date.getMonth() + amount);
  if (unit === "YEAR") date.setFullYear(date.getFullYear() + amount);
  return date;
}

export async function getMoneyTransaction(id: number) {
  const db = await moneyDbPromise;
  return db.getFirstAsync<MoneyTransaction>(
    `${transactionSelect} WHERE t.id = ?`,
    [id]
  );
}

export async function listMoneyTransactions(options?: {
  period?: MoneyPeriod;
  type?: MoneyTransactionType;
  limit?: number;
}) {
  const db = await moneyDbPromise;
  const period = options?.period ?? "ALL";
  const range = dateRange(period);
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (range) {
    conditions.push(
      "datetime(t.transaction_date) >= datetime(?) AND datetime(t.transaction_date) < datetime(?)"
    );
    params.push(range.start, range.end);
  }
  if (options?.type) {
    conditions.push("t.type = ?");
    params.push(options.type);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ? "LIMIT ?" : "";
  if (options?.limit) params.push(options.limit);

  return db.getAllAsync<MoneyTransaction>(
    `${transactionSelect} ${where}
     ORDER BY datetime(t.transaction_date) DESC, t.id DESC ${limit}`,
    params
  );
}

export async function deleteMoneyTransaction(id: number) {
  const db = await moneyDbPromise;
  await db.runAsync(`DELETE FROM money_transactions WHERE id = ?`, [id]);
}

export async function toggleMoneyFavorite(id: number, favorite: boolean) {
  const db = await moneyDbPromise;
  await db.runAsync(
    `UPDATE money_transactions SET is_favorite = ? WHERE id = ?`,
    [favorite ? 1 : 0, id]
  );
}

export async function listFavoriteMoneyTransactions(
  type: MoneyTransactionType
) {
  const db = await moneyDbPromise;
  return db.getAllAsync<MoneyTransaction>(
    `${transactionSelect}
     WHERE t.is_favorite = 1 AND t.type = ?
     ORDER BY t.title`,
    [type]
  );
}

/**
 * Quick Add should show useful templates, not every generated recurring row.
 * Records are deduplicated by normalized title and newest records win.
 */
export async function listRecentMoneyTemplates(
  type: MoneyTransactionType,
  limit = 10
) {
  const records = await listMoneyTransactions({ type, limit: 100 });
  const seen = new Set<string>();
  const unique: MoneyTransaction[] = [];

  for (const record of records) {
    const key = record.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
    if (unique.length === limit) break;
  }
  return unique;
}

export async function getMonthlyBudget() {
  const db = await moneyDbPromise;
  const row = await db.getFirstAsync<{ monthlyBudget: number }>(
    `SELECT monthly_budget AS monthlyBudget FROM money_settings WHERE id = 1`
  );
  return row?.monthlyBudget ?? 0;
}

export async function setMonthlyBudget(amount: number) {
  const db = await moneyDbPromise;
  await db.runAsync(
    `INSERT OR REPLACE INTO money_settings (id, monthly_budget) VALUES (1, ?)`,
    [amount]
  );
}

export async function getMoneySummary(
  period: MoneyPeriod = "MONTH"
): Promise<MoneySummary> {
  const db = await moneyDbPromise;
  const range = dateRange(period);
  const dateSql = range
    ? `AND datetime(transaction_date) >= datetime(?)
       AND datetime(transaction_date) < datetime(?)`
    : "";
  const params = range ? [range.start, range.end] : [];

  const totals = await db.getFirstAsync<{
    income: number;
    expenses: number;
    transactionCount: number;
  }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expenses,
       COUNT(*) AS transactionCount
     FROM money_transactions
     WHERE 1 = 1 ${dateSql}`,
    params
  );

  const topCategory = await db.getFirstAsync<{
    name: string;
    icon: string;
    total: number;
  }>(
    `SELECT c.name, c.icon, SUM(t.amount) AS total
     FROM money_transactions t
     JOIN money_categories c ON c.id = t.category_id
     WHERE t.type = 'EXPENSE'
       ${range ? "AND datetime(t.transaction_date) >= datetime(?) AND datetime(t.transaction_date) < datetime(?)" : ""}
     GROUP BY c.id
     ORDER BY total DESC
     LIMIT 1`,
    params
  );
  const budget = await getMonthlyBudget();
  const income = totals?.income ?? 0;
  const expenses = totals?.expenses ?? 0;

  return {
    income,
    expenses,
    balance: income - expenses,
    transactionCount: totals?.transactionCount ?? 0,
    budget,
    topCategory: topCategory ?? null,
  };
}

export async function getSixMonthMoneyTrend(): Promise<MoneyTrendPoint[]> {
  const db = await moneyDbPromise;
  const result: MoneyTrendPoint[] = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const row = await db.getFirstAsync<{ income: number; expenses: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS expenses
       FROM money_transactions
       WHERE datetime(transaction_date) >= datetime(?)
         AND datetime(transaction_date) < datetime(?)`,
      [month.toISOString(), next.toISOString()]
    );
    result.push({
      label: month.toLocaleString(undefined, { month: "short" }),
      income: row?.income ?? 0,
      expenses: row?.expenses ?? 0,
    });
  }
  return result;
}

export async function listRecurringMoneyTransactions() {
  const db = await moneyDbPromise;
  return db.getAllAsync<MoneyTransaction>(
    `${transactionSelect}
     WHERE t.recurring_group_id IS NOT NULL
       AND t.id = (
         SELECT MIN(first_record.id)
         FROM money_transactions first_record
         WHERE first_record.recurring_group_id = t.recurring_group_id
       )
     ORDER BY datetime(t.transaction_date) DESC`
  );
}

export async function setRecurringMoneyStatus(
  groupId: string,
  status: "ACTIVE" | "PAUSED"
) {
  const db = await moneyDbPromise;
  await db.runAsync(
    `UPDATE money_transactions SET recurring_status = ?
     WHERE recurring_group_id = ?`,
    [status, groupId]
  );
}
