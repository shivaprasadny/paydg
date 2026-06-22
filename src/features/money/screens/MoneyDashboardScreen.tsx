import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MoneyAction from "../components/MoneyAction";
import DashboardEntryActions from "../components/DashboardEntryActions";
import MoneyPeriodFilter from "../components/MoneyPeriodFilter";
import MoneyScreen from "../components/MoneyScreen";
import SummaryTile from "../components/SummaryTile";
import TransactionRow from "../components/TransactionRow";
import {
  getMoneySummary,
  listMoneyTransactions,
} from "../moneyService";
import { formatMoney, MONEY_COLORS } from "../theme";
import { MoneySummary, MoneyTransaction } from "../types";
import type { MoneyPeriod } from "../types";
import { getProfile } from "../../../storage/repositories/profileRepo";

const SHIFT_STORAGE_KEY = "paydg_shifts_v1";

type SavedShift = {
  startISO: string;
  totalEarned: number;
};

/**
 * Calculates this month's PayDG work earnings. ExpenseDG did not have access
 * to this value; combining it here is the main benefit of the merged app.
 */
async function getWorkEarnings(period: MoneyPeriod) {
  const raw = await AsyncStorage.getItem(SHIFT_STORAGE_KEY);
  const shifts: SavedShift[] = raw ? JSON.parse(raw) : [];
  const now = new Date();
  return shifts.reduce((total, shift) => {
    const date = new Date(shift.startISO);
    let included = true;
    if (period === "DAY") {
      included = date.toDateString() === now.toDateString();
    } else if (period === "WEEK") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      included = date >= start && date < end;
    } else if (period === "MONTH") {
      included =
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    } else if (period === "YEAR") {
      included = date.getFullYear() === now.getFullYear();
    }
    return total + (included ? Number(shift.totalEarned) || 0 : 0);
  }, 0);
}

