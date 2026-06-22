// src/screens/add-shift.tsx
// ---------------------------------------------------------
// PayDG — Add Shift
// ✅ Premium light PayDG theme
// ✅ Same style as Edit Shift
// ✅ Keyboard-safe layout for Android/iOS
// ✅ Select Workplace + Role
// ✅ Defaults priority: Role → Workplace → Profile
// ✅ Saves workplaceName + roleName for History/Entries/Stats
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useFocusEffect, useRouter } from "expo-router";

import Screen from "../components/Screen";

import { getProfile } from "../storage/repositories/profileRepo";
import {
  getWorkplaceById,
  listWorkplaces,
} from "../storage/repositories/workplaceRepo";
import { getRoleById, listRoles } from "../storage/repositories/roleRepo";
import { toISODate } from "../utils/dateUtils";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";

const STORAGE_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;
  workplaceId: string;
  workplaceName?: string;
  roleId?: string;
  roleName?: string;
  isoDate: string;
  startISO: string;
  endISO: string;
  unpaidBreak: boolean;
  breakMinutes: number;
  hourlyWage: number;
  cashTips: number;
  creditTips: number;
  workedMinutes: number;
  workedHours: number;
  hourlyPay: number;
  totalTips: number;
  totalEarned: number;
  note?: string;
  createdAt: string;
};

/* =========================
   HELPERS
========================= */

