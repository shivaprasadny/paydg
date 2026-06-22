import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MoneyScreen from "../features/money/components/MoneyScreen";
import { MONEY_COLORS } from "../features/money/theme";

const SECTIONS = [
  {
    title: "Work & earnings",
    items: [
      { icon: "➕", label: "Add work income", detail: "Add a completed shift", route: "/add-shift" },
      { icon: "📊", label: "Stats", detail: "Hours, earnings, and performance", route: "/stats" },
      { icon: "📅", label: "Monthly summary", detail: "Review each month", route: "/monthly-summary" },
      { icon: "📜", label: "History", detail: "Browse previous shifts", route: "/history" },
      { icon: "✨", label: "Insights", detail: "Patterns in your work income", route: "/insights" },
    ],
  },
  {
    title: "Setup",
    items: [
      { icon: "🏢", label: "Workplaces", detail: "Manage income sources", route: "/workplaces" },
      { icon: "👔", label: "Roles", detail: "Manage your job roles", route: "/roles" },
      { icon: "⚙️", label: "Settings", detail: "Profile and shift defaults", route: "/settings" },
    ],
  },
  {
    title: "App",
    items: [
      { icon: "📘", label: "Quick guide", detail: "Learn the PayDG workflow", route: "/quick-guide" },
      { icon: "💾", label: "Backup & restore", detail: "Protect your local data", route: "/backup" },
      { icon: "ℹ️", label: "About PayDG", detail: "App information", route: "/about" },
    ],
  },
] as const;

export default function AppMenuScreen() {
  const router = useRouter();

  return (
    <MoneyScreen>
      <Text style={styles.eyebrow}>PAYDG MENU</Text>
      <Text style={styles.title}>Everything else</Text>
      <Text style={styles.subtitle}>
        The dashboard stays focused on daily money. Detailed work tools live
        here when you need them.
      </Text>

      {SECTIONS.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.card}>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.route}
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => router.push(item.route)}
              >
                <View style={styles.icon}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <View style={styles.copy}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.detail}>{item.detail}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: MONEY_COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: MONEY_COLORS.navy,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 5,
  },
  subtitle: {
    color: MONEY_COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 16,
  },
  sectionTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 15,
    marginBottom: 9,
  },
  card: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 21,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MONEY_COLORS.border,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: MONEY_COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 19 },
  copy: { flex: 1, marginLeft: 12 },
  label: { color: MONEY_COLORS.navy, fontSize: 14, fontWeight: "900" },
  detail: { color: MONEY_COLORS.muted, fontSize: 11, marginTop: 3 },
  chevron: { color: MONEY_COLORS.muted, fontSize: 27 },
});