export default function MoneyDashboardScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [recent, setRecent] = useState<MoneyTransaction[]>([]);
  const [workEarnings, setWorkEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<MoneyPeriod>("MONTH");

  const load = useCallback(async () => {
    const [nextSummary, nextRecent, nextWorkEarnings] = await Promise.all([
      getMoneySummary(period),
      listMoneyTransactions({ limit: 5 }),
      getWorkEarnings(period),
    ]);
    setSummary(nextSummary);
    setRecent(nextRecent);
    setWorkEarnings(nextWorkEarnings);
    setLoading(false);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading || !summary) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={MONEY_COLORS.blue} />
      </View>
    );
  }

  // Work earnings are automatic. Manually logged income is shown separately
  // so the dashboard never silently counts the same paycheck twice.
  const availableAfterSpending =
    workEarnings + summary.income - summary.expenses;
  const budgetPercent =
    summary.budget > 0
      ? Math.min((summary.expenses / summary.budget) * 100, 100)
      : 0;

  return (
    <MoneyScreen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <View style={styles.dashboardHeader}>
        <View style={styles.dashboardHeaderCopy}>
          <Text style={styles.dashboardEyebrow}>PAYDG DASHBOARD</Text>
          <Text style={styles.dashboardTitle}>
            Hi, {getProfile()?.userName || "there"} 👋
          </Text>
          <Text style={styles.dashboardSubtitle}>
            Track what you earn, spend, and keep.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.topAddButton}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/money/add",
                params: { type: "EXPENSE" },
              })
            }
          >
            <Text style={styles.topAddText}>＋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            activeOpacity={0.8}
            onPress={() => router.push("/menu")}
          >
            <Text style={styles.menuButtonText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DashboardEntryActions
        onWorkIncome={() => router.push("/add-shift")}
        onExpense={() =>
          router.push({ pathname: "/money/add", params: { type: "EXPENSE" } })
        }
        onOtherIncome={() =>
          router.push({ pathname: "/money/add", params: { type: "INCOME" } })
        }
      />

      <MoneyPeriodFilter value={period} onChange={setPeriod} />

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>PAYDG MONEY</Text>
          </View>
          <Text style={styles.heroIcon}>✨</Text>
        </View>
        <Text style={styles.heroLabel}>Net balance · {period.toLowerCase()}</Text>
        <Text style={styles.heroValue}>{formatMoney(availableAfterSpending)}</Text>
        <Text style={styles.heroDetail}>
          {formatMoney(workEarnings + summary.income)} total income −{" "}
          {formatMoney(summary.expenses)} expenses
        </Text>
        <View style={styles.heroRule} />
        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterLabel}>Logged other income</Text>
          <Text style={styles.heroFooterValue}>
            {formatMoney(summary.income)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Selected period</Text>
        <Text style={styles.sectionCaption}>
          {summary.transactionCount} records
        </Text>
      </View>
      <View style={styles.tileGrid}>
        <SummaryTile
          label="Work earned"
          value={formatMoney(workEarnings)}
          icon="💼"
          tone="green"
        />
        <SummaryTile
          label="Spent"
          value={formatMoney(summary.expenses)}
          icon="💸"
          tone="red"
        />
        <SummaryTile
          label="Budget"
          value={
            summary.budget > 0 ? formatMoney(summary.budget) : "Not set"
          }
          icon="🎯"
          tone="amber"
          detail={
            summary.budget > 0
              ? `${budgetPercent.toFixed(0)}% used`
              : "Add a monthly limit"
          }
        />
        <SummaryTile
          label="Top category"
          value={summary.topCategory?.name ?? "No data"}
          icon={summary.topCategory?.icon ?? "📊"}
          tone="blue"
          detail={
            summary.topCategory
              ? formatMoney(summary.topCategory.total)
              : "Start adding expenses"
          }
        />
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <MoneyAction
        icon="🧾"
        label="All records"
        detail="Search, filter, edit, and remove transactions"
        onPress={() => router.push("/money/records")}
      />
      <MoneyAction
        icon="📈"
        label="Analytics"
        detail="Six-month trend and spending breakdown"
        onPress={() => router.push("/money/analytics")}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <TouchableOpacity onPress={() => router.push("/money/records")}>
          <Text style={styles.link}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.listCard}>
        {recent.length ? (
          recent.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onPress={() =>
                router.push({
                  pathname: "/money/add",
                  params: { id: String(transaction.id) },
                })
              }
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🪴</Text>
            <Text style={styles.emptyTitle}>Your money story starts here</Text>
            <Text style={styles.emptyText}>
              Add the first expense or income record to unlock insights.
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Manage</Text>
      <MoneyAction
        icon="🗂️"
        label="Categories"
        detail="Create categories that match your real spending"
        onPress={() => router.push("/money/categories")}
      />
      <MoneyAction
        icon="🎯"
        label="Monthly budget"
        detail="Set a target and monitor your progress"
        onPress={() => router.push("/money/budget")}
      />
      <MoneyAction
        icon="🔁"
        label="Recurring records"
        detail="Review and pause repeating transactions"
        onPress={() => router.push("/money/recurring")}
      />
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MONEY_COLORS.background,
  },
  dashboardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 17,
  },
  dashboardHeaderCopy: { flex: 1 },
  dashboardEyebrow: {
    color: MONEY_COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  dashboardTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 4,
  },
  dashboardSubtitle: {
    color: MONEY_COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  headerActions: { flexDirection: "row", gap: 8, marginLeft: 12 },
  topAddButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: MONEY_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  topAddText: { color: "#FFFFFF", fontSize: 25, fontWeight: "700" },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonText: {
    color: MONEY_COLORS.navy,
    fontSize: 21,
    fontWeight: "900",
  },
  workIncomeCard: {
    minHeight: 89,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MONEY_COLORS.navy,
    borderRadius: 22,
    padding: 15,
    marginBottom: 10,
  },
  workIncomeIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: MONEY_COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  workIncomeIconText: { color: "#FFFFFF", fontSize: 25, fontWeight: "800" },
  workIncomeCopy: { flex: 1, marginLeft: 13 },
  workIncomeEyebrow: {
    color: "#6EE7B7",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  workIncomeTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  workIncomeDetail: { color: "#CBD5E1", fontSize: 11, marginTop: 3 },
  workIncomeArrow: { color: "#FFFFFF", fontSize: 29 },
  addRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 17,
  },
  periodFilters: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 16,
  },
  periodFilter: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  periodFilterActive: { backgroundColor: MONEY_COLORS.navy },
  periodFilterText: {
    color: MONEY_COLORS.muted,
    fontSize: 10,
    fontWeight: "900",
  },
  periodFilterTextActive: { color: "#FFFFFF" },
  addCard: {
    flex: 1,
    minHeight: 83,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  expenseAddCard: {
    backgroundColor: MONEY_COLORS.redSoft,
    borderColor: "#FECACA",
  },
  incomeAddCard: {
    backgroundColor: MONEY_COLORS.greenSoft,
    borderColor: "#A7F3D0",
  },
  addIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  expenseAddIcon: { backgroundColor: MONEY_COLORS.red },
  incomeAddIcon: { backgroundColor: MONEY_COLORS.green },
  addIconText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  addCardTitle: { color: MONEY_COLORS.navy, fontSize: 13, fontWeight: "900" },
  addCardDetail: { color: MONEY_COLORS.muted, fontSize: 10, marginTop: 3 },
  hero: {
    backgroundColor: MONEY_COLORS.navy,
    borderRadius: 28,
    padding: 22,
    marginBottom: 25,
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: "#BAE6FD",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroIcon: { fontSize: 20 },
  heroLabel: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 6,
    letterSpacing: -1.2,
  },
  heroDetail: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  heroRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 18,
  },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroFooterLabel: { color: "#94A3B8", fontSize: 12 },
  heroFooterValue: { color: "#6EE7B7", fontSize: 15, fontWeight: "900" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionCaption: { color: MONEY_COLORS.muted, fontSize: 12 },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 18,
  },
  link: { color: MONEY_COLORS.blue, fontSize: 13, fontWeight: "900" },
  listCard: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 20,
    overflow: "hidden",
  },
  empty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 10 },
  emptyIcon: { fontSize: 32, marginBottom: 9 },
  emptyTitle: { color: MONEY_COLORS.navy, fontSize: 15, fontWeight: "900" },
  emptyText: {
    color: MONEY_COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 5,
  },
});
