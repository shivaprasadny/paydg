// src/screens/backup.tsx
// ---------------------------------------------------------
// PayDG — Backup / Restore / Reset (Expo SDK 54+ safe)
// ✅ Backup all AsyncStorage keys to a JSON file + share
// ✅ Restore from a JSON file
// ✅ Reset app (delete all stored keys)
// ---------------------------------------------------------
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

import React, { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ IMPORTANT (Expo SDK 54+): use legacy FileSystem API
import * as FileSystem from "expo-file-system/legacy";

import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";

// If you have hydrators in your repos, keep these.
// If you DON'T have them, you can remove imports + calls safely.
import { hydrateProfile } from "../storage/repositories/profileRepo";
import { hydrateWorkplaces } from "../storage/repositories/workplaceRepo";
import { hydrateRoles } from "../storage/repositories/roleRepo";
import Screen from "../components/Screen";

// --- Keys we backup / restore / reset ---
const KEYS = {
  shifts: "paydg_shifts_v1",
  profile: "paydg_profile_v1",
  workplaces: "paydg_workplaces_v1",
  roles: "paydg_roles_v1",
  lang: "paydg_lang_v1",

  // legacy/optional (safe to include)
  settings: "paydg_settings_v1",
};

type BackupPayload = {
  version: number;
  exportedAt: string;
  app: string;
  data: Record<string, any>;
};

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function safeParse(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // if not JSON, keep as string
  }
}

/**
 * In Expo Go / device builds, one of these should exist.
 * (Legacy FS API exposes both constants.)
 */
function getWritableDir(): string | null {
  return FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? null;
}

export default function BackupScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  /* ---------------------------------------------------------
     BACKUP
  --------------------------------------------------------- */
  async function doBackup() {
    try {
      setBusy(true);

      // Read all keys
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

      const json = JSON.stringify(payload, null, 2);

      const dir = getWritableDir();
      if (!dir) {
        throw new Error(
          "No writable directory available. Try running on a device (not web), or a dev build."
        );
      }

      const fileUri = `${dir}paydg-backup-${nowStamp()}.json`;

      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();

      // If share isn't available, still show file path
      if (!canShare) {
        Alert.alert("Backup created ✅", `Saved to:\n${fileUri}`);
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

  /* ---------------------------------------------------------
     RESTORE
  --------------------------------------------------------- */
  async function doRestore() {
    try {
      setBusy(true);

      // Pick JSON file
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (picked.canceled) return;

      const file = picked.assets?.[0];
      if (!file?.uri) throw new Error("No file selected.");

      const raw = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      let payload: BackupPayload;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new Error("This file is not valid JSON.");
      }

      // Basic validation
      if (!payload || payload.app !== "PayDG" || !payload.data) {
        throw new Error("This is not a PayDG backup file.");
      }

      // Confirm overwrite
      await new Promise<void>((resolve, reject) => {
        Alert.alert(
          "Restore backup?",
          "This will overwrite your current data.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => reject(new Error("Cancelled")),
            },
            {
              text: "Restore",
              style: "destructive",
              onPress: () => resolve(),
            },
          ]
        );
      });

      // Convert to AsyncStorage key/value pairs
      const pairs: [string, string][] = [];
      for (const key of Object.values(KEYS)) {
        const value = payload.data[key];
        if (value === undefined) continue;
        pairs.push([key, JSON.stringify(value)]);
      }

      await AsyncStorage.multiSet(pairs);

      // Re-hydrate caches so UI updates without restart
      try {
        await hydrateProfile();
        await hydrateWorkplaces();
        await hydrateRoles();
      } catch {
        // ok
      }

      Alert.alert(
        "Restored ✅",
        "Backup restored. If something still looks old, fully close and reopen the app.",
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    } catch (e: any) {
      if (String(e?.message).includes("Cancelled")) return;
      Alert.alert("Restore failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------
     RESET
  --------------------------------------------------------- */
  function doReset() {
    Alert.alert(
      "Reset PayDG?",
      "This will DELETE all your shifts, workplaces, roles, and profile. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);

              await AsyncStorage.multiRemove(Object.values(KEYS));

              // Re-hydrate caches to empty
              try {
                await hydrateProfile();
                await hydrateWorkplaces();
                await hydrateRoles();
              } catch {}

              Alert.alert("Reset done ✅", "App data cleared.", [
                { text: "OK", onPress: () => router.replace("/profile") },
              ]);
            } catch (e: any) {
              Alert.alert("Reset failed", e?.message ?? "Something went wrong.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
              <ActiveShiftTimerCard />
        
        <Text style={styles.title}>Backup & Restore</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backup</Text>
          <Text style={styles.helper}>
            Create a JSON backup file and share it (Files / iCloud / email / etc).
          </Text>

          <Pressable style={styles.btn} onPress={doBackup} disabled={busy}>
            <Text style={styles.btnText}>
              {busy ? "Please wait..." : "Create Backup (Share)"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Restore</Text>
          <Text style={styles.helper}>
            Restore from a backup JSON file. This overwrites current data.
          </Text>

          <Pressable style={styles.btn} onPress={doRestore} disabled={busy}>
            <Text style={styles.btnText}>
              {busy ? "Please wait..." : "Restore From File"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.cardTitle}>Danger Zone</Text>
          <Text style={styles.helper}>
            Reset deletes all PayDG data on this device. Backup first if you need it.
          </Text>

          <Pressable
            style={[styles.btn, { backgroundColor: "#b91c1c" }]}
            onPress={doReset}
            disabled={busy}
          >
            <Text style={styles.btnText}>
              {busy ? "Please wait..." : "Reset App Data"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.btn, { backgroundColor: "#e5e5e5" }]}
          onPress={() => router.back()}
          disabled={busy}
        >
          <Text style={[styles.btnText, { color: "#111" }]}>Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 12 },

  title: { fontSize: 28, fontWeight: "900" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },

  dangerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    gap: 10,
  },

  cardTitle: { fontSize: 16, fontWeight: "800" },
  helper: { fontSize: 12, opacity: 0.7, lineHeight: 16 },

  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
