import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MoneyScreen from "../components/MoneyScreen";
import {
  getMoneySummary,
  getMonthlyBudget,
  setMonthlyBudget,
} from "../moneyService";
import { formatMoney, MONEY_COLORS } from "../theme";

export default function MoneyBudgetScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState("");
  const [spent, setSpent] = useState(0);

  const load = useCallback(async () => {
    const [savedBudget, summary] = await Promise.all([
      getMonthlyBudget(),
      getMoneySummary("MONTH"),
    ]);
    setBudget(savedBudget ? String(savedBudget) : "");
    setSpent(summary.expenses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const numericBudget = Number(budget) || 0;
  const remaining = numericBudget - spent;
  const usedPercent =
    numericBudget > 0 ? Math.min((spent / numericBudget) * 100, 100) : 0;

  const save = async () => {
    if (numericBudget < 0) {
      Alert.alert("Invalid budget", "Budget cannot be negative.");
      return;
    }
    await setMonthlyBudget(numericBudget);
    Alert.alert("Budget saved", "Your dashboard has been updated.");
  };

  return (
    <MoneyScreen>
      <Text style={styles.eyebrow}>MONTHLY SPENDING PLAN</Text>
      <Text style={styles.title}>Set a calm limit</Text>
      <Text style={styles.subtitle}>
        A budget is a guide, not a scolding. Choose a number that helps you
        notice your spending early.
      </Text>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Remaining this month</Text>
        <Text
          style={[
            styles.heroValue,
            { color: remaining >= 0 ? "#6EE7B7" : "#FCA5A5" },
          ]}
        >
          {formatMoney(remaining)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${usedPercent}%` }]} />
        </View>
        <View style={styles.heroFooter}>
          <Text style={styles.heroMeta}>{formatMoney(spent)} spent</Text>
          <Text style={styles.heroMeta}>{usedPercent.toFixed(0)}% used</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Monthly budget</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94A3B8"
            style={styles.input}
          />
        </View>
        <TouchableOpacity style={styles.save} onPress={save}>
          <Text style={styles.saveText}>Save budget</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.recordsLink}
        onPress={() => router.push("/money/records")}
      >
        <Text style={styles.recordsLinkText}>Review this month’s expenses →</Text>
      </TouchableOpacity>
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: MONEY_COLORS.amber,
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
    marginBottom: 20,
  },
  hero: {
    backgroundColor: MONEY_COLORS.navy,
    borderRadius: 24,
    padding: 21,
    marginBottom: 16,
  },
  heroLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  heroValue: { fontSize: 34, fontWeight: "900", marginTop: 6 },
  track: {
    height: 9,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 99,
    marginTop: 22,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#F59E0B", borderRadius: 99 },
  heroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  heroMeta: { color: "#CBD5E1", fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 22,
    padding: 18,
  },
  label: {
    color: MONEY_COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: MONEY_COLORS.border,
    marginVertical: 17,
  },
  currency: { color: MONEY_COLORS.muted, fontSize: 29, fontWeight: "800" },
  input: {
    flex: 1,
    color: MONEY_COLORS.navy,
    fontSize: 34,
    fontWeight: "900",
    paddingVertical: 11,
    marginLeft: 8,
  },
  save: {
    height: 52,
    borderRadius: 16,
    backgroundColor: MONEY_COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  recordsLink: { alignItems: "center", paddingVertical: 21 },
  recordsLinkText: { color: MONEY_COLORS.blue, fontSize: 13, fontWeight: "900" },
});
