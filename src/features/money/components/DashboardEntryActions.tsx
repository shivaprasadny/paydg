import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MONEY_COLORS } from "../theme";

type Props = {
  onWorkIncome: () => void;
  onExpense: () => void;
  onOtherIncome: () => void;
};

export default function DashboardEntryActions(props: Props) {
  return (
    <>
      <TouchableOpacity
        style={styles.workCard}
        activeOpacity={0.82}
        onPress={props.onWorkIncome}
      >
        <View style={styles.workIcon}>
          <Text style={styles.plus}>＋</Text>
        </View>
        <View style={styles.workCopy}>
          <Text style={styles.eyebrow}>WORK & PAY</Text>
          <Text style={styles.workTitle}>Add work income</Text>
          <Text style={styles.workDetail}>
            Workplace, role, hours, wage, and tips
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <EntryCard
          title="Add expense"
          detail="Money going out"
          expense
          onPress={props.onExpense}
        />
        <EntryCard
          title="Other income"
          detail="Salary, gift, refund"
          onPress={props.onOtherIncome}
        />
      </View>
    </>
  );
}

function EntryCard({
  title,
  detail,
  expense,
  onPress,
}: {
  title: string;
  detail: string;
  expense?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.entryCard,
        expense ? styles.expenseCard : styles.incomeCard,
      ]}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <View
        style={[
          styles.entryIcon,
          { backgroundColor: expense ? MONEY_COLORS.red : MONEY_COLORS.green },
        ]}
      >
        <Text style={styles.plus}>＋</Text>
      </View>
      <View style={styles.entryCopy}>
        <Text style={styles.entryTitle}>{title}</Text>
        <Text style={styles.entryDetail}>{detail}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  workCard: {
    minHeight: 89,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MONEY_COLORS.navy,
    borderRadius: 22,
    padding: 15,
    marginBottom: 10,
  },
  workIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: MONEY_COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { color: "#FFFFFF", fontSize: 25, fontWeight: "800" },
  workCopy: { flex: 1, marginLeft: 13 },
  eyebrow: {
    color: "#6EE7B7",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  workTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  workDetail: { color: "#CBD5E1", fontSize: 11, marginTop: 3 },
  arrow: { color: "#FFFFFF", fontSize: 29 },
  row: { flexDirection: "row", gap: 10, marginBottom: 17 },
  entryCard: {
    flex: 1,
    minHeight: 83,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  expenseCard: {
    backgroundColor: MONEY_COLORS.redSoft,
    borderColor: "#FECACA",
  },
  incomeCard: {
    backgroundColor: MONEY_COLORS.greenSoft,
    borderColor: "#A7F3D0",
  },
  entryIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  entryCopy: { flex: 1 },
  entryTitle: { color: MONEY_COLORS.navy, fontSize: 13, fontWeight: "900" },
  entryDetail: { color: MONEY_COLORS.muted, fontSize: 10, marginTop: 3 },
});
