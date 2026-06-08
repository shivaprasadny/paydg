// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initLanguage, t } from "../src/i18n";
import { useLang } from "../src/i18n/useLang";

import { migrate } from "../src/storage/migrations";
import { hydrateProfile } from "../src/storage/repositories/profileRepo";
import { hydrateWorkplaces } from "../src/storage/repositories/workplaceRepo";
import { hydrateRoles } from "../src/storage/repositories/roleRepo";
import { autoCloseIfNeeded } from "../src/storage/repositories/punchRepo";

import LockScreen from "../src/screens/LockScreen";
import { isPinEnabled } from "../src/services/securityService";

/**
 * RootLayout
 *
 * This is the main Expo Router layout.
 * It starts the app, loads local data, checks PIN status,
 * and shows LockScreen if PIN is enabled.
 */
export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  /**
   * PIN states:
   * - pinEnabled means user turned on PIN lock.
   * - unlocked means user already entered correct PIN in this session.
   */
  const [pinEnabled, setPinEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Re-render screen titles when language changes.
  useLang();

  useEffect(() => {
    bootApp();
  }, []);

  /**
   * App startup logic.
   * Keep all startup/hydration work in one place.
   */
  async function bootApp() {
    try {
      await initLanguage();

      // Local storage migrations.
      migrate();

      // Auto-close active shift if needed.
      await autoCloseIfNeeded();

      // Load saved local data into memory.
      await hydrateProfile();
      await hydrateWorkplaces();
      await hydrateRoles();

      // Check PIN status after app data is ready.
      const enabled = await isPinEnabled();

      setPinEnabled(enabled);
      setUnlocked(!enabled);
    } catch (e: any) {
      console.error("Boot error:", e);
      setBootError(e?.message ?? "Unknown startup error");
    } finally {
      setReady(true);
    }
  }

  return (
    <SafeAreaProvider>
      {!ready ? (
        /**
         * Loading screen.
         * Updated to PayDG light premium theme.
         */
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F6F7FB",
            padding: 24,
          }}
        >
          <Text
            style={{
              color: "#0F172A",
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            {t("loading") ?? "Loading..."}
          </Text>
        </View>
      ) : bootError ? (
        /**
         * Boot error screen.
         */
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F6F7FB",
            padding: 24,
          }}
        >
          <Text
            style={{
              color: "#0F172A",
              fontSize: 20,
              fontWeight: "900",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Something went wrong
          </Text>

          <Text
            style={{
              color: "#64748B",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 16,
              lineHeight: 20,
              fontWeight: "700",
            }}
          >
            The app couldn’t start properly.{"\n"}Please restart the app.
          </Text>

          <Text
            style={{
              color: "#94A3B8",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Error: {bootError}
          </Text>
        </View>
      ) : pinEnabled && !unlocked ? (
        /**
         * If PIN is enabled and user is not unlocked,
         * show lock screen before app screens.
         */
        <LockScreen onUnlocked={() => setUnlocked(true)} />
      ) : (
        /**
         * Main app screens.
         * Expo Router automatically connects these names
         * to files inside the /app folder.
         */
        <Stack
          screenOptions={{
            headerShown: true,
            contentStyle: { backgroundColor: "#F6F7FB" },
            headerStyle: { backgroundColor: "#FFFFFF" },
            headerTintColor: "#0F172A",
            headerTitleStyle: { fontWeight: "900" },
          }}
        >
          <Stack.Screen name="index" options={{ title: t("home") }} />

          <Stack.Screen
            name="add-shift"
            options={{ title: t("add_shift_title") }}
          />

          <Stack.Screen
            name="edit-shift"
            options={{ title: t("edit_shift_title") }}
          />

          <Stack.Screen
            name="entries"
            options={{ title: t("entries_title") }}
          />

          <Stack.Screen
            name="history"
            options={{ title: t("history_title") }}
          />

          <Stack.Screen name="stats" options={{ title: t("stats_title") }} />

          <Stack.Screen
            name="workplaces"
            options={{ title: t("workplaces_title") }}
          />

          <Stack.Screen name="roles" options={{ title: t("roles_title") }} />

          <Stack.Screen
            name="settings"
            options={{ title: t("settings_title") }}
          />

          <Stack.Screen name="about" options={{ title: t("about_btn") }} />

          <Stack.Screen
            name="profile"
            options={{ title: t("profile_title") }}
          />

          <Stack.Screen
            name="edit-profile"
            options={{ title: t("edit_profile_title") }}
          />

          <Stack.Screen
            name="edit-role"
            options={{ title: t("edit_role_title") }}
          />

          <Stack.Screen
            name="edit-workplace"
            options={{ title: t("edit_workplace_title") }}
          />

          <Stack.Screen
            name="day-details"
            options={{ title: t("day_details_title") }}
          />

          <Stack.Screen
            name="week-details"
            options={{ title: t("week_details_title") }}
          />

          <Stack.Screen name="security" options={{ title: "Security" }} />
        </Stack>
      )}
    </SafeAreaProvider>
  );
}