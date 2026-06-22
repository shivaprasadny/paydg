import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getMoneySummary } from "../moneyService";
import { formatMoney, MONEY_COLORS } from "../theme";
import { MoneySummary } from "../types";

/**
 * Compact bridge between PayDG's work dashboard and the new Money module.
 * Keeping this separate prevents the already-large home page from growing.
 */
export default function MoneyOverviewCard() {
  const router = useRouter();
  const [summary, setSummary] = useState<MoneySummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      getMoneySummary("MONTH").then(setSummary).catch(console.error);
    }, [])
  );

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={styles.card}
      onPress={() => router.push("/money")}
    >
      <View style={styles.header}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>💳</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>MONEY</Text>
          <Text style={styles.title}>Spending & budget</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Spent this month</Text>
          <Text style={[styles.metricValue, { color: MONEY_COLORS.red }]}>
            {formatMoney(summary?.expenses ?? 0)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Other income</Text>
          <Text style={[styles.metricValue, { color: MONEY_COLORS.green }]}>
            {formatMoney(summary?.income ?? 0)}
          </Text>
        </View>
      </View>
      <Text style={styles.hint}>
        Open Money to see earnings minus expenses, analytics, and budgets.
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  header: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MONEY_COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  headerCopy: { flex: 1, marginLeft: 11 },
  kicker: {
    color: MONEY_COLORS.blue,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: { color: MONEY_COLORS.navy, fontSize: 16, fontWeight: "900" },
  chevron: { color: MONEY_COLORS.muted, fontSize: 28 },
  metrics: { flexDirection: "row", gap: 10, marginTop: 15 },
  metric: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    padding: 12,
  },
  metricLabel: { color: MONEY_COLORS.muted, fontSize: 10, fontWeight: "700" },
  metricValue: { fontSize: 16, fontWeight: "900", marginTop: 5 },
  hint: {
    color: MONEY_COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 11,
  },
});
