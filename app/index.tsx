// app/index.tsx
import React, { useCallback, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { Redirect, useRouter, useFocusEffect } from "expo-router";

import { getProfile } from "../src/storage/repositories/profileRepo";
import { listWorkplaces } from "../src/storage/repositories/workplaceRepo";

/* ---------------------------------------------------------
   Simple reusable navigation button
--------------------------------------------------------- */
function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#1F2937",
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
      }}
    >
      <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function Home() {
  const router = useRouter();

  // ✅ keep them in state so screen updates after Settings/Profile changes
  const [profile, setProfile] = useState(getProfile());
  const [workplaces, setWorkplaces] = useState(listWorkplaces());

  // ✅ Reload when user comes back to Home (from settings/edit-profile/etc.)
  useFocusEffect(
    useCallback(() => {
      setProfile(getProfile());
      setWorkplaces(listWorkplaces());
    }, [])
  );

  // Onboarding guard
  if (!profile) return <Redirect href="/profile" />;
  if (workplaces.length === 0) return <Redirect href="/workplaces" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      <View style={{ padding: 20 }}>
        {/* -------------------- Greeting -------------------- */}
        <Text style={{ color: "white", fontSize: 28, fontWeight: "800" }}>
          Hi {profile.userName} 👋
        </Text>

        <Text style={{ color: "#B8C0CC", marginTop: 8 }}>
          You’re set! Workplaces: {workplaces.length}
        </Text>

        {/* -------------------- Buttons -------------------- */}
        <View style={{ marginTop: 18 }}>
          <NavButton label="➕ Add Shift" onPress={() => router.push("/add-shift")} />
          <NavButton label="🧾 History" onPress={() => router.push("/history")} />
          <NavButton label="📊 Stats" onPress={() => router.push("/stats")} />
          <NavButton label="🏢 Manage Workplaces" onPress={() => router.push("/workplaces")} />
          <NavButton label="⚙️ Settings" onPress={() => router.push("/settings")} />
        </View>

        <Text style={{ color: "#6B7280", marginTop: 18, fontSize: 12 }}>
          Tip: Set your default wage/break in Settings — Add Shift will auto-fill.
        </Text>
      </View>
    </SafeAreaView>
  );
}
