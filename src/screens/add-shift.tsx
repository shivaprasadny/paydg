// src/screens/add-shift.tsx
// ---------------------------------------------------------
// PayDG — Add Shift (with Role support)
// ✅ Select Workplace + Role
// ✅ Defaults priority: Role → Workplace → Settings(Profile)
// ✅ Pickers (date/time) remain the same
// ✅ Saves roleName/workplaceName into each shift for History/Entries display
// ---------------------------------------------------------
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useFocusEffect, useRouter } from "expo-router";

import { getProfile } from "../storage/repositories/profileRepo";
import { listWorkplaces, getWorkplaceById } from "../storage/repositories/workplaceRepo";
import { listRoles, getRoleById } from "../storage/repositories/roleRepo";
import { toISODate } from "../utils/dateUtils";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import Screen from "../components/Screen";

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

const STORAGE_KEY = "paydg_shifts_v1";

/* ---------------- helpers ---------------- */

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime12(d: Date) {
  const hh = d.getHours();
  const mm = d.getMinutes();
  const ampm = hh >= 12 ? "PM" : "AM";
  const hr12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hr12}:${pad2(mm)} ${ampm}`;
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
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.pickerBox} onPress={onPress}>
        <Text style={styles.pickerText}>{valueText}</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </View>
  );
}

/* ---------------- screen ---------------- */

export default function AddShiftScreen() {
  const router = useRouter();

  // ✅ IMPORTANT: makes this screen re-render when language changes
  useLang();

  const workplaces = useMemo(() => listWorkplaces(), []);
  const roles = useMemo(() => listRoles(), []);

  // Selection state
  const [workplaceId, setWorkplaceId] = useState(workplaces[0]?.id ?? "");
  const [roleId, setRoleId] = useState<string>(""); // "" means No role

  // Date/time
  const now = new Date();
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

  // Defaults/inputs
  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);

  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  // Picker visibility
  const [dateOpen, setDateOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // Numbers
  const hourlyWage = useMemo(() => parseMoney(hourlyWageText), [hourlyWageText]);
  const cashTips = useMemo(() => parseMoney(cashTipsText), [cashTipsText]);
  const creditTips = useMemo(() => parseMoney(creditTipsText), [creditTipsText]);
  const breakMinutes = useMemo(() => parseBreakMinutes(breakMinutesText), [breakMinutesText]);

  const isoDate = useMemo(() => toISODate(shiftDate), [shiftDate]);

  const normalized = useMemo(() => {
    const start = applyTimeToDate(shiftDate, startTime);
    let end = applyTimeToDate(shiftDate, endTime);

    // Overnight: end <= start means next day
    if (minutesOfDay(end) <= minutesOfDay(start)) {
      end.setDate(end.getDate() + 1);
    }

    return { start, end };
  }, [shiftDate, startTime, endTime]);

  // ✅ Apply defaults priority: Role → Workplace → Profile
  const applyDefaults = useCallback(
    (nextRoleId: string, nextWorkplaceId: string) => {
      const p = getProfile();

      const role = nextRoleId ? getRoleById(nextRoleId) : null;
      const workplace = nextWorkplaceId ? getWorkplaceById(nextWorkplaceId) : null;

      // Profile defaults
      const pWage = p?.defaultHourlyWage ?? 0;
      const pBreak = p?.defaultBreakMinutes ?? 30;
      const pUnpaid = p?.defaultUnpaidBreak ?? true;

      // Workplace defaults (if present)
      const wWage = workplace?.defaultHourlyWage;
      const wBreak = workplace?.defaultBreakMinutes;
      const wUnpaid = workplace?.defaultUnpaidBreak;

      // Role defaults (if present)
      const rWage = role?.defaultHourlyWage;
      const rBreak = role?.defaultBreakMinutes;
      const rUnpaid = role?.defaultUnpaidBreak;

      // Priority: Role → Workplace → Profile
      setHourlyWageText(String(rWage ?? wWage ?? pWage));
      setBreakMinutesText(String(rBreak ?? wBreak ?? pBreak));
      setUnpaidBreak(!!(rUnpaid ?? wUnpaid ?? pUnpaid));
    },
    []
  );

  // On focus, start with profile defaults then override using role/workplace
  useFocusEffect(
    useCallback(() => {
      const p = getProfile();
      if (!p) return;

      setHourlyWageText(String(p.defaultHourlyWage ?? 0));
      setBreakMinutesText(String(p.defaultBreakMinutes ?? 30));
      setUnpaidBreak(p.defaultUnpaidBreak ?? true);

      if (workplaceId) {
        applyDefaults(roleId, workplaceId);
      }
    }, [workplaceId, roleId, applyDefaults])
  );

  const preview = useMemo(() => {
    let minutes = Math.max(0, Math.round((normalized.end.getTime() - normalized.start.getTime()) / 60000));
    if (unpaidBreak) minutes = Math.max(0, minutes - breakMinutes);

    const hours = Number((minutes / 60).toFixed(2));
    const hourlyPay = Number((hours * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { minutes, hours, hourlyPay, tips, total };
  }, [normalized, unpaidBreak, breakMinutes, hourlyWage, cashTips, creditTips]);

  async function saveShift() {
    if (!workplaceId) {
      Alert.alert(t("workplace"), t("select_workplace"));
      return;
    }
    if (hourlyWage <= 0) {
      Alert.alert(t("hourly_wage"), t("enter_hourly_wage"));
      return;
    }
    if (preview.minutes <= 0) {
      Alert.alert(t("shift_time"), t("end_after_start"));
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

      Alert.alert(t("saved"), t("shift_saved"));
      router.back();
    } catch {
      Alert.alert(t("error"), t("shift_save_failed"));
    }
  }

  return (
  <Screen bg="#f7f7f7" pad={16}>
      <ActiveShiftTimerCard />
        {/* Header */}
        <View style={styles.topRow}>
          <Text style={styles.title}>{t("add_shift_title")}</Text>
          <Pressable style={styles.historyBtn} onPress={() => router.push("/history")}>
            <Text style={styles.historyBtnText}>{t("history")}</Text>
          </Pressable>
        </View>

  


        {/* Workplace */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("workplace")}</Text>
          <View style={styles.chipsWrap}>
            {workplaces.map((w: any) => {
              const active = w.id === workplaceId;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => {
                    setWorkplaceId(w.id);
                    applyDefaults(roleId, w.id);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{w.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Role */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("role")}</Text>

          <View style={styles.chipsWrap}>
            {/* "No role" option */}
            <Pressable
              onPress={() => {
                setRoleId("");
                applyDefaults("", workplaceId);
              }}
              style={[styles.chip, roleId === "" && styles.chipActive]}
            >
              <Text style={[styles.chipText, roleId === "" && styles.chipTextActive]}>
                {t("no_role")}
              </Text>
            </Pressable>

            {roles.map((r: any) => {
              const active = r.id === roleId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    setRoleId(r.id);
                    applyDefaults(r.id, workplaceId);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {roles.length === 0 && <Text style={styles.helper}>{t("add_roles_hint")}</Text>}
        </View>

        {/* Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("shift_date_title")}</Text>
          <TapPickerField label={t("date")} valueText={formatDate(shiftDate)} onPress={() => setDateOpen(true)} />
          <Text style={styles.helper}>
            {t("saved_as")} {isoDate}
          </Text>

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
        </View>

        {/* Time */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("shift_time")}</Text>

          <TapPickerField
            label={t("start_time")}
            valueText={formatTime12(startTime)}
            onPress={() => setStartOpen(true)}
          />
          <TapPickerField
            label={t("end_time")}
            valueText={formatTime12(endTime)}
            onPress={() => setEndOpen(true)}
          />

          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <Text style={styles.label}>{t("deduct_unpaid_break")}</Text>
            <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} />
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>{t("break_minutes")}</Text>
          <TextInput
            value={breakMinutesText}
            onChangeText={setBreakMinutesText}
            keyboardType="number-pad"
            placeholder="30"
            style={styles.input}
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
        </View>

        {/* Pay + Tips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("pay_tips_title")}</Text>

          <Text style={styles.label}>{t("hourly_wage")}</Text>
          <TextInput
            value={hourlyWageText}
            onChangeText={setHourlyWageText}
            keyboardType="decimal-pad"
            placeholder={t("eg_15")}
            style={styles.input}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t("cash_tips")}</Text>
              <TextInput
                value={cashTipsText}
                onChangeText={setCashTipsText}
                keyboardType="decimal-pad"
                placeholder="0"
                style={styles.input}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t("card_tips")}</Text>
              <TextInput
                value={creditTipsText}
                onChangeText={setCreditTipsText}
                keyboardType="decimal-pad"
                placeholder="0"
                style={styles.input}
              />
            </View>
          </View>
        </View>

        {/* Note */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("note")}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t("note_placeholder")}
            multiline
            style={[styles.input, { minHeight: 90, textAlignVertical: "top", paddingTop: 12 }]}
          />
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>{t("preview")}</Text>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{t("hours")}</Text>
            <Text style={styles.previewValue}>{preview.hours.toFixed(2)}h</Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{t("hourly_pay")}</Text>
            <Text style={styles.previewValue}>{fmtMoney(preview.hourlyPay)}</Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{t("tips")}</Text>
            <Text style={styles.previewValue}>{fmtMoney(preview.tips)}</Text>
          </View>

          <View style={[styles.previewRow, { marginTop: 6 }]}>
            <Text style={[styles.previewLabel, { fontWeight: "900" }]}>{t("total")}</Text>
            <Text style={[styles.previewValue, { fontSize: 18 }]}>{fmtMoney(preview.total)}</Text>
          </View>
        </View>

        {/* Save */}
        <Pressable style={styles.saveBtn} onPress={saveShift}>
          <Text style={styles.saveBtnText}>{t("save_shift")}</Text>
        </Pressable>
        
        
     </Screen >
  );
}

/* =========================================================
   Styles (Light theme, matches settings.tsx)
========================================================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 12 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800" },

  historyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  historyBtnText: { color: "#fff", fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },

  label: { fontSize: 13, opacity: 0.7, marginBottom: 6 },
  helper: { fontSize: 12, opacity: 0.6 },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    fontSize: 16,
  },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  pickerBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  pickerText: { flex: 1, fontSize: 16, fontWeight: "800" },
  chev: { fontSize: 20, opacity: 0.35, paddingLeft: 10 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, fontWeight: "800" },
  chipTextActive: { color: "#fff" },

  previewCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  previewTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  previewValue: { color: "#fff", fontSize: 15, fontWeight: "900" },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
