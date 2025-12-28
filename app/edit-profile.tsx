// app/edit-profile.tsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { getProfile, upsertProfile } from "../src/storage/repositories/profileRepo";
import { t } from "../src/i18n";
import { useLang } from "../src/i18n/useLang";

export default function EditProfile() {
  const router = useRouter();
  const existing = getProfile();

  const [name, setName] = useState(existing?.userName ?? "");
  const canSave = useMemo(() => name.trim().length >= 2, [name]);

  // ✅ MUST be async because upsertProfile/saveProfile is async
  const onSave = async () => {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      Alert.alert("Name required", "Please enter at least 2 characters.");
      return;
    }

    // ✅ Safety check (profile should exist after onboarding)
    if (!existing) {
      Alert.alert("Profile missing", "Please create your profile first.");
      router.replace("/profile");
      return;
    }

    // ✅ upsertProfile expects a FULL profile object (not string)
    await upsertProfile({
      ...existing,
      userName: trimmed,
    });

    Alert.alert("Saved", "Name updated ✅", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "white",
            marginBottom: 10,
          }}
        >
          Edit Name
        </Text>

        <Text style={{ fontSize: 14, color: "#B8C0CC", marginBottom: 18 }}>
          This will update the name shown on the Home screen.
        </Text>

        <Text style={{ color: "#B8C0CC", marginBottom: 8 }}>Your name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Shiva"
          placeholderTextColor="#6B7280"
          autoCapitalize="words"
          autoCorrect={false}
          style={{
            backgroundColor: "#111827",
            color: "white",
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#1F2937",
            marginBottom: 16,
            fontSize: 16,
          }}
        />

        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave}
          style={{
            opacity: canSave ? 1 : 0.5,
            backgroundColor: "#2563EB",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            Save
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 10,
            backgroundColor: "#111827",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#1F2937",
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
