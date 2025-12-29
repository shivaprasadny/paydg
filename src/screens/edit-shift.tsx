// src/screens/edit-shift.tsx
// ---------------------------------------------------------
// PayDG — Edit Shift
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

const STORAGE_KEY = "paydg_shifts_v1";

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

function parseMoney(s: string) {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(s: string, fallback: number) {
  const n = Number(s.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function fmtMoney(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function fmtTime12(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* -------------------------------------------------- */
/* Screen                                             */
/* -------------------------------------------------- */

export default function EditShiftScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isIOS = Platform.OS === "ios";
  const [pickerOpen, setPickerOpen] = useState<null | "date" | "start" | "end">(null);

  const [shift, setShift] = useState<any | null>(null);

  // Editable fields
  const [dateObj, setDateObj] = useState(new Date());
  const [startObj, setStartObj] = useState(new Date());
  const [endObj, setEndObj] = useState(new Date());

  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);

  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  /* ---------- Load shift ---------- */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        const found = arr.find((s: any) => s.id === id);

        if (!found) {
          Alert.alert("Not found", "Shift not found");
          router.back();
          return;
        }

        setShift(found);

        const s = new Date(found.startISO);
        const e = new Date(found.endISO);

        setDateObj(new Date(found.startISO));
        setStartObj(s);
        setEndObj(e);

        setHourlyWageText(String(found.hourlyWage ?? 0));
        setBreakMinutesText(String(found.breakMinutes ?? 30));
        setUnpaidBreak(found.unpaidBreak ?? true);

        setCashTipsText(String(found.cashTips ?? 0));
        setCreditTipsText(String(found.creditTips ?? 0));
        setNote(found.note ?? "");
      })();
    }, [id])
  );

  /* ---------- Derived ---------- */
  const hourlyWage = useMemo(() => parseMoney(hourlyWageText), [hourlyWageText]);
  const cashTips = useMemo(() => parseMoney(cashTipsText), [cashTipsText]);
  const creditTips = useMemo(() => parseMoney(creditTipsText), [creditTipsText]);
  const breakMinutes = useMemo(
    () => Math.min(240, Math.max(0, parseIntSafe(breakMinutesText, 30))),
    [breakMinutesText]
  );

  const { start, end } = useMemo(() => {
    const s = new Date(dateObj);
    s.setHours(startObj.getHours(), startObj.getMinutes(), 0, 0);

    let e = new Date(dateObj);
    e.setHours(endObj.getHours(), endObj.getMinutes(), 0, 0);

    if (minutesOfDay(e) <= minutesOfDay(s)) {
      e.setDate(e.getDate() + 1);
    }

    return { start: s, end: e };
  }, [dateObj, startObj, endObj]);

  const preview = useMemo(() => {
    let mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    if (unpaidBreak) mins = Math.max(0, mins - breakMinutes);

    const hours = Number((mins / 60).toFixed(2));
    const hourlyPay = Number((hours * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { hours, hourlyPay, tips, total };
  }, [start, end, unpaidBreak, breakMinutes, hourlyWage, cashTips, creditTips]);

  /* ---------- Picker ---------- */
  function onPickerChange(_: DateTimePickerEvent, d?: Date) {
    if (!d) return;
    if (pickerOpen === "date") setDateObj(d);
    if (pickerOpen === "start") setStartObj(d);
    if (pickerOpen === "end") setEndObj(d);
    if (!isIOS) setPickerOpen(null);
  }

  /* ---------- Save ---------- */
  async function onSave() {
    if (!shift) return;

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];

    const updated = arr.map((s: any) =>
      s.id === shift.id
        ? {
            ...s,
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            hourlyWage,
            breakMinutes,
            unpaidBreak,
            cashTips,
            creditTips,
            workedHours: preview.hours,
            hourlyPay: preview.hourlyPay,
            totalTips: preview.tips,
            totalEarned: preview.total,
            note: note.trim() || undefined,
          }
        : s
    );

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    router.back();
  }

  /* ---------- Delete ---------- */
  async function onDelete() {
    Alert.alert("Delete shift?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          const next = arr.filter((s: any) => s.id !== shift.id);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          router.back();
        },
      },
    ]);
  }

  if (!shift) return null;

  return (
    <Screen pad={16}>
      <ActiveShiftTimerCard />

      <Text style={styles.title}>Edit Shift</Text>

      {/* Date */}
      <View style={styles.card}>
        <Text style={styles.label}>Date</Text>
        <Pressable style={styles.tapField} onPress={() => setPickerOpen("date")}>
          <Text style={styles.tapText}>{fmtDate(dateObj)}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Start</Text>
            <Pressable style={styles.tapField} onPress={() => setPickerOpen("start")}>
              <Text style={styles.tapText}>{fmtTime12(startObj)}</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>End</Text>
            <Pressable style={styles.tapField} onPress={() => setPickerOpen("end")}>
              <Text style={styles.tapText}>{fmtTime12(endObj)}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Pay */}
      <View style={styles.card}>
        <Text style={styles.label}>Hourly wage</Text>
        <TextInput value={hourlyWageText} onChangeText={setHourlyWageText} style={styles.input} />

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Deduct unpaid break</Text>
          <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} />
        </View>

        <Text style={styles.label}>Break minutes</Text>
        <TextInput value={breakMinutesText} onChangeText={setBreakMinutesText} style={styles.input} />
      </View>

      {/* Tips */}
      <View style={styles.card}>
        <Text style={styles.label}>Cash tips</Text>
        <TextInput value={cashTipsText} onChangeText={setCashTipsText} style={styles.input} />

        <Text style={styles.label}>Card tips</Text>
        <TextInput value={creditTipsText} onChangeText={setCreditTipsText} style={styles.input} />
      </View>

      {/* Note */}
      <View style={styles.card}>
        <Text style={styles.label}>Note</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          style={[styles.input, { minHeight: 80 }]}
        />
      </View>

      {/* Preview */}
      <View style={styles.preview}>
        <Text style={styles.previewText}>Hours: {preview.hours}h</Text>
        <Text style={styles.previewText}>Total: {fmtMoney(preview.total)}</Text>
      </View>

      <Pressable style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveText}>Save Changes</Text>
      </Pressable>

      <Pressable style={[styles.saveBtn, { backgroundColor: "#b91c1c" }]} onPress={onDelete}>
        <Text style={styles.saveText}>Delete Shift</Text>
      </Pressable>

      {/* Picker */}
      {pickerOpen && (
        <DateTimePicker
          value={pickerOpen === "date" ? dateObj : pickerOpen === "start" ? startObj : endObj}
          mode={pickerOpen === "date" ? "date" : "time"}
          onChange={onPickerChange}
        />
      )}
    </Screen>
  );
}

/* -------------------------------------------------- */
/* Styles                                             */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", marginBottom: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    marginBottom: 12,
    gap: 8,
  },

  label: { fontSize: 13, opacity: 0.7 },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },

  tapField: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
  },
  tapText: { fontSize: 16, fontWeight: "800" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  preview: {
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  previewText: { color: "#fff", fontWeight: "900" },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
