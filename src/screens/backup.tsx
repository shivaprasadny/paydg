// src/screens/backup.tsx
// ---------------------------------------------------------
// PayDG — Data Center
// ✅ JSON Backup = restore/recovery inside PayDG
// ✅ CSV Export = Excel, Google Sheets, taxes, records
// ✅ Share sheet = email, AirDrop, Drive, Files, etc.
// ✅ Restore JSON backup
// ✅ Factory reset with PIN + RESET confirmation
// ✅ Premium PayDG light theme
// ---------------------------------------------------------

import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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

/* =========================
   THEME
========================= */

const COLORS = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  navy: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  inputBg: "#F8FAFC",
  gold: "#D97706",
  goldSoft: "#FFF7ED",
  goldBorder: "#FDBA74",
  green: "#16A34A",
  greenSoft: "#ECFDF5",
  greenBorder: "#86EFAC",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FCA5A5",
};

/* =========================
   STORAGE KEYS
========================= */

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
  app: "PayDG";
  data: Record<string, any>;
};

/* =========================
   HELPERS
========================= */

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

function csvEscape(value: any) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function shiftsToCSV(shifts: any[]) {
  const headers = [
    "Date",
    "Workplace",
    "Role",
    "Start",
    "End",
    "Hours",
    "Hourly Wage",
    "Hourly Pay",
    "Cash Tips",
    "Card Tips",
    "Total Tips",
    "Total Earned",
    "Break Minutes",
    "Unpaid Break",
    "Note",
  ];

  const rows = shifts.map((s) => {
    const hours =
      typeof s.workedHours === "number"
        ? s.workedHours
        : typeof s.workedMinutes === "number"
        ? Number((s.workedMinutes / 60).toFixed(2))
        : 0;

    return [
      s.isoDate,
      s.workplaceName,
      s.roleName,
      s.startISO,
      s.endISO,
      hours,
      s.hourlyWage,
      s.hourlyPay,
      s.cashTips,
      s.creditTips,
      s.totalTips,
      s.totalEarned,
      s.breakMinutes,
      s.unpaidBreak ? "Yes" : "No",
      s.note,
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

/* =========================
   MAIN SCREEN
========================= */

export default function BackupScreen() {
  const router = useRouter();

  const [busy, setBusy] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinText, setPinText] = useState("");
  const [resetText, setResetText] = useState("");

  /* -------------------------
     Create JSON backup
     Use this file to restore PayDG later.
  ------------------------- */
  async function createJSONBackup() {
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
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Backup created", `Saved to:\n${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Share PayDG JSON backup",
      });
    } catch (e: any) {
      Alert.alert("Backup failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------
     Export CSV
     Use this for Excel, Google Sheets, taxes, and records.
  ------------------------- */
  async function exportCSV() {
    try {
      setBusy(true);

      const raw = await AsyncStorage.getItem(KEYS.shifts);
      const shifts = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(shifts) || shifts.length === 0) {
        Alert.alert("No shifts found", "Add shifts before exporting CSV.");
        return;
      }

      const csv = shiftsToCSV(shifts);
      const dir = getWritableDir();

      if (!dir) {
        throw new Error("No writable directory available.");
      }

      const fileUri = `${dir}paydg-shifts-${nowStamp()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("CSV created", `Saved to:\n${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Share or email PayDG CSV",
      });
    } catch (e: any) {
      Alert.alert("CSV export failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------
     Restore JSON backup
  ------------------------- */
  async function restoreJSONBackup() {
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
        "This will overwrite your current PayDG data with the selected JSON backup.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => restorePayload(payload),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Restore failed", e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

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

  /* -------------------------
     Factory reset
  ------------------------- */
  async function openResetModal() {
    const enabled = await isPinEnabled();

    setPinRequired(enabled);
    setPinText("");
    setResetText("");
    setShowResetModal(true);
  }

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
      Alert.alert("Incorrect confirmation", 'Please type "RESET" to continue.');
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

  return (
    <Screen bg={COLORS.bg} pad={0} scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <ActiveShiftTimerCard />

        {/* Header */}
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>💾 PayDG Data Center</Text>
          <Text style={styles.title}>Backup & Export</Text>
          <Text style={styles.subtitle}>
            Protect your data, export your shifts, or restore PayDG from a backup.
          </Text>
        </View>

        {/* Explanation */}
        <View style={styles.infoCard}>
          <InfoRow
            emoji="📦"
            title="JSON Backup"
            body="For recovery. Use this file to restore PayDG later."
          />
          <View style={styles.divider} />
          <InfoRow
            emoji="📊"
            title="CSV Export"
            body="For Excel, Google Sheets, taxes, and personal records."
          />
          <View style={styles.divider} />
          <InfoRow
            emoji="📧"
            title="Email / Share"
            body="The share sheet lets you send files to Mail, Messages, Drive, Files, or AirDrop."
          />
        </View>

        {/* Backup / Export */}
        <View style={styles.card}>
          <SectionHeader emoji="📦" title="Backup & Export" />

          <ActionButton
            icon="☁️"
            title="Create JSON Backup"
            subtitle="Best for restore/recovery inside PayDG."
            onPress={createJSONBackup}
            disabled={busy}
          />

          <View style={styles.divider} />

          <ActionButton
            icon="📊"
            title="Export CSV"
            subtitle="Best for spreadsheets, taxes, and records."
            onPress={exportCSV}
            disabled={busy}
          />

          <View style={styles.divider} />

          <ActionButton
            icon="♻️"
            title="Restore JSON Backup"
            subtitle="Import a PayDG JSON backup file."
            onPress={restoreJSONBackup}
            disabled={busy}
          />
        </View>

        {/* Safety card */}
        <View style={styles.safeCard}>
          <Text style={styles.safeTitle}>✅ Recommended</Text>
          <Text style={styles.safeText}>
            Before factory reset or changing phones, create a JSON backup first.
            Export CSV when you want to review shifts outside the app.
          </Text>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <SectionHeader emoji="⚠️" title="Danger Zone" danger />

          <Text style={styles.dangerText}>
            Factory reset deletes all PayDG local data on this device. This cannot be undone.
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

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryBtnText}>← Back</Text>
        </Pressable>
      </ScrollView>

      {/* Reset Modal */}
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
                This will delete all shifts, profile, workplaces, roles, language,
                and settings from this device.
              </Text>

              {pinRequired ? (
                <>
                  <Text style={styles.modalInstruction}>Enter your 4-digit PIN</Text>

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
              ) : null}

              <Text style={styles.modalInstruction}>Type RESET below to confirm</Text>

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
                  pressed && styles.pressed,
                  busy && styles.disabled,
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

/* =========================
   SMALL COMPONENTS
========================= */

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

      <Text style={danger ? styles.dangerTitle : styles.cardTitle}>{title}</Text>
    </View>
  );
}

function InfoRow({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoEmoji}>{emoji}</Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoBody}>{body}</Text>
      </View>
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

      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 56,
    gap: 14,
  },

  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 28,
    padding: 22,
  },
  eyebrow: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 8,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  infoEmoji: {
    fontSize: 22,
    marginTop: 2,
  },
  infoTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },
  infoBody: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 3,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dangerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  cardTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "900",
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 18,
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },
  actionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  chevron: {
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: "300",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  safeCard: {
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 24,
    padding: 16,
  },
  safeTitle: {
    color: "#15803D",
    fontSize: 17,
    fontWeight: "900",
  },
  safeText: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 6,
  },

  dangerCard: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 24,
    padding: 16,
  },
  dangerTitle: {
    color: "#B91C1C",
    fontSize: 18,
    fontWeight: "900",
  },
  dangerText: {
    color: "#991B1B",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
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
    fontSize: 16,
    fontWeight: "900",
  },
  dangerButtonSubText: {
    color: "#FEE2E2",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },

  secondaryBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.55)",
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
  },
  modalTitle: {
    color: COLORS.navy,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 6,
  },
  modalWarning: {
    color: "#B91C1C",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },
  modalInstruction: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: "900",
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
    fontSize: 15,
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
});