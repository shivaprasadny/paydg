import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from "react-native";
import { MONEY_COLORS } from "../theme";

type Props = ScrollViewProps & {
  children: React.ReactNode;
};

/**
 * Shared screen wrapper keeps keyboard, spacing, and background behavior
 * consistent across every page in the Money module.
 */
export default function MoneyScreen({
  children,
  contentContainerStyle,
  ...scrollProps
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, contentContainerStyle]}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MONEY_COLORS.background,
  },
  content: {
    padding: 18,
    paddingBottom: 80,
  },
});
