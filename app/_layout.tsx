// app/_layout.tsx
import { Stack } from "expo-router";
import { migrate } from "../src/storage/migrations";
import { hydrateProfile } from "../src/storage/repositories/profileRepo";

// Run migrations + hydrate BEFORE screens render
try {
  migrate();
  hydrateProfile();
} catch (e) {
  console.log("Startup failed:", e);
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
      }}
    >
      {/* ✅ Change "index" header title to "Home" */}
      <Stack.Screen name="index" options={{ title: "Home" }} />

      {/* Optional: nice titles for other screens */}
      <Stack.Screen name="add-shift" options={{ title: "Add Shift" }} />
      <Stack.Screen name="edit-shift" options={{ title: "Edit Shift" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen name="stats" options={{ title: "Stats" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="workplaces" options={{ title: "Workplaces" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit Profile" }} />
    </Stack>
  );
}
