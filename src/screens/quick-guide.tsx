// src/screens/quick-guide.tsx
// ---------------------------------------------------------
// PayDG — Quick Guide
// ✅ Premium light PayDG theme
// ✅ Android-friendly bottom spacing
// ✅ Friendly guide with emojis
// ---------------------------------------------------------

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";

import Screen from "../components/Screen";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

function GuideCard({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <View
      style={[
        styles.card,
        tone === "success" && styles.successCard,
        tone === "warning" && styles.warningCard,
      ]}
    >
      <Text
        style={[
          styles.cardTitle,
          tone === "success" && styles.successTitle,
          tone === "warning" && styles.warningTitle,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.cardBody,
          tone === "success" && styles.successBody,
          tone === "warning" && styles.warningBody,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function MiniTip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.miniTip}>
      <Text style={styles.miniTipText}>{children}</Text>
    </View>
  );
}

export default function QuickGuideScreen() {
  return (
    <Screen bg="#F6F7FB" pad={0}>
      <Stack.Screen options={{ title: "Quick Guide" }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <ActiveShiftTimerCard />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>📘 PayDG help</Text>
          <Text style={styles.title}>Quick Guide</Text>
          <Text style={styles.subtitle}>
            Track hours, tips, and income faster — so your paycheck never feels
            like a mystery.
          </Text>
        </View>

        <GuideCard title="🎯 Fun fact" tone="success">
          Most tip workers underestimate weekly tips when they don’t track them
          daily. Small tips add up fast — PayDG helps you see the real number.
          😄
        </GuideCard>

        <GuideCard title="✅ 1) Setup takes 2 minutes">
          Do this once and the app becomes effortless:
          {"\n\n"}• Add your workplace, for example Don Giovanni.
          {"\n"}• Add your role, like Server, Bartender, or Runner.
          {"\n"}• Optional: set defaults in Settings for hourly wage and break
          rules.
        </GuideCard>

        <MiniTip>
          💡 Pro tip: If you work at multiple places, add them all now. Your
          Stats will become much stronger later.
        </MiniTip>

        <GuideCard title="⏱️ 2) Track your shifts">
          Option A — Add Shift:
          {"\n"}Best when you already know your start and end time.
          {"\n\n"}Option B — Punch In/Out:
          {"\n"}Best when you’re busy. One tap in, one tap out — PayDG
          calculates hours automatically.
        </GuideCard>

        <MiniTip>
          🍕 Busy night? Use Punch. Chill shift? Use Add Shift. Both show up in
          History and Stats.
        </MiniTip>

        <GuideCard title="📂 3) Know your screens">
          • Home: quick stats, recent entries, and shortcuts.
          {"\n"}• Entries: your shifts in a clean list.
          {"\n"}• History: full timeline of shifts. Tap to edit.
          {"\n"}• Stats: week, month, and year trends.
        </GuideCard>

        <MiniTip>
          🔎 Tip: If you ever need to fix something, History is your control
          center.
        </MiniTip>

        <GuideCard title="💰 4) Better data = better stats">
          Want the app to feel smarter? These small habits make a big
          difference:
          {"\n\n"}• Always pick workplace and role.
          {"\n"}• Split tips into cash and card.
          {"\n"}• Add a note like “double shift”, “private party”, or “slow
          night”.
        </GuideCard>

        <MiniTip>
          ⭐ After 2–3 weeks of data, you’ll start seeing patterns like
          “weekends pay more” or “this role earns better.”
        </MiniTip>

        <GuideCard title="🚨 5) Forgot to punch out?" tone="warning">
          No stress. PayDG has safety auto-close so the timer won’t run forever.
          {"\n\n"}You can always fix it in History → Edit Shift.
        </GuideCard>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>
            🙌 The goal isn’t perfection — it’s consistency. Even rough tracking
            makes your money clearer.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 48,
    gap: 14,
  },

  header: {
    backgroundColor: "#1E293B",
    borderRadius: 28,
    padding: 22,
  },
  eyebrow: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 8,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    padding: 16,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  cardBody: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
  },

  successCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
  },
  successTitle: {
    color: "#15803D",
  },
  successBody: {
    color: "#166534",
  },

  warningCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  warningTitle: {
    color: "#B91C1C",
  },
  warningBody: {
    color: "#991B1B",
  },

  miniTip: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 20,
    padding: 14,
  },
  miniTipText: {
    color: "#92400E",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "800",
  },

  footerCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    padding: 16,
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
});