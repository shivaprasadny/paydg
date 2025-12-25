// src/screens/add-shift.tsx
// ---------------------------------------------------------
// PayDG — Add Shift (Light theme like Settings)
// ✅ Tap to pick Date + Time (no typing)
// ✅ 12-hour time (AM/PM)
// ✅ Reload defaults from Settings/Profile on focus
// ✅ Overnight shifts supported
// ✅ Workplace selection + Notes
// ✅ Preview card
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
import { useFocusEffect, useRouter } from "expo-router";

import { getProfile } from "../storage/repositories/profileRepo";
import { listWorkplaces } from "../storage/repositories/workplaceRepo";
import { toISODate } from "../utils/dateUtils";

/* =========================================================
   Types
========================================================= */

type Shift = {
  id: string;

  workplaceId: string;
  workplaceName?: string;

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

/* =========================================================
   Helpers
========================================================= */

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

/** Build a Date from baseDate but with time taken from timeSource (hours/minutes). */
function applyTimeToDate(baseDate: Date, timeSource: Date) {
  const out = new Date(baseDate);
  out.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
  return out;
}

/* =========================================================
   Small UI Components
========================================================= */

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

/* =========================================================
   Screen
========================================================= */

export default function AddShiftScreen() {
  const router = useRouter();
  const workplaces = useMemo(() => listWorkplaces(), []);

  // -------------------- Workplace --------------------
  const [workplaceId, setWorkplaceId] = useState(workplaces[0]?.id ?? "");

  // -------------------- Date + Time --------------------
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

  // -------------------- Defaults (from Settings/Profile) --------------------
  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);

  // -------------------- Tips + Note --------------------
  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  // ✅ reload defaults every time you open Add Shift
  useFocusEffect(
    useCallback(() => {
      const p = getProfile();
      if (!p) return;

      setHourlyWageText(String(p.defaultHourlyWage ?? 0));
      setBreakMinutesText(String(p.defaultBreakMinutes ?? 30));
      setUnpaidBreak(p.defaultUnpaidBreak ?? true);
    }, [])
  );

  // -------------------- Picker visibility --------------------
  const [dateOpen, setDateOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // -------------------- Derived numbers --------------------
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

  const preview = useMemo(() => {
    let minutes = Math.max(0, Math.round((normalized.end.getTime() - normalized.start.getTime()) / 60000));
    if (unpaidBreak) minutes = Math.max(0, minutes - breakMinutes);

    const hours = Number((minutes / 60).toFixed(2));
    const hourlyPay = Number((hours * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { minutes, hours, hourlyPay, tips, total };
  }, [normalized, unpaidBreak, breakMinutes, hourlyWage, cashTips, creditTips]);

  // -------------------- Save --------------------
  async function saveShift() {
    if (!workplaceId) {
      Alert.alert("Workplace", "Please select a workplace.");
      return;
    }
    if (hourlyWage <= 0) {
      Alert.alert("Hourly wage", "Please enter your hourly wage.");
      return;
    }
    if (preview.minutes <= 0) {
      Alert.alert("Shift time", "End time must be after start time.");
      return;
    }

    const workplace = workplaces.find((w: any) => w.id === workplaceId);

    const shift: Shift = {
      id: `${Date.now()}`,

      workplaceId,
      workplaceName: workplace?.name,

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

      Alert.alert("Saved", "Shift saved successfully ✅");
      router.back();
    } catch {
      Alert.alert("Error", "Could not save shift. Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.topRow}>
          <Text style={styles.title}>Add Shift</Text>

          <Pressable style={styles.historyBtn} onPress={() => router.push("/history")}>
            <Text style={styles.historyBtnText}>History</Text>
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
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{w.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.helper}>Selected: {workplaces.find((w: any) => w.id === workplaceId)?.name}</Text>
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

          <Text style={styles.helper}>Overnight supported (end earlier than start).</Text>
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
            placeholder="30"
            style={styles.input}
          />
        </View>

        {/* Pay + Tips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pay & Tips</Text>

          <Text style={styles.label}>Hourly wage</Text>
          <TextInput
            value={hourlyWageText}
            onChangeText={setHourlyWageText}
            keyboardType="decimal-pad"
            placeholder="e.g. 15"
            style={styles.input}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cash tips</Text>
              <TextInput
                value={cashTipsText}
                onChangeText={setCashTipsText}
                keyboardType="decimal-pad"
                placeholder="0"
                style={styles.input}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Card tips</Text>
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

        {/* Save */}
        <Pressable style={styles.saveBtn} onPress={saveShift}>
          <Text style={styles.saveBtnText}>Save Shift</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
