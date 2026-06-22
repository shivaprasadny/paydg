import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { MONEY_COLORS } from "../theme";

type Props = TextInputProps & {
  label: string;
  hint?: string;
};

export default function FormField({ label, hint, style, ...props }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        style={[styles.input, style]}
        {...props}
      />
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 17 },
  label: {
    color: MONEY_COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    color: MONEY_COLORS.navy,
    backgroundColor: "#F8FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
  hint: { color: MONEY_COLORS.muted, fontSize: 11, marginTop: 5 },
});
