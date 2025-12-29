// src/screens/edit-profile.tsx
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import Screen from "../components/Screen";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import { getProfile, upsertProfile } from "../storage/repositories/profileRepo";
import type { Profile } from "../models/Profile";

function parseMoney(s: string) {
  const cleaned = s.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(s: string, fallback: number) {
  const cleaned = s.replace(/[^0-9]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export default function EditProfileScreen() {
  useLang();
  const router = useRouter();

  const existing = getProfile();

  const initial = useMemo(() => {
    return {
      userName: existing?.userName ?? "",
      useDefaults:
        existing?.defaultHourlyWage != null ||
        existing?.defaultBreakMinutes != null ||
        existing?.defaultUnpaidBreak != null,

      wage: existing?.defaultHourlyWage != null ? String(existing.defaultHourlyWage) : "",
      breakMinutes:
        existing?.defaultBreakMinutes != null ? String(existing.defaultBreakMinutes) : "",
      unpaid: existing?.defaultUnpaidBreak ?? true,
    };
  }, [existing]);

  const [userName, setUserName] = useState(initial.userName);
  const [useDefaults, setUseDefaults] = useState(initial.useDefaults);
  const [wageText, setWageText] = useState(initial.wage);
  const [breakText, setBreakText] = useState(initial.breakMinutes);
  const [unpaidBreak, setUnpaidBreak] = useState(initial.unpaid);

  async function onSave() {
    const nm = userName.trim();
    if (nm.length < 2) {
      Alert.alert("Name", "Please enter at least 2 characters.");
      return;
    }

    // Build the FULL Profile object because repo saves whole object
    const next: Profile = {
      userName: nm,

      // If defaults disabled -> store sensible values or keep old
      // (your ProfileScreen stores defaults always, so we’ll do the same)
      defaultHourlyWage: useDefaults
        ? parseMoney(wageText)
        : (existing?.defaultHourlyWage ?? 0),

      defaultBreakMinutes: useDefaults
        ? Math.min(240, Math.max(0, parseIntSafe(breakText, 30)))
        : (existing?.defaultBreakMinutes ?? 30),

      defaultUnpaidBreak: useDefaults ? unpaidBreak : (existing?.defaultUnpaidBreak ?? true),
      id: 1,
      createdAt: "",
      updatedAt: ""
    };

    await upsertProfile(next);

    Alert.alert("Saved", "Profile updated ✅", [{ text: "OK", onPress: () => router.back() }]);
  }

  return (
    <Screen bg="#f7f7f7" safeTop pad={16}>
      <ActiveShiftTimerCard />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Edit Profile</Text>
        <Pressable style={styles.smallBtn} onPress={() => router.back()}>
          <Text style={styles.smallBtnText}>Back</Text>
        </Pressable>
      </View>

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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Defaults</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Use defaults</Text>
          <Switch value={useDefaults} onValueChange={setUseDefaults} />
        </View>

        <Text style={styles.helper}>
          These values auto-fill when you add a shift (unless workplace/role overrides them).
        </Text>

        <View style={{ height: 10 }} />

        <Text style={styles.label}>Default hourly wage</Text>
        <TextInput
          value={wageText}
          onChangeText={setWageText}
          editable={useDefaults}
          keyboardType="decimal-pad"
          placeholder="0"
          style={[styles.input, !useDefaults && styles.inputDisabled]}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Default break minutes</Text>
        <TextInput
          value={breakText}
          onChangeText={setBreakText}
          editable={useDefaults}
          keyboardType="number-pad"
          placeholder="30"
          style={[styles.input, !useDefaults && styles.inputDisabled]}
        />

        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <Text style={styles.label}>Deduct unpaid break</Text>
          <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} disabled={!useDefaults} />
        </View>
      </View>

      <Pressable style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnText}>Save</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "900" },

  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  smallBtnText: { color: "#fff", fontWeight: "900" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
    marginTop: 10,
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
  inputDisabled: { opacity: 0.5 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
