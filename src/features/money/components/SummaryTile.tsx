import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MONEY_COLORS } from "../theme";

type Props = {
  label: string;
  value: string;
  icon: string;
  tone?: "green" | "red" | "blue" | "amber";
  detail?: string;
};

const TONES = {
  green: { background: MONEY_COLORS.greenSoft, color: MONEY_COLORS.green },
  red: { background: MONEY_COLORS.redSoft, color: MONEY_COLORS.red },
  blue: { background: MONEY_COLORS.blueSoft, color: MONEY_COLORS.blue },
  amber: { background: MONEY_COLORS.amberSoft, color: MONEY_COLORS.amber },
};

export default function SummaryTile({
  label,
  value,
  icon,
  tone = "blue",
  detail,
}: Props) {
  const colors = TONES[tone];
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: colors.background }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: colors.color }]}>{value}</Text>
      {!!detail && <Text style={styles.detail}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48.5%",
    minHeight: 138,
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 20,
    padding: 15,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconText: { fontSize: 18 },
  label: {
    color: MONEY_COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 5,
  },
  detail: {
    color: MONEY_COLORS.muted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
});
