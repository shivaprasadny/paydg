import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MoneyTransaction } from "../types";
import { formatMoney, MONEY_COLORS } from "../theme";

type Props = {
  transaction: MoneyTransaction;
  onPress?: () => void;
};

export default function TransactionRow({ transaction, onPress }: Props) {
  const isIncome = transaction.type === "INCOME";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{transaction.categoryIcon}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {transaction.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {transaction.workplaceName
            ? `${transaction.workplaceName} · `
            : ""}
          {transaction.categoryName} ·{" "}
          {new Date(transaction.transactionDate).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.amountWrap}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? MONEY_COLORS.green : MONEY_COLORS.red },
          ]}
        >
          {isIncome ? "+" : "−"}
          {formatMoney(transaction.amount)}
        </Text>
        <Text style={styles.method}>{transaction.paymentMethod}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MONEY_COLORS.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MONEY_COLORS.border,
    paddingVertical: 13,
  },
  pressed: { opacity: 0.65 },
  icon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  copy: { flex: 1, marginHorizontal: 12 },
  title: { color: MONEY_COLORS.navy, fontSize: 14, fontWeight: "900" },
  meta: { color: MONEY_COLORS.muted, fontSize: 11, marginTop: 4 },
  amountWrap: { alignItems: "flex-end" },
  amount: { fontSize: 14, fontWeight: "900" },
  method: { color: MONEY_COLORS.muted, fontSize: 10, marginTop: 4 },
});
