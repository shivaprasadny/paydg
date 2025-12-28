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

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // ✅ Re-render titles when language changes
  useLang();

  useEffect(() => {
    (async () => {
      try {
        // ✅ If migrate is async in your codebase, await it. If not, it's fine.
        await Promise.resolve(migrate());

        await autoCloseIfNeeded();
        await hydrateProfile();
        await hydrateWorkplaces();
        await hydrateRoles();

        // ✅ init language after storage is ready
        await initLanguage();
      } catch (e) {
        console.log("Boot error:", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0F1A" }}>
          <Text style={{ color: "white" }}>{t("loading")}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: true, // ✅ show headers (so titles work)
          contentStyle: { backgroundColor: "#0B0F1A" },
          headerStyle: { backgroundColor: "#0B0F1A" },
          headerTintColor: "white",
          headerTitleStyle: { fontWeight: "800" },
        }}
      >
        <Stack.Screen name="index" options={{ title: t("home") }} />

        <Stack.Screen name="add-shift" options={{ title: t("add_shift_title") }} />
        <Stack.Screen name="edit-shift" options={{ title: t("edit_shift_title") }} />

        <Stack.Screen name="entries" options={{ title: t("entries_title") }} />
        <Stack.Screen name="history" options={{ title: t("history_title") }} />
        <Stack.Screen name="stats" options={{ title: t("stats_title") }} />

        <Stack.Screen name="workplaces" options={{ title: t("workplaces_title") }} />
        <Stack.Screen name="roles" options={{ title: t("roles_title") }} />

        <Stack.Screen name="settings" options={{ title: t("settings_title") }} />
        <Stack.Screen name="about" options={{ title: t("about_btn") }} />

        {/* If you use these routes */}
        <Stack.Screen name="profile" options={{ title: t("profile_title") }} />
        <Stack.Screen name="edit-profile" options={{ title: t("edit_profile_title") }} />
        <Stack.Screen name="edit-role" options={{ title: t("edit_role_title") }} />
        <Stack.Screen name="edit-workplace" options={{ title: t("edit_workplace_title") }} />

        <Stack.Screen name="day-details" options={{ title: t("day_details_title") }} />
        <Stack.Screen name="week-details" options={{ title: t("week_details_title") }} />

        <Stack.Screen name="more" options={{ title: t("more_title") }} />
      </Stack>
    </SafeAreaProvider>
  );
}