function parseMoney(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseBreakMinutes(input: string): number {
  const cleaned = input.replace(/[^0-9]/g, "");
  const n = Number(cleaned);

  if (!Number.isFinite(n)) return 30;

  return Math.min(240, Math.max(0, n));
}

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function formatTime12(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function applyTimeToDate(baseDate: Date, timeSource: Date) {
  const out = new Date(baseDate);
  out.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
  return out;
}

/* =========================
   SMALL UI COMPONENTS
========================= */

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function TapPickerField({
  label,
  valueText,
  onPress,
}: {
  label: string;
  valueText: string;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>

      <Pressable style={styles.tapField} onPress={onPress}>
        <Text style={styles.tapText}>{valueText}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

function MoneyInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      style={styles.input}
    />
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function AddShiftScreen() {
  const router = useRouter();

  // Re-render when language changes.
  useLang();

  const workplaces = useMemo(() => listWorkplaces(), []);
  const roles = useMemo(() => listRoles(), []);

  const now = new Date();

  // Selection state.
  const [workplaceId, setWorkplaceId] = useState(workplaces[0]?.id ?? "");
  const [roleId, setRoleId] = useState<string>("");

  // Date/time state.
  const [shiftDate, setShiftDate] = useState<Date>(now);

  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date(now);
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [endTime, setEndTime] = useState<Date>(() => {
    const d = new Date(now);
    d.setHours(17, 0, 0, 0);
    return d;
  });

  // Pay/tips/note state.
  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);
  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  // Picker visibility.
  const [dateOpen, setDateOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const hourlyWage = useMemo(
    () => parseMoney(hourlyWageText),
    [hourlyWageText]
  );

  const cashTips = useMemo(() => parseMoney(cashTipsText), [cashTipsText]);

  const creditTips = useMemo(
    () => parseMoney(creditTipsText),
    [creditTipsText]
  );

  const breakMinutes = useMemo(
    () => parseBreakMinutes(breakMinutesText),
    [breakMinutesText]
  );

  const isoDate = useMemo(() => toISODate(shiftDate), [shiftDate]);

  const normalized = useMemo(() => {
    const start = applyTimeToDate(shiftDate, startTime);
    const end = applyTimeToDate(shiftDate, endTime);

    // Overnight shift support.
    if (minutesOfDay(end) <= minutesOfDay(start)) {
      end.setDate(end.getDate() + 1);
    }

    return { start, end };
  }, [shiftDate, startTime, endTime]);

  /**
   * Apply default wage/break settings.
   *
   * Priority:
   * 1. Role defaults
   * 2. Workplace defaults
   * 3. Profile/settings defaults
   */
  const applyDefaults = useCallback(
    (nextRoleId: string, nextWorkplaceId: string) => {
      const profile = getProfile();
      const role = nextRoleId ? getRoleById(nextRoleId) : null;
      const workplace = nextWorkplaceId ? getWorkplaceById(nextWorkplaceId) : null;

      const profileWage = profile?.defaultHourlyWage ?? 0;
      const profileBreak = profile?.defaultBreakMinutes ?? 30;
      const profileUnpaid = profile?.defaultUnpaidBreak ?? true;

      const workplaceWage = workplace?.defaultHourlyWage;
      const workplaceBreak = workplace?.defaultBreakMinutes;
      const workplaceUnpaid = workplace?.defaultUnpaidBreak;

      const roleWage = role?.defaultHourlyWage;
      const roleBreak = role?.defaultBreakMinutes;
      const roleUnpaid = role?.defaultUnpaidBreak;

      setHourlyWageText(String(roleWage ?? workplaceWage ?? profileWage));
      setBreakMinutesText(String(roleBreak ?? workplaceBreak ?? profileBreak));
      setUnpaidBreak(Boolean(roleUnpaid ?? workplaceUnpaid ?? profileUnpaid));
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      const profile = getProfile();

      if (!profile) return;

      setHourlyWageText(String(profile.defaultHourlyWage ?? 0));
      setBreakMinutesText(String(profile.defaultBreakMinutes ?? 30));
      setUnpaidBreak(profile.defaultUnpaidBreak ?? true);

      if (workplaceId) {
        applyDefaults(roleId, workplaceId);
      }
    }, [workplaceId, roleId, applyDefaults])
  );

  const preview = useMemo(() => {
    let minutes = Math.max(
      0,
      Math.round((normalized.end.getTime() - normalized.start.getTime()) / 60000)
    );

    if (unpaidBreak) {
      minutes = Math.max(0, minutes - breakMinutes);
    }

    const hours = Number((minutes / 60).toFixed(2));
    const hourlyPay = Number((hours * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { minutes, hours, hourlyPay, tips, total };
  }, [
    normalized,
    unpaidBreak,
    breakMinutes,
    hourlyWage,
    cashTips,
    creditTips,
  ]);

  async function saveShift() {
    if (!workplaceId) {
      Alert.alert(t("workplace") ?? "Workplace", t("select_workplace") ?? "Please select a workplace.");
      return;
    }

    if (hourlyWage <= 0) {
      Alert.alert(t("hourly_wage") ?? "Hourly wage", t("enter_hourly_wage") ?? "Please enter hourly wage.");
      return;
    }

    if (preview.minutes <= 0) {
      Alert.alert(t("shift_time") ?? "Shift time", t("end_after_start") ?? "End time must be after start time.");
      return;
    }

    const workplace = getWorkplaceById(workplaceId);
    const role = roleId ? getRoleById(roleId) : null;

    const shift: Shift = {
      id: `${Date.now()}`,
      workplaceId,
      workplaceName: workplace?.name,
      roleId: roleId || undefined,
      roleName: role?.name,
      isoDate,
      startISO: normalized.start.toISOString(),
      endISO: normalized.end.toISOString(),
      unpaidBreak,
      breakMinutes,
      hourlyWage,
      cashTips,
      creditTips,
      workedMinutes: preview.minutes,
      workedHours: preview.hours,
      hourlyPay: preview.hourlyPay,
      totalTips: preview.tips,
      totalEarned: preview.total,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: Shift[] = raw ? JSON.parse(raw) : [];

      arr.unshift(shift);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

      Alert.alert(t("saved") ?? "Saved", t("shift_saved") ?? "Shift saved.");
      router.back();
    } catch {
      Alert.alert(t("error") ?? "Error", t("shift_save_failed") ?? "Could not save shift.");
    }
  }

  return (
    <Screen bg="#F6F7FB" pad={0}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.container}
          >

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>➕ New entry</Text>
                <Text style={styles.title}>{t("add_shift_title") ?? "Add Shift"}</Text>
                <Text style={styles.subtitle}>
                  Add hours, tips, role, workplace, and notes.
                </Text>
              </View>

              <Pressable
                style={styles.historyBtn}
                onPress={() => router.push("/history")}
              >
                <Text style={styles.historyBtnText}>History</Text>
              </Pressable>
            </View>

            {/* Workplace */}
            <SectionCard
              title="🏢 Workplace"
              subtitle="Choose where this shift happened."
            >
              <View style={styles.chipsWrap}>
                {workplaces.map((w: any) => {
                  const active = w.id === workplaceId;

                  return (
                    <Chip
                      key={w.id}
                      label={w.name}
                      active={active}
                      onPress={() => {
                        setWorkplaceId(w.id);
                        applyDefaults(roleId, w.id);
                      }}
                    />
                  );
                })}
              </View>

              {workplaces.length === 0 ? (
                <Text style={styles.helper}>
                  Add a workplace first from the Workplaces screen.
                </Text>
              ) : null}
            </SectionCard>

            {/* Role */}
            <SectionCard title="👔 Role" subtitle="Optional, but helps stats and insights.">
              <View style={styles.chipsWrap}>
                <Chip
                  label={t("no_role") ?? "No role"}
                  active={roleId === ""}
                  onPress={() => {
                    setRoleId("");
                    applyDefaults("", workplaceId);
                  }}
                />

                {roles.map((r: any) => {
                  const active = r.id === roleId;

                  return (
                    <Chip
                      key={r.id}
                      label={r.name}
                      active={active}
                      onPress={() => {
                        setRoleId(r.id);
                        applyDefaults(r.id, workplaceId);
                      }}
                    />
                  );
                })}
              </View>

              {roles.length === 0 ? (
                <Text style={styles.helper}>Add roles later to improve insights.</Text>
              ) : null}
            </SectionCard>

            {/* Date */}
            <SectionCard title="📅 Date" subtitle={`Saved as ${isoDate}`}>
              <TapPickerField
                label={t("date") ?? "Date"}
                valueText={formatDate(shiftDate)}
                onPress={() => setDateOpen(true)}
              />
            </SectionCard>

            {/* Time and break */}
            <SectionCard title="⏱ Time & Break" subtitle="Overnight shifts are supported.">
              <TapPickerField
                label={t("start_time") ?? "Start time"}
                valueText={formatTime12(startTime)}
                onPress={() => setStartOpen(true)}
              />

              <TapPickerField
                label={t("end_time") ?? "End time"}
                valueText={formatTime12(endTime)}
                onPress={() => setEndOpen(true)}
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>
                    {t("deduct_unpaid_break") ?? "Deduct unpaid break"}
                  </Text>

                  <Text style={styles.switchSub}>
                    Subtract break time from paid hours.
                  </Text>
                </View>

                <Switch
                  value={unpaidBreak}
                  onValueChange={setUnpaidBreak}
                  trackColor={{ false: "#CBD5E1", true: "#FDBA74" }}
                  thumbColor={unpaidBreak ? "#D97706" : "#F8FAFC"}
                />
              </View>

              <FieldLabel>{t("break_minutes") ?? "Break minutes"}</FieldLabel>

              <TextInput
                value={breakMinutesText}
                onChangeText={setBreakMinutesText}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor="#94A3B8"
                style={styles.input}
              />
            </SectionCard>

            {/* Pay and tips */}
            <SectionCard title="💵 Pay & Tips" subtitle="Track wage, cash tips, and card tips.">
              <FieldLabel>{t("hourly_wage") ?? "Hourly wage"}</FieldLabel>

              <MoneyInput
                value={hourlyWageText}
                onChangeText={setHourlyWageText}
                placeholder={t("eg_15") ?? "15"}
              />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>{t("cash_tips") ?? "Cash tips"}</FieldLabel>
                  <MoneyInput
                    value={cashTipsText}
                    onChangeText={setCashTipsText}
                    placeholder="0"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <FieldLabel>{t("card_tips") ?? "Card tips"}</FieldLabel>
                  <MoneyInput
                    value={creditTipsText}
                    onChangeText={setCreditTipsText}
                    placeholder="0"
                  />
                </View>
              </View>
            </SectionCard>

            {/* Note */}
            <SectionCard title="📝 Note">
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t("note_placeholder") ?? "Add a note about this shift..."}
                placeholderTextColor="#94A3B8"
                multiline
                style={[styles.input, styles.noteInput]}
              />
            </SectionCard>

            {/* Preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>💰 Shift total</Text>
              <Text style={styles.previewTotal}>{fmtMoney(preview.total)}</Text>

              <View style={styles.previewGrid}>
                <View style={styles.previewMini}>
                  <Text style={styles.previewMiniLabel}>Hours</Text>
                  <Text style={styles.previewMiniValue}>
                    {preview.hours.toFixed(2)}h
                  </Text>
                </View>

                <View style={styles.previewMini}>
                  <Text style={styles.previewMiniLabel}>Hourly pay</Text>
                  <Text style={styles.previewMiniValue}>
                    {fmtMoney(preview.hourlyPay)}
                  </Text>
                </View>

                <View style={styles.previewMini}>
                  <Text style={styles.previewMiniLabel}>Tips</Text>
                  <Text style={styles.previewMiniValue}>
                    {fmtMoney(preview.tips)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Save */}
            <Pressable style={styles.saveBtn} onPress={saveShift}>
              <Text style={styles.saveBtnText}>
                {t("save_shift") ?? "Save Shift"}
              </Text>
            </Pressable>

            <Text style={styles.bottomNote}>
              Saved shifts stay on this device unless you export or backup.
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Pickers */}
      <DateTimePickerModal
        isVisible={dateOpen}
        mode="date"
        date={shiftDate}
        onConfirm={(d) => {
          setDateOpen(false);
          setShiftDate(d);
        }}
        onCancel={() => setDateOpen(false)}
      />

      <DateTimePickerModal
        isVisible={startOpen}
        mode="time"
        date={startTime}
        onConfirm={(d) => {
          setStartOpen(false);
          setStartTime(d);
        }}
        onCancel={() => setStartOpen(false)}
      />

      <DateTimePickerModal
        isVisible={endOpen}
        mode="time"
        date={endTime}
        onConfirm={(d) => {
          setEndOpen(false);
          setEndTime(d);
        }}
        onCancel={() => setEndOpen(false)}
      />
    </Screen>
  );
}

/* =========================
   PAYDG PREMIUM LIGHT THEME
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 56,
    gap: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 6,
  },

  historyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#1E293B",
  },
  historyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: -4,
    marginBottom: 2,
  },

  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
  },
  noteInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  tapField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  tapText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  chevron: {
    color: "#94A3B8",
    fontSize: 24,
    fontWeight: "900",
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  chipActive: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  chipText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },

  helper: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
  },
  switchTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  switchSub: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  twoCol: {
    flexDirection: "row",
    gap: 12,
  },

  previewCard: {
    backgroundColor: "#1E293B",
    borderRadius: 28,
    padding: 22,
  },
  previewLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  previewTotal: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 8,
  },
  previewGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  previewMini: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  previewMiniLabel: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "800",
  },
  previewMiniValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },

  saveBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  bottomNote: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 2,
  },
});