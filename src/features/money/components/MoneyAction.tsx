import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MONEY_COLORS } from "../theme";

type Props = {
  icon: string;
  label: string;
  detail: string;
  onPress: () => void;
};

export default function MoneyAction({ icon, label, detail, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: MONEY_COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  copy: { flex: 1, marginLeft: 13 },
  label: { color: MONEY_COLORS.navy, fontSize: 15, fontWeight: "900" },
  detail: {
    color: MONEY_COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  chevron: { color: MONEY_COLORS.muted, fontSize: 26, marginLeft: 8 },
});
