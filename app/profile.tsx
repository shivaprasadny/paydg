// app/profile.tsx
import React, { useMemo, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import Screen from "../src/components/Screen";
import ActiveShiftTimerCard from "../src/components/ActiveShiftTimerCard";

import { getProfile, upsertProfile } from "../src/storage/repositories/profileRepo";
import { t } from "../src/i18n";
import { useLang } from "../src/i18n/useLang";

export default function ProfileScreen() {
  const router = useRouter();
  const existing = getProfile();

  // ✅ rerender when language changes
  useLang();

  const [name, setName] = useState(existing?.userName ?? "");

  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  const onSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert(t("name_required") ?? "Name required", t("name_required_msg") ?? "Please enter at least 2 characters.");
      return;
    }

    const nextProfile = {
      userName: trimmed,
      defaultHourlyWage: existing?.defaultHourlyWage ?? 0,
      defaultBreakMinutes: existing?.defaultBreakMinutes ?? 30,
      defaultUnpaidBreak: existing?.defaultUnpaidBreak ?? true,
    };

    await upsertProfile(nextProfile as any);

    Alert.alert(t("saved") ?? "Saved", t("profile_created") ?? "Profile created ✅", [
      { text: "OK", onPress: () => router.replace("/") },
    ]);
  };

  return (
    <Screen pad={20} safeTop>
      <ActiveShiftTimerCard />

      <View style={{ gap: 12, paddingTop: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: "white" }}>
          {t("profile_create_title") ?? "Create Profile"}
        </Text>

        <Text style={{ fontSize: 14, color: "#B8C0CC" }}>
          {t("profile_create_sub") ?? "This name will show on the Home screen."}
        </Text>

        <View
          style={{
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1F2937",
            borderRadius: 16,
            padding: 14,
            marginTop: 6,
            gap: 8,
          }}
        >
          <Text style={{ color: "#B8C0CC", fontSize: 13 }}>
            {t("your_name") ?? "Your name"}
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("name_placeholder") ?? "e.g., Shiva"}
            placeholderTextColor="#6B7280"
            autoCapitalize="words"
            autoCorrect={false}
            style={{
              backgroundColor: "#0B0F1A",
              color: "white",
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#1F2937",
              fontSize: 16,
            }}
          />

          <Text style={{ color: "#6B7280", fontSize: 12, lineHeight: 16 }}>
            {t("profile_tip") ?? "Tip: Use the name your coworkers call you 😄"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave}
          style={{
            opacity: canSave ? 1 : 0.5,
            backgroundColor: "#2563EB",
            padding: 14,
            borderRadius: 14,
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
            {t("save") ?? "Save"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "#111827",
            padding: 14,
            borderRadius: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#1F2937",
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>
            {t("cancel") ?? "Cancel"}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
