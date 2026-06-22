export type MoneyTransactionType = "EXPENSE" | "INCOME";
export type MoneyPeriod = "DAY" | "WEEK" | "MONTH" | "YEAR" | "ALL";
export type RecurringUnit = "WEEK" | "MONTH" | "YEAR";
export type RecurringEndType = "NEVER" | "PAYMENTS" | "DURATION";

export interface MoneyRecurringConfig {
  interval: number;
  unit: RecurringUnit;
  endType: RecurringEndType;
  paymentCount?: number;
  durationCount?: number;
  durationUnit?: RecurringUnit;
}

export interface MoneyCategory {
  id: number;
  name: string;
  icon: string;
  type: MoneyTransactionType;
}

export interface MoneyTransaction {
  id: number;
  title: string;
  amount: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  paymentMethod: string;
  note: string;
  transactionDate: string;
  type: MoneyTransactionType;
  isFavorite: number;
  recurringGroupId: string | null;
  recurringFrequency: string | null;
  recurringStatus: string | null;
  workplaceId: string | null;
  workplaceName: string | null;
}

export interface MoneyTransactionInput {
  title: string;
  amount: number;
  categoryId: number;
  paymentMethod: string;
  note?: string;
  transactionDate: string;
  type: MoneyTransactionType;
  recurringFrequency?: string | null;
  recurringConfig?: MoneyRecurringConfig | null;
  workplaceId?: string | null;
  workplaceName?: string | null;
}

export interface MoneySummary {
  income: number;
  expenses: number;
  balance: number;
  transactionCount: number;
  budget: number;
  topCategory: {
    name: string;
    icon: string;
    total: number;
  } | null;
}

export interface MoneyTrendPoint {
  label: string;
  income: number;
  expenses: number;
}
