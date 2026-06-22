import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MoneyScreen from "../components/MoneyScreen";
import {
  listRecurringMoneyTransactions,
  setRecurringMoneyStatus,
} from "../moneyService";
import { formatMoney, MONEY_COLORS } from "../theme";
import { MoneyTransaction } from "../types";

export default function MoneyRecurringScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<MoneyTransaction[]>([]);

  const load = useCallback(async () => {
    setRecords(await listRecurringMoneyTransactions());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async (record: MoneyTransaction) => {
    if (!record.recurringGroupId) return;
    await setRecurringMoneyStatus(
      record.recurringGroupId,
      record.recurringStatus === "PAUSED" ? "ACTIVE" : "PAUSED"
    );
    await load();
  };

  return (
    <MoneyScreen>
      <Text style={styles.eyebrow}>REPEATING MONEY</Text>
      <Text style={styles.title}>Recurring records</Text>
      <Text style={styles.subtitle}>
        These templates remember repeating bills and income. Pausing one keeps
        its history without treating it as active.
      </Text>

      {records.length ? (
        records.map((record) => {
          const paused = record.recurringStatus === "PAUSED";
          return (
            <View key={record.id} style={styles.card}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>{record.categoryIcon}</Text>
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.recordTitle}>{record.title}</Text>
                  <View
                    style={[
                      styles.status,
                      paused ? styles.statusPaused : styles.statusActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: paused
                            ? MONEY_COLORS.amber
                            : MONEY_COLORS.green,
                        },
                      ]}
                    >
                      {paused ? "PAUSED" : "ACTIVE"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {record.recurringFrequency?.toLowerCase()} ·{" "}
                  {record.categoryName}
                </Text>
                <Text
                  style={[
                    styles.amount,
                    {
                      color:
                        record.type === "INCOME"
                          ? MONEY_COLORS.green
                          : MONEY_COLORS.red,
                    },
                  ]}
                >
                  {formatMoney(record.amount)}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/money/add",
                        params: { id: String(record.id) },
                      })
                    }
                  >
                    <Text style={styles.edit}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggle(record)}>
                    <Text style={styles.pause}>
                      {paused ? "Resume" : "Pause"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔁</Text>
          <Text style={styles.emptyTitle}>Nothing repeating yet</Text>
          <Text style={styles.emptyText}>
            Choose weekly, monthly, or yearly when adding a record.
          </Text>
          <TouchableOpacity
            style={styles.add}
            onPress={() => router.push("/money/add")}
          >
            <Text style={styles.addText}>Add recurring record</Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 28,
    fontWeight: "900",
    marginTop: 5,
  },
  subtitle: {
    color: MONEY_COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  card: {
    flexDirection: "row",
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 22 },
  copy: { flex: 1, marginLeft: 13 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  recordTitle: {
    flex: 1,
    color: MONEY_COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },
  status: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  statusActive: { backgroundColor: MONEY_COLORS.greenSoft },
  statusPaused: { backgroundColor: MONEY_COLORS.amberSoft },
  statusText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  meta: { color: MONEY_COLORS.muted, fontSize: 11, marginTop: 4 },
  amount: { fontSize: 17, fontWeight: "900", marginTop: 9 },
  actions: { flexDirection: "row", gap: 18, marginTop: 12 },
  edit: { color: MONEY_COLORS.blue, fontSize: 12, fontWeight: "900" },
  pause: { color: MONEY_COLORS.amber, fontSize: 12, fontWeight: "900" },
  empty: {
    alignItems: "center",
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 22,
    padding: 29,
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 9,
  },
  emptyText: {
    color: MONEY_COLORS.muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  add: {
    backgroundColor: MONEY_COLORS.navy,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 18,
  },
  addText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
});
