import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { initLanguage } from "../src/i18n";
import { migrate } from "../src/storage/migrations";
import { hydrateProfile } from "../src/storage/repositories/profileRepo";
import { hydrateWorkplaces } from "../src/storage/repositories/workplaceRepo";
import { hydrateRoles } from "../src/storage/repositories/roleRepo";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        migrate();
        await hydrateProfile();
        await hydrateWorkplaces();
        await hydrateRoles();
        await initLanguage();
      } catch (e) {
        console.log("Boot error:", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // ✅ Prevent redirect loop before caches are ready
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
  <Stack screenOptions={{ headerShown: true }}>
    <Stack.Screen name="index" options={{ title: "Home" }} />
    <Stack.Screen name="workplaces" options={{ title: "Workplaces" }} />
    <Stack.Screen name="edit-workplace" options={{ title: "Edit Workplace" }} />
    <Stack.Screen name="roles" options={{ title: "Roles" }} />
    <Stack.Screen name="edit-role" options={{ title: "Edit Role" }} />
  </Stack>
);
}
