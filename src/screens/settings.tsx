// src/screens/settings.tsx
// ---------------------------------------------------------
// PayDG — Settings
// Premium light finance theme
//
// ✅ Edit user name
// ✅ Default hourly wage
// ✅ Default break minutes
// ✅ Default unpaid break toggle
// ✅ Security & PIN Lock route
// ✅ Clean spacing, comments, emoji sections
// ---------------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { getProfile, saveProfile } from "../storage/repositories/profileRepo";
import { Profile } from "../models/Profile";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

/* ---------------------------------------------------------
   PayDG Theme
--------------------------------------------------------- */

const COLORS = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  navy: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  inputBg: "#F8FAFC",
  gold: "#D97706",
  goldSoft: "#FFF7ED",
  goldBorder: "#FED7AA",
  green: "#059669",
  danger: "#DC2626",
};

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function parseMoney(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(input: string, fallback: number) {
  const cleaned = input.replace(/[^0-9]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

/* =========================================================
   Screen
========================================================= */

export default function SettingsScreen() {
  const router = useRouter();
  const profile = getProfile();

  /**
   * If profile does not exist,
   * user should complete profile first.
   */
  if (!profile) {
    return (
      <Screen bg={COLORS.bg} pad={16}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>👤</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.helper}>Please complete your profile first.</Text>

          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push("/profile")}
          >
            <Text style={styles.primaryBtnText}>Go to Profile</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  /**
   * Load initial values from saved profile.
   */
  const initial = useMemo(() => {
    return {
      userName: profile.userName ?? "",
      defaultHourlyWage: String(profile.defaultHourlyWage ?? 0),
      defaultBreakMinutes: String(profile.defaultBreakMinutes ?? 30),
      defaultUnpaidBreak: profile.defaultUnpaidBreak ?? true,
    };
  }, [profile]);

  const [userName, setUserName] = useState(initial.userName);
  const [defaultHourlyWageText, setDefaultHourlyWageText] = useState(
    initial.defaultHourlyWage
  );
  const [defaultBreakMinutesText, setDefaultBreakMinutesText] = useState(
    initial.defaultBreakMinutes
  );
  const [defaultUnpaidBreak, setDefaultUnpaidBreak] = useState(
    initial.defaultUnpaidBreak
  );

  /**
   * Convert text input values into safe numbers.
   */
  const wage = useMemo(
    () => parseMoney(defaultHourlyWageText),
    [defaultHourlyWageText]
  );

  const breakMinutes = useMemo(
    () => Math.min(240, Math.max(0, parseIntSafe(defaultBreakMinutesText, 30))),
    [defaultBreakMinutesText]
  );

  /**
   * Save settings into Profile storage.
   */
  const onSave = async () => {
    const name = userName.trim();

    if (name.length < 2) {
      Alert.alert("Name", "Please enter at least 2 characters.");
      return;
    }

    const nextProfile: Profile = {
      ...profile,
      userName: name,
      defaultHourlyWage: wage,
      defaultBreakMinutes: breakMinutes,
      defaultUnpaidBreak,
    };

    await saveProfile(nextProfile);

    Alert.alert("Saved", "Settings updated ✅", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <Screen bg={COLORS.bg} pad={16}>
      {/* -------------------- Header -------------------- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>PAYDG CONTROL CENTER</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your profile, shift defaults, and app security.
          </Text>
        </View>
      </View>

      {/* -------------------- Active Shift Timer -------------------- */}
      <ActiveShiftTimerCard />

      {/* -------------------- Profile Card -------------------- */}
      <View style={styles.card}>
        <SectionHeader emoji="👤" title="User Profile" />

        <Text style={styles.label}>Your name</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="e.g. Shiva"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        <Text style={styles.helper}>
          This name appears on your PayDG home screen.
        </Text>
      </View>

      {/* -------------------- Defaults Card -------------------- */}
      <View style={styles.card}>
        <SectionHeader emoji="💵" title="Shift Defaults" />

        <Text style={styles.label}>Default hourly wage</Text>
        <TextInput
          value={defaultHourlyWageText}
          onChangeText={setDefaultHourlyWageText}
          keyboardType="decimal-pad"
          placeholder="e.g. 15"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Deduct unpaid break</Text>
            <Text style={styles.toggleSub}>
              Auto subtract break time from total pay.
            </Text>
          </View>

          <Switch
            value={defaultUnpaidBreak}
            onValueChange={setDefaultUnpaidBreak}
            trackColor={{ false: "#CBD5E1", true: "#BBF7D0" }}
            thumbColor={defaultUnpaidBreak ? COLORS.green : "#F8FAFC"}
          />
        </View>

        <Text style={styles.label}>Default break minutes</Text>
        <TextInput
          value={defaultBreakMinutesText}
          onChangeText={setDefaultBreakMinutesText}
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        <Text style={styles.helper}>
          These values auto-fill whenever you add a new shift.
        </Text>
      </View>

      {/* -------------------- Security Card -------------------- */}
      <Pressable
        style={({ pressed }) => [
          styles.securityCard,
          pressed && styles.pressed,
        ]}
        onPress={() => router.push("/security")}
      >
        <View style={styles.securityIcon}>
          <Text style={styles.securityEmoji}>🔐</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.securityTitle}>Security & PIN Lock</Text>
          <Text style={styles.securitySub}>
            Add, change, or remove your 4-digit app PIN.
          </Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {/* -------------------- Actions -------------------- */}
      <Pressable style={styles.primaryBtn} onPress={onSave}>
        <Text style={styles.primaryBtnText}>Save Settings</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
        <Text style={styles.secondaryBtnText}>Cancel</Text>
      </Pressable>
    </Screen>
  );
}

/* =========================================================
   Small Reusable Section Header
========================================================= */

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
      </View>

      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.gold,
    marginBottom: 4,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.navy,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 20,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  emptyCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionEmoji: {
    fontSize: 18,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.navy,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.navy,
    marginBottom: 8,
  },

  helper: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 18,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: COLORS.inputBg,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.navy,
    marginBottom: 12,
  },

  toggleRow: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  toggleTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.navy,
  },

  toggleSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 17,
  },

  securityCard: {
    marginTop: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  securityIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  securityEmoji: {
    fontSize: 22,
  },

  securityTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.navy,
  },

  securitySub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 17,
  },

  chevron: {
    fontSize: 34,
    fontWeight: "300",
    color: COLORS.gold,
    marginLeft: 8,
  },

  primaryBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navy,
    marginTop: 18,
  },

  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryBtn: {
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
    marginBottom: 20,
  },

  secondaryBtnText: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});