// src/screens/settings.tsx
// ---------------------------------------------------------
// PayDg — Settings (Profile based)
// ✅ Edit user name (shows on Home)
// ✅ Default hourly wage / break minutes / unpaid break
// ✅ Saves into Profile (AsyncStorage via profileRepo)
// ---------------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
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

  // If profile doesn't exist, user should complete onboarding first
  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.helper}>Please complete your profile first.</Text>

          <Pressable style={styles.saveBtn} onPress={() => router.push("/profile")}>
            <Text style={styles.saveBtnText}>Go to Profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Load initial values from profile
  const initial = useMemo(() => {
    return {
      userName: profile.userName ?? "",
      defaultHourlyWage: String(profile.defaultHourlyWage ?? 0),
      defaultBreakMinutes: String(profile.defaultBreakMinutes ?? 30),
      defaultUnpaidBreak: profile.defaultUnpaidBreak ?? true,
    };
  }, [profile]);

  const [userName, setUserName] = useState(initial.userName);
  const [defaultHourlyWageText, setDefaultHourlyWageText] = useState(initial.defaultHourlyWage);
  const [defaultBreakMinutesText, setDefaultBreakMinutesText] = useState(initial.defaultBreakMinutes);
  const [defaultUnpaidBreak, setDefaultUnpaidBreak] = useState(initial.defaultUnpaidBreak);

  const wage = useMemo(() => parseMoney(defaultHourlyWageText), [defaultHourlyWageText]);
  const breakMinutes = useMemo(
    () => Math.min(240, Math.max(0, parseIntSafe(defaultBreakMinutesText, 30))),
    [defaultBreakMinutesText]
  );

  // ✅ MUST be async because saveProfile is async
  const onSave = async () => {
    const name = userName.trim();
    if (name.length < 2) {
      Alert.alert("Name", "Please enter at least 2 characters.");
      return;
    }

    // ✅ Build next profile object (keep ids/dates)
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

                <ActiveShiftTimerCard />
        <Text style={styles.title}>Settings</Text>

        {/* -------------------- User -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User</Text>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="e.g. Shiva"
            style={styles.input}
          />
        </View>

        {/* -------------------- Defaults -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Defaults for Add Shift</Text>

          <Text style={styles.label}>Default hourly wage</Text>
          <TextInput
            value={defaultHourlyWageText}
            onChangeText={setDefaultHourlyWageText}
            keyboardType="decimal-pad"
            placeholder="e.g. 15"
            style={styles.input}
          />

          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={styles.label}>Default: deduct unpaid break</Text>
            <Switch value={defaultUnpaidBreak} onValueChange={setDefaultUnpaidBreak} />
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Default break minutes</Text>
          <TextInput
            value={defaultBreakMinutesText}
            onChangeText={setDefaultBreakMinutesText}
            keyboardType="number-pad"
            placeholder="30"
            style={styles.input}
          />

          <Text style={styles.helper}>
            These values auto-fill the Add Shift screen.
          </Text>
        </View>

        {/* -------------------- Actions -------------------- */}
        <Pressable style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: "#e5e5e5" }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.saveBtnText, { color: "#111" }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 14 },
  title: { fontSize: 28, fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },

  label: { fontSize: 13, opacity: 0.7, marginBottom: 6 },
  helper: { fontSize: 12, opacity: 0.6 },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    fontSize: 16,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
