// src/screens/backup.tsx
// ---------------------------------------------------------
// PayDG — Backup / Restore / Reset
// ---------------------------------------------------------

import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";

import Screen from "../components/Screen";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

import { hydrateProfile } from "../storage/repositories/profileRepo";
import { hydrateWorkplaces } from "../storage/repositories/workplaceRepo";
import { hydrateRoles } from "../storage/repositories/roleRepo";

// ---------------- Keys ----------------
const KEYS = {
  shifts: "paydg_shifts_v1",
  profile: "paydg_profile_v1",
  workplaces: "paydg_workplaces_v1",
  roles: "paydg_roles_v1",
  lang: "paydg_lang_v1",
  settings: "paydg_settings_v1",
};

type BackupPayload = {
  version: number;
  exportedAt: string;
  app: string;
  data: Record<string, any>;
};

// ---------------- Helpers ----------------
function nowStamp() {
  const d = new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0") +
    "-" +
    String(d.getHours()).padStart(2, "0") +
    String(d.getMinutes()).padStart(2, "0")
  );
}

async function safeParse(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function getWritableDir() {
  return FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? null;
}

// =========================================================
export default function BackupScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // ---------------- BACKUP ----------------
  async function doBackup() {
    try {
      setBusy(true);

      const entries = await AsyncStorage.multiGet(Object.values(KEYS));
      const data: Record<string, any> = {};

      for (const [key, raw] of entries) {
        data[key] = await safeParse(raw);
      }

      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: "PayDG",
        data,
      };

      const dir = getWritableDir();
      if (!dir) throw new Error("No writable directory available.");

      const fileUri = `${dir}paydg-backup-${nowStamp()}.json`;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Backup created", `Saved to:\n${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Share PayDG backup",
      });
    } catch (e: any) {
      Alert.alert("Backup failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // ---------------- RESTORE ----------------
  async function doRestore() {
    try {
      setBusy(true);

      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/json"],
        copyToCacheDirectory: true,
      });

      if (picked.canceled) return;

      const file = picked.assets?.[0];
      if (!file?.uri) throw new Error("No file selected.");

      const raw = await FileSystem.readAsStringAsync(file.uri);
      const payload: BackupPayload = JSON.parse(raw);

      if (payload.app !== "PayDG" || !payload.data) {
        throw new Error("Invalid PayDG backup file.");
      }

      await new Promise<void>((resolve, reject) => {
        Alert.alert(
          "Restore backup?",
          "This will overwrite your current data.",
          [
            { text: "Cancel", style: "cancel", onPress: () => reject() },
            { text: "Restore", style: "destructive", onPress: () => resolve() },
          ]
        );
      });

      const pairs: [string, string][] = [];
      for (const key of Object.values(KEYS)) {
        if (payload.data[key] !== undefined) {
          pairs.push([key, JSON.stringify(payload.data[key])]);
        }
      }

      await AsyncStorage.multiSet(pairs);

      await hydrateProfile();
      await hydrateWorkplaces();
      await hydrateRoles();

      Alert.alert("Restored", "Backup restored successfully.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (e: any) {
      if (String(e?.message).includes("cancel")) return;
      Alert.alert("Restore failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // ---------------- RESET ----------------
  function doReset() {
    Alert.alert(
      "Reset PayDG?",
      "This will delete ALL your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              await AsyncStorage.multiRemove(Object.values(KEYS));
              await hydrateProfile();
              await hydrateWorkplaces();
              await hydrateRoles();
              Alert.alert("Reset complete", "All data deleted.", [
                { text: "OK", onPress: () => router.replace("/profile") },
              ]);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  // ---------------- UI ----------------
  return (
    <Screen pad={16}>
      <ActiveShiftTimerCard />

      <Text style={styles.title}>Backup & Restore</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backup</Text>
        <Text style={styles.helper}>
          Create a JSON backup and share it (Files, iCloud, email).
        </Text>

        <Pressable style={styles.btn} onPress={doBackup} disabled={busy}>
          <Text style={styles.btnText}>{busy ? "Please wait…" : "Create Backup"}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Restore</Text>
        <Text style={styles.helper}>
          Restore from a backup file. This replaces current data.
        </Text>

        <Pressable style={styles.btn} onPress={doRestore} disabled={busy}>
          <Text style={styles.btnText}>{busy ? "Please wait…" : "Restore Backup"}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { borderColor: "#fecaca" }]}>
        <Text style={styles.cardTitle}>Danger Zone</Text>
        <Text style={styles.helper}>
          Reset deletes ALL PayDG data on this device.
        </Text>

        <Pressable
          style={[styles.btn, { backgroundColor: "#b91c1c" }]}
          onPress={doReset}
          disabled={busy}
        >
          <Text style={styles.btnText}>Reset App Data</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.btn, { backgroundColor: "#e5e5e5" }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.btnText, { color: "#111" }]}>Back</Text>
      </Pressable>
    </Screen>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", marginBottom: 6 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
    marginBottom: 12,
  },

  cardTitle: { fontSize: 16, fontWeight: "800" },
  helper: { fontSize: 12, opacity: 0.7, lineHeight: 16 },

  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
