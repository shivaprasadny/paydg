// app/profile.tsx
// ---------------------------------------------------------
// PayDG — Profile / Onboarding Step 1
// ✅ Ask user name
// ✅ Skip option
// ✅ Premium PayDG light theme
// ✅ Android/iOS keyboard-safe layout
// ✅ Goes to workplace onboarding next
// ---------------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import Screen from "../src/components/Screen";

import {
  getProfile,
  upsertProfile,
} from "../src/storage/repositories/profileRepo";

import { t } from "../src/i18n";
import { useLang } from "../src/i18n/useLang";

export default function ProfileScreen() {
  const router = useRouter();
  const existing = getProfile();

  // Re-render when language changes.
  useLang();

  const [name, setName] = useState(existing?.userName ?? "");

  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  async function saveProfile(userName: string) {
    await upsertProfile({
      userName,
      defaultHourlyWage: existing?.defaultHourlyWage ?? 0,
      defaultBreakMinutes: existing?.defaultBreakMinutes ?? 30,
      defaultUnpaidBreak: existing?.defaultUnpaidBreak ?? true,
    } as any);
  }

  async function onContinue() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      Alert.alert(
        t("name_required") ?? "Name required",
        t("name_required_msg") ?? "Please enter at least 2 characters."
      );
      return;
    }

    await saveProfile(trimmed);

    // Step 2: workplace onboarding
    router.replace("/workplaces?onboarding=1");
  }

  async function onSkip() {
    await saveProfile(existing?.userName ?? "Guest");

    // Step 2: workplace onboarding
    router.replace("/workplaces?onboarding=1");
  }

  return (
    <Screen bg="#F6F7FB" pad={0} safeTop>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.container}
          >

            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>Step 1 of 3</Text>
              <Text style={styles.title}>Welcome to PayDG 👋</Text>
              <Text style={styles.subtitle}>
                Let’s personalize your dashboard. You can change this later.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧑 Your name</Text>
              <Text style={styles.cardSubtitle}>
                This name will show on your Home screen.
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Shiva"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
              />

              <Text style={styles.tipText}>
                💡 Use the name your coworkers call you.
              </Text>
            </View>

            <TouchableOpacity
              onPress={onContinue}
              disabled={!canSave}
              activeOpacity={0.85}
              style={[styles.primaryBtn, !canSave && styles.disabledBtn]}
            >
              <Text style={styles.primaryText}>Continue to Workplace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSkip}
              activeOpacity={0.85}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Skip for now</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Next: workplace and role setup.
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 56,
    gap: 14,
  },

  heroCard: {
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
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },

  input: {
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
    fontWeight: "800",
  },

  tipText: {
    color: "#92400E",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
    borderRadius: 16,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },

  primaryBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "900",
  },

  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
  },
});