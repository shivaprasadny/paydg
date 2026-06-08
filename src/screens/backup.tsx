// src/screens/backup.tsx
// ---------------------------------------------------------
// PayDG — Backup / Restore / Reset
// Premium light finance theme
//
// ✅ Create JSON backup
// ✅ Restore JSON backup
// ✅ Factory reset app data
// ✅ If PIN is enabled, reset requires PIN
// ✅ Reset also requires typing RESET
// ✅ Clean comments, emojis, spacing, premium cards
// ---------------------------------------------------------

import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
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

import { isPinEnabled, verifyPin } from "../services/securityService";

/* ---------------------------------------------------------
   PayDG Theme
--------------------------------------------------------- */

const COLORS = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  navy: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  inputBg: "#F8FAFC",
  gold: "#D97706",
  goldSoft: "#FFF7ED",
  goldBorder: "#FED7AA",
  green: "#059669",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
};

/* ---------------------------------------------------------
   AsyncStorage Keys
--------------------------------------------------------- */

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

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

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

/* =========================================================
   Screen
========================================================= */

export default function BackupScreen() {
  const router = useRouter();

  const [busy, setBusy] = useState(false);

  /**
   * Reset modal states.
   */
  const [showResetModal, setShowResetModal] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinText, setPinText] = useState("");
  const [resetText, setResetText] = useState("");

  /* ---------------------------------------------------------
     Create Backup
  --------------------------------------------------------- */

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

      if (!dir) {
        throw new Error("No writable directory available.");
      }

      const fileUri = `${dir}paydg-backup-${nowStamp()}.json`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(payload, null, 2),
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );

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

  /* ---------------------------------------------------------
     Restore Backup
  --------------------------------------------------------- */

  async function doRestore() {
    try {
      setBusy(true);

      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/json"],
        copyToCacheDirectory: true,
      });

      if (picked.canceled) return;

      const file = picked.assets?.[0];

      if (!file?.uri) {
        throw new Error("No file selected.");
      }

      const raw = await FileSystem.readAsStringAsync(file.uri);
      const payload: BackupPayload = JSON.parse(raw);

      if (payload.app !== "PayDG" || !payload.data) {
        throw new Error("Invalid PayDG backup file.");
      }

      Alert.alert(
        "Restore backup?",
        "This will overwrite your current PayDG data.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              await restorePayload(payload);
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Restore failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Restore selected backup data into AsyncStorage.
   */
  async function restorePayload(payload: BackupPayload) {
    try {
      setBusy(true);

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
      Alert.alert("Restore failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------
     Reset
  --------------------------------------------------------- */

  /**
   * Open reset modal.
   * If PIN is enabled, user must enter PIN before reset.
   */
  async function openResetModal() {
    const enabled = await isPinEnabled();

    setPinRequired(enabled);
    setPinText("");
    setResetText("");
    setShowResetModal(true);
  }

  /**
   * Factory reset all PayDG local app data.
   */
  async function handleFactoryReset() {
    Keyboard.dismiss();

    if (pinRequired) {
      const correct = await verifyPin(pinText);

      if (!correct) {
        Alert.alert("Wrong PIN", "Please enter the correct PIN.");
        return;
      }
    }

    if (resetText.trim() !== "RESET") {
      Alert.alert("Incorrect Confirmation", 'Please type "RESET" to continue.');
      return;
    }

    try {
      setBusy(true);

      await AsyncStorage.multiRemove(Object.values(KEYS));

      await hydrateProfile();
      await hydrateWorkplaces();
      await hydrateRoles();

      setShowResetModal(false);
      setPinText("");
      setResetText("");

      Alert.alert("Reset complete", "All PayDG data was deleted.", [
        { text: "OK", onPress: () => router.replace("/profile") },
      ]);
    } catch (e: any) {
      Alert.alert("Reset failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <Screen bg={COLORS.bg} pad={16}>
      <ActiveShiftTimerCard />

      {/* -------------------- Header -------------------- */}
      <View style={styles.header}>
        <Text style={styles.kicker}>PAYDG DATA CENTER</Text>
        <Text style={styles.title}>Backup & Reset</Text>
        <Text style={styles.subtitle}>
          Save, restore, or reset your local PayDG data safely.
        </Text>
      </View>

      {/* -------------------- Backup / Restore Card -------------------- */}
      <View style={styles.card}>
        <SectionHeader emoji="📦" title="Backup & Restore" />

        <ActionButton
          icon="☁️"
          title="Create JSON Backup"
          subtitle="Save your shifts, profile, workplaces, and roles."
          onPress={doBackup}
          disabled={busy}
        />

        <View style={styles.divider} />

        <ActionButton
          icon="♻️"
          title="Restore Backup"
          subtitle="Import a PayDG backup file from your phone."
          onPress={doRestore}
          disabled={busy}
        />
      </View>

      {/* -------------------- Danger Zone -------------------- */}
      <View style={styles.dangerCard}>
        <SectionHeader emoji="⚠️" title="Danger Zone" danger />

        <Text style={styles.dangerText}>
          Create a backup before resetting. Factory reset deletes all PayDG data
          on this device and cannot be undone.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.dangerButton,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
          onPress={openResetModal}
          disabled={busy}
        >
          <Text style={styles.dangerButtonText}>Factory Reset PayDG</Text>
          <Text style={styles.dangerButtonSubText}>
            Deletes shifts, profile, workplaces, roles, and settings
          </Text>
        </Pressable>
      </View>

      {/* -------------------- Back Button -------------------- */}
      <Pressable
        style={({ pressed }) => [
          styles.secondaryBtn,
          pressed && styles.pressed,
        ]}
        onPress={() => router.back()}
      >
        <Text style={styles.secondaryBtnText}>Back</Text>
      </Pressable>

      {/* -------------------- Reset Modal -------------------- */}
      <Modal visible={showResetModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />

              <Text style={styles.modalEmoji}>🧨</Text>
              <Text style={styles.modalTitle}>Factory Reset</Text>

              <Text style={styles.modalWarning}>
                This will delete all shifts, profile, workplaces, roles,
                language, and settings from this device.
              </Text>

              {pinRequired && (
                <>
                  <Text style={styles.modalInstruction}>
                    Enter your 4-digit PIN
                  </Text>

                  <TextInput
                    style={styles.pinInput}
                    placeholder="••••"
                    placeholderTextColor="#94A3B8"
                    value={pinText}
                    onChangeText={setPinText}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    returnKeyType="done"
                  />
                </>
              )}

              <Text style={styles.modalInstruction}>
                Type RESET below to confirm
              </Text>

              <TextInput
                style={styles.resetInput}
                placeholder="RESET"
                placeholderTextColor="#94A3B8"
                value={resetText}
                onChangeText={setResetText}
                autoCapitalize="characters"
              />

              <Pressable
                style={({ pressed }) => [
                  styles.modalResetButton,
                  resetText.trim() !== "RESET" && styles.disabled,
                  pressed && styles.pressed,
                ]}
                onPress={handleFactoryReset}
                disabled={busy}
              >
                <Text style={styles.modalResetButtonText}>
                  {busy ? "Please wait…" : "Delete Everything"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowResetModal(false);
                  setPinText("");
                  setResetText("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

/* =========================================================
   Small Components
========================================================= */

function SectionHeader({
  emoji,
  title,
  danger,
}: {
  emoji: string;
  title: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={danger ? styles.dangerIconBox : styles.sectionIconBox}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
      </View>

      <Text style={danger ? styles.dangerTitle : styles.cardTitle}>
        {title}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.actionIconBox}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>

      <View style={styles.actionTextBox}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  header: {
    marginTop: 14,
    marginBottom: 16,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.gold,
    marginBottom: 4,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.navy,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 20,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  dangerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionEmoji: {
    fontSize: 19,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.navy,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 18,
  },

  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  actionIcon: {
    fontSize: 21,
  },

  actionTextBox: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.navy,
  },

  actionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 17,
  },

  chevron: {
    fontSize: 32,
    fontWeight: "300",
    color: COLORS.gold,
    marginLeft: 8,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  dangerCard: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },

  dangerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#991B1B",
  },

  dangerText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },

  dangerButton: {
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  dangerButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  dangerButtonSubText: {
    marginTop: 4,
    color: "#FEE2E2",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },

  secondaryBtn: {
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },

  secondaryBtnText: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },

  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalHandle: {
    width: 52,
    height: 5,
    borderRadius: 99,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 16,
  },

  modalEmoji: {
    fontSize: 34,
    textAlign: "center",
    marginBottom: 6,
  },

  modalTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.navy,
    textAlign: "center",
  },

  modalWarning: {
    marginTop: 10,
    color: "#B91C1C",
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  modalInstruction: {
    marginTop: 16,
    marginBottom: 8,
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 14,
  },

  pinInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 22,
    color: COLORS.navy,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 8,
  },

  resetInput: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 18,
    color: COLORS.navy,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 3,
  },

  modalResetButton: {
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 18,
  },

  modalResetButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  modalCancelButton: {
    backgroundColor: COLORS.inputBg,
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
    marginBottom: Platform.OS === "ios" ? 10 : 0,
  },

  modalCancelText: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 15,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  disabled: {
    opacity: 0.45,
  },
});