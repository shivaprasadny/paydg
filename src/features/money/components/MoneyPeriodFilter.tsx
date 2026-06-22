import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MONEY_COLORS } from "../theme";
import { MoneyPeriod } from "../types";

const PERIODS: MoneyPeriod[] = ["DAY", "WEEK", "MONTH", "YEAR"];

export default function MoneyPeriodFilter({
  value,
  onChange,
}: {
  value: MoneyPeriod;
  onChange: (period: MoneyPeriod) => void;
}) {
  return (
    <View style={styles.filters}>
      {PERIODS.map((period) => (
        <TouchableOpacity
          key={period}
          style={[styles.filter, value === period && styles.active]}
          onPress={() => onChange(period)}
        >
          <Text style={[styles.text, value === period && styles.activeText]}>
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", gap: 7, marginBottom: 16 },
  filter: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  active: { backgroundColor: MONEY_COLORS.navy },
  text: { color: MONEY_COLORS.muted, fontSize: 10, fontWeight: "900" },
  activeText: { color: "#FFFFFF" },
});
