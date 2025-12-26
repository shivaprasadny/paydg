// src/screens/settings.tsx
// ---------------------------------------------------------
// PayDG — Settings
// ✅ Edit name
// ✅ Defaults for Add Shift
// ✅ Language toggle (English / Español)
// ✅ Reactive re-render when language changes
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
import { getLanguage, setLanguage, t } from "../i18n";
import { useLang } from "../i18n/useLang";

/* Helpers */
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

export default function SettingsScreen() {
  const router = useRouter();

  // ✅ Forces re-render when language changes
  useLang();

  const profile = getProfile();
  const [lang, setLangState] = useState<"en" | "es">(getLanguage());

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>{t("settings_title")}</Text>
          <Text style={styles.helper}>Please complete your profile first.</Text>

          <Pressable style={styles.saveBtn} onPress={() => router.push("/profile")}>
            <Text style={styles.saveBtnText}>Go to Profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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

  const onSave = async () => {
    const name = userName.trim();
    if (name.length < 2) {
      Alert.alert(t("name_required"), t("name_required_msg"));
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

    // ✅ Save language selection
    await setLanguage(lang);

    Alert.alert(t("saved"), "✅", [{ text: "OK", onPress: () => router.back() }]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t("settings_title")}</Text>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("language")}</Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setLangState("en")}
              style={[styles.chip, lang === "en" && styles.chipActive]}
            >
              <Text style={[styles.chipText, lang === "en" && styles.chipTextActive]}>
                {t("english")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLangState("es")}
              style={[styles.chip, lang === "es" && styles.chipActive]}
            >
              <Text style={[styles.chipText, lang === "es" && styles.chipTextActive]}>
                {t("spanish")}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.helper}>
            Tip: Go back to Home to see language change everywhere.
          </Text>
        </View>

        {/* User */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("user")}</Text>
          <Text style={styles.label}>{t("your_name")}</Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="e.g. Shiva"
            style={styles.input}
          />
        </View>

        {/* Defaults */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("defaults_for_add_shift")}</Text>

          <Text style={styles.label}>{t("default_hourly_wage")}</Text>
          <TextInput
            value={defaultHourlyWageText}
            onChangeText={setDefaultHourlyWageText}
            keyboardType="decimal-pad"
            placeholder="e.g. 15"
            style={styles.input}
          />

          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={styles.label}>{t("default_deduct_unpaid_break")}</Text>
            <Switch value={defaultUnpaidBreak} onValueChange={setDefaultUnpaidBreak} />
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>{t("default_break_minutes")}</Text>
          <TextInput
            value={defaultBreakMinutesText}
            onChangeText={setDefaultBreakMinutesText}
            keyboardType="number-pad"
            placeholder="30"
            style={styles.input}
          />

          <Text style={styles.helper}>{t("defaults_helper")}</Text>
        </View>

        <Pressable style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>{t("save")}</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: "#e5e5e5" }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.saveBtnText, { color: "#111" }]}>{t("cancel")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

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

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
});
