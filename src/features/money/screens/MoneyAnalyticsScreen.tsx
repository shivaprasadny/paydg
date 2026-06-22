import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import MoneyScreen from "../components/MoneyScreen";
import {
  getMoneySummary,
  getSixMonthMoneyTrend,
} from "../moneyService";
import { formatMoney, MONEY_COLORS } from "../theme";
import { MoneySummary, MoneyTrendPoint } from "../types";

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
  labelColor: () => MONEY_COLORS.muted,
  decimalPlaces: 0,
  barPercentage: 0.55,
  propsForBackgroundLines: { stroke: "#E2E8F0" },
};

export default function MoneyAnalyticsScreen() {
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [trend, setTrend] = useState<MoneyTrendPoint[]>([]);

  const load = useCallback(async () => {
    const [nextSummary, nextTrend] = await Promise.all([
      getMoneySummary("MONTH"),
      getSixMonthMoneyTrend(),
    ]);
    setSummary(nextSummary);
    setTrend(nextTrend);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const maxValue = Math.max(
    1,
    ...trend.flatMap((item) => [item.income, item.expenses])
  );
  const savingsRate =
    summary && summary.income > 0
      ? ((summary.income - summary.expenses) / summary.income) * 100
      : 0;

  return (
    <MoneyScreen>
      <Text style={styles.eyebrow}>FINANCIAL SIGNALS</Text>
      <Text style={styles.title}>Money analytics</Text>
      <Text style={styles.subtitle}>
        Look for direction, not perfection. The useful question is whether your
        spending is becoming easier to understand.
      </Text>

      <View style={styles.insightCard}>
        <Text style={styles.insightIcon}>💡</Text>
        <View style={styles.insightCopy}>
          <Text style={styles.insightTitle}>This month at a glance</Text>
          <Text style={styles.insightText}>
            {summary?.topCategory
              ? `${summary.topCategory.icon} ${summary.topCategory.name} is your largest category at ${formatMoney(summary.topCategory.total)}.`
              : "Add a few records and PayDG will surface your strongest spending signal here."}
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Net from records</Text>
          <Text
            style={[
              styles.metricValue,
              {
                color:
                  (summary?.balance ?? 0) >= 0
                    ? MONEY_COLORS.green
                    : MONEY_COLORS.red,
              },
            ]}
          >
            {formatMoney(summary?.balance ?? 0)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Savings rate</Text>
          <Text style={[styles.metricValue, { color: MONEY_COLORS.blue }]}>
            {savingsRate.toFixed(0)}%
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Six-month income</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={{
            labels: trend.map((point) => point.label),
            datasets: [{ data: trend.map((point) => point.income) }],
          }}
          width={Math.max(Dimensions.get("window").width - 36, 430)}
          height={225}
          fromZero
          withInnerLines
          yAxisLabel="$"
          yAxisSuffix=""
          segments={4}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </ScrollView>

      <Text style={styles.sectionTitle}>Income vs. spending</Text>
      <View style={styles.monthList}>
        {trend.map((point) => (
          <View key={point.label} style={styles.monthRow}>
            <Text style={styles.monthLabel}>{point.label}</Text>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  styles.incomeBar,
                  { width: `${(point.income / maxValue) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  styles.expenseBar,
                  { width: `${(point.expenses / maxValue) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.monthValues}>
              <Text style={styles.incomeText}>{formatMoney(point.income)}</Text>
              <Text style={styles.expenseText}>
                {formatMoney(point.expenses)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: MONEY_COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: MONEY_COLORS.navy,
    fontSize: 29,
    fontWeight: "900",
    marginTop: 5,
  },
  subtitle: {
    color: MONEY_COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 18,
  },
  insightCard: {
    flexDirection: "row",
    backgroundColor: MONEY_COLORS.blueSoft,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 20,
    padding: 16,
  },
  insightIcon: { fontSize: 22 },
  insightCopy: { flex: 1, marginLeft: 12 },
  insightTitle: { color: MONEY_COLORS.navy, fontSize: 14, fontWeight: "900" },
  insightText: {
    color: MONEY_COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  metricRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metric: {
    flex: 1,
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 18,
    padding: 15,
  },
  metricLabel: { color: MONEY_COLORS.muted, fontSize: 11, fontWeight: "700" },
  metricValue: { fontSize: 20, fontWeight: "900", marginTop: 6 },
  sectionTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 23,
    marginBottom: 11,
  },
  chart: { borderRadius: 20 },
  monthList: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 20,
    padding: 15,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  monthLabel: {
    width: 34,
    color: MONEY_COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
  },
  bars: { flex: 1, gap: 4, marginHorizontal: 10 },
  bar: { height: 7, borderRadius: 99, minWidth: 2 },
  incomeBar: { backgroundColor: MONEY_COLORS.green },
  expenseBar: { backgroundColor: MONEY_COLORS.red },
  monthValues: { width: 76, alignItems: "flex-end" },
  incomeText: { color: MONEY_COLORS.green, fontSize: 10, fontWeight: "800" },
  expenseText: {
    color: MONEY_COLORS.red,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 3,
  },
});
