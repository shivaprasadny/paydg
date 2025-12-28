// src/screens/edit-shift.tsx
// ---------------------------------------------------------
// PayDG — Edit Shift
// ✅ Loads shift by id from AsyncStorage
// ✅ Can change Workplace + Role (chips)
// ✅ Date picker + Start/End time picker (12h)
// ✅ Edits wage, break, unpaid break, tips, note
// ✅ Recalculates totals (overnight supported)
// ✅ Save + Delete
// ---------------------------------------------------------

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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { listWorkplaces, getWorkplaceById } from "../storage/repositories/workplaceRepo";
import { listRoles, getRoleById } from "../storage/repositories/roleRepo";
import { getProfile } from "../storage/repositories/profileRepo";
import { toISODate } from "../utils/dateUtils";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

const STORAGE_KEY = "paydg_shifts_v1";

// Keep Shift type flexible (old shifts may miss some fields)
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

/* -------------------- helpers -------------------- */

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
      <Pressable style={styles.pickerBox} onPress={onPress} hitSlop={10}>
        <Text style={styles.pickerText}>{valueText}</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </View>
  );
}

/* -------------------- screen -------------------- */

export default function EditShiftScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const shiftId = params.id ?? "";

  // Cached lists
  const workplaces = useMemo(() => listWorkplaces(), []);
  const roles = useMemo(() => listRoles(), []);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Current shift data (for delete/save)
  const [original, setOriginal] = useState<Shift | null>(null);

  // Editable fields
  const [workplaceId, setWorkplaceId] = useState("");
  const [roleId, setRoleId] = useState<string>(""); // "" = No role

  const [shiftDate, setShiftDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());

  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);

  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  // Pickers
  const [dateOpen, setDateOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // ✅ Load shift on screen focus
  const loadShift = useCallback(async () => {
    setLoading(true);
    setNotFound(false);

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: Shift[] = raw ? JSON.parse(raw) : [];

      const found = arr.find((s) => s.id === shiftId) ?? null;

      if (!found) {
        setNotFound(true);
        setOriginal(null);
        return;
      }

      setOriginal(found);

      // Initialize editable values
      setWorkplaceId(found.workplaceId || workplaces[0]?.id || "");
      setRoleId(found.roleId ?? ""); // allow empty
      setShiftDate(new Date(found.startISO)); // date from start

      setStartTime(new Date(found.startISO));
      setEndTime(new Date(found.endISO));

      setHourlyWageText(String(found.hourlyWage ?? 0));
      setBreakMinutesText(String(found.breakMinutes ?? 30));
      setUnpaidBreak(!!found.unpaidBreak);

      setCashTipsText(String(found.cashTips ?? 0));
      setCreditTipsText(String(found.creditTips ?? 0));

      setNote(found.note ?? "");
    } finally {
      setLoading(false);
    }
  }, [shiftId, workplaces]);

  useFocusEffect(
    useCallback(() => {
      loadShift();
    }, [loadShift])
  );

  // Numbers
  const hourlyWage = useMemo(() => parseMoney(hourlyWageText), [hourlyWageText]);
  const cashTips = useMemo(() => parseMoney(cashTipsText), [cashTipsText]);
  const creditTips = useMemo(() => parseMoney(creditTipsText), [creditTipsText]);
  const breakMinutes = useMemo(() => parseBreakMinutes(breakMinutesText), [breakMinutesText]);

  const isoDate = useMemo(() => toISODate(shiftDate), [shiftDate]);

  // Normalize start/end (overnight)
  const normalized = useMemo(() => {
    const start = applyTimeToDate(shiftDate, startTime);
    let end = applyTimeToDate(shiftDate, endTime);

    if (minutesOfDay(end) <= minutesOfDay(start)) {
      end.setDate(end.getDate() + 1);
    }

    return { start, end };
  }, [shiftDate, startTime, endTime]);

  // Preview totals
  const preview = useMemo(() => {
    let minutes = Math.max(0, Math.round((normalized.end.getTime() - normalized.start.getTime()) / 60000));
    if (unpaidBreak) minutes = Math.max(0, minutes - breakMinutes);

    const hours = Number((minutes / 60).toFixed(2));
    const hourlyPay = Number((hours * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { minutes, hours, hourlyPay, tips, total };
  }, [normalized, unpaidBreak, breakMinutes, hourlyWage, cashTips, creditTips]);

  // ✅ Optional helper: apply defaults priority Role → Workplace → Settings(Profile)
  const applyDefaults = useCallback(() => {
    const p = getProfile();
    const wp = workplaceId ? getWorkplaceById(workplaceId) : null;
    const role = roleId ? getRoleById(roleId) : null;

    const pWage = p?.defaultHourlyWage ?? 0;
    const pBreak = p?.defaultBreakMinutes ?? 30;
    const pUnpaid = p?.defaultUnpaidBreak ?? true;

    const wWage = wp?.defaultHourlyWage;
    const wBreak = wp?.defaultBreakMinutes;
    const wUnpaid = wp?.defaultUnpaidBreak;

    const rWage = role?.defaultHourlyWage;
    const rBreak = role?.defaultBreakMinutes;
    const rUnpaid = role?.defaultUnpaidBreak;

    setHourlyWageText(String(rWage ?? wWage ?? pWage));
    setBreakMinutesText(String(rBreak ?? wBreak ?? pBreak));
    setUnpaidBreak(!!(rUnpaid ?? wUnpaid ?? pUnpaid));
  }, [workplaceId, roleId]);

  async function onSave() {
    if (!original) return;

    if (!workplaceId) {
      Alert.alert("Workplace", "Please select a workplace.");
      return;
    }
    if (hourlyWage <= 0) {
      Alert.alert("Hourly wage", "Please enter hourly wage.");
      return;
    }
    if (preview.minutes <= 0) {
      Alert.alert("Shift time", "End time must be after start time.");
      return;
    }

    const wp = getWorkplaceById(workplaceId);
    const role = roleId ? getRoleById(roleId) : null;

    const updated: Shift = {
      ...original,

      workplaceId,
      workplaceName: wp?.name,

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
    };

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: Shift[] = raw ? JSON.parse(raw) : [];

      const next = arr.map((s) => (s.id === original.id ? updated : s));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      Alert.alert("Saved", "Shift updated ✅", [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Could not save changes. Please try again.");
    }
  }

  async function onDelete() {
    if (!original) return;

    Alert.alert("Delete shift?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          const arr: Shift[] = raw ? JSON.parse(raw) : [];
          const next = arr.filter((s) => s.id !== original.id);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.helper}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Edit Shift</Text>
          <Text style={styles.helper}>Shift not found.</Text>

          <Pressable style={styles.saveBtn} onPress={() => router.back()}>
            <Text style={styles.saveBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>


                <ActiveShiftTimerCard />

        {/* Header */}
        <View style={styles.topRow}>
          <Text style={styles.title}>Edit Shift</Text>
          <Pressable style={styles.deleteSmall} onPress={onDelete}>
            <Text style={styles.deleteSmallText}>Delete</Text>
          </Pressable>
        </View>

        {/* Workplace */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workplace</Text>
          <View style={styles.chipsWrap}>
            {workplaces.map((w: any) => {
              const active = w.id === workplaceId;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => setWorkplaceId(w.id)}
                  style={[styles.chip, active && styles.chipActive]}
                  hitSlop={8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{w.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Role */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Role</Text>

          <View style={styles.chipsWrap}>
            <Pressable
              onPress={() => setRoleId("")}
              style={[styles.chip, roleId === "" && styles.chipActive]}
              hitSlop={8}
            >
              <Text style={[styles.chipText, roleId === "" && styles.chipTextActive]}>No role</Text>
            </Pressable>

            {roles.map((r: any) => {
              const active = r.id === roleId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setRoleId(r.id)}
                  style={[styles.chip, active && styles.chipActive]}
                  hitSlop={8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {roles.length === 0 && <Text style={styles.helper}>Add roles in Home → Roles.</Text>}
        </View>

        {/* Date */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift Date</Text>

          <TapPickerField label="Date" valueText={formatDate(shiftDate)} onPress={() => setDateOpen(true)} />
          <Text style={styles.helper}>Saved as: {isoDate}</Text>

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
          <Text style={styles.cardTitle}>Shift Time</Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TapPickerField label="Start" valueText={formatTime12(startTime)} onPress={() => setStartOpen(true)} />
              <DateTimePickerModal
                isVisible={startOpen}
                mode="time"
                date={startTime}
                is24Hour={false}
                onConfirm={(d) => {
                  setStartOpen(false);
                  setStartTime(d);
                }}
                onCancel={() => setStartOpen(false)}
              />
            </View>

            <View style={{ flex: 1 }}>
              <TapPickerField label="End" valueText={formatTime12(endTime)} onPress={() => setEndOpen(true)} />
              <DateTimePickerModal
                isVisible={endOpen}
                mode="time"
                date={endTime}
                is24Hour={false}
                onConfirm={(d) => {
                  setEndOpen(false);
                  setEndTime(d);
                }}
                onCancel={() => setEndOpen(false)}
              />
            </View>
          </View>

          <Text style={styles.helper}>Overnight supported.</Text>
        </View>

        {/* Defaults button (optional) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Defaults</Text>
          <Text style={styles.helper}>
            If you changed workplace/role, you can apply their defaults (Role → Workplace → Settings).
          </Text>

          <Pressable style={styles.smallBtn} onPress={applyDefaults}>
            <Text style={styles.smallBtnText}>Apply Defaults</Text>
          </Pressable>
        </View>

        {/* Break */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Break</Text>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Deduct unpaid break</Text>
            <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} />
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Break minutes</Text>
          <TextInput
            value={breakMinutesText}
            onChangeText={setBreakMinutesText}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>

        {/* Pay & Tips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pay & Tips</Text>

          <Text style={styles.label}>Hourly wage</Text>
          <TextInput
            value={hourlyWageText}
            onChangeText={setHourlyWageText}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cash tips</Text>
              <TextInput
                value={cashTipsText}
                onChangeText={setCashTipsText}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Card tips</Text>
              <TextInput
                value={creditTipsText}
                onChangeText={setCreditTipsText}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          </View>
        </View>

        {/* Note */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note…"
            multiline
            style={[styles.input, { minHeight: 90, textAlignVertical: "top", paddingTop: 12 }]}
          />
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Preview</Text>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Hours</Text>
            <Text style={styles.previewValue}>{preview.hours.toFixed(2)}h</Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Hourly pay</Text>
            <Text style={styles.previewValue}>{fmtMoney(preview.hourlyPay)}</Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Tips</Text>
            <Text style={styles.previewValue}>{fmtMoney(preview.tips)}</Text>
          </View>

          <View style={[styles.previewRow, { marginTop: 6 }]}>
            <Text style={[styles.previewLabel, { fontWeight: "900" }]}>Total</Text>
            <Text style={[styles.previewValue, { fontSize: 18 }]}>{fmtMoney(preview.total)}</Text>
          </View>
        </View>

        <Pressable style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </Pressable>

        <Pressable style={[styles.saveBtn, { backgroundColor: "#e5e5e5" }]} onPress={() => router.back()}>
          <Text style={[styles.saveBtnText, { color: "#111" }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- styles -------------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800" },

  deleteSmall: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "#b91c1c" },
  deleteSmallText: { color: "#fff", fontWeight: "900" },

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

  smallBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 4,
  },
  smallBtnText: { color: "#fff", fontWeight: "900" },

  previewCard: { backgroundColor: "#111", borderRadius: 16, padding: 14, gap: 8 },
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
