// app/edit-shift.tsx
// ---------------------------------------------------------
// PayDg — Edit Shift Screen (Expo Router)
// ✅ Edit shift times, wage/tips, break, NOTE, and WORKPLACE
// ✅ Tap workplace to change (no reset bug)
// ✅ Tap Save to persist to AsyncStorage
// ✅ Tap Delete to remove shift
// ---------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

import { listWorkplaces } from "../src/storage/repositories/workplaceRepo";
import { fromISODate, toISODate } from "../src/utils/dateUtils";
import {
  applyUnpaidBreak,
  calcMoney,
  diffMinutes,
  normalizeEndDate,
} from "../src/utils/timeUtils";

/* =========================================================
   1) Types + Storage Key
========================================================= */

type Shift = {
  id: string;

  // Workplace (saved inside shift)
  workplaceId?: string;
  workplaceName?: string;

  // Date & time
  isoDate: string; // YYYY-MM-DD (local)
  startISO: string;
  endISO: string;

  // Break
  unpaidBreak: boolean;
  breakMinutes: number;

  // Pay & tips
  hourlyWage: number;
  cashTips: number;
  creditTips: number;

  // Calculated values
  workedMinutes: number;
  workedHours: number;
  hourlyPay: number;
  totalTips: number;
  totalEarned: number;

  // Optional note
  note?: string;

  // Meta
  createdAt: string;
};

const STORAGE_KEY = "paydg_shifts_v1";

/* =========================================================
   2) Small Helpers
========================================================= */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(d: Date) {
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

/* =========================================================
   3) Screen
========================================================= */

export default function EditShiftScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // ✅ IMPORTANT: keep workplaces stable (prevents selection reset bug)
  const workplaces = useMemo(() => listWorkplaces(), []);

  /* -------------------- Loading flags -------------------- */
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ✅ Prevent "reset after tap" bug: only set workplace once during load
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  /* -------------------- Workplace selection -------------------- */
  const [workplaceId, setWorkplaceId] = useState<string>(workplaces[0]?.id ?? "");

  const selectedWorkplace = useMemo(
    () => workplaces.find((w) => w.id === workplaceId),
    [workplaces, workplaceId]
  );

  /* -------------------- Date & time -------------------- */
  const [shiftDate, setShiftDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());

  /* -------------------- Break -------------------- */
  const [unpaidBreak, setUnpaidBreak] = useState(true);
  const [breakMinutesText, setBreakMinutesText] = useState("30");

  /* -------------------- Pay & tips -------------------- */
  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");

  /* -------------------- Note -------------------- */
  const [note, setNote] = useState("");

  /* -------------------- Pickers -------------------- */
  const [openDate, setOpenDate] = useState(false);
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  /* =========================================================
     4) Load shift from AsyncStorage (by id)
     - Runs once when screen opens
========================================================= */

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];

        const target = arr.find((s) => s.id === String(id));

        if (!target) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // ---- Load shift fields ----
        setShiftDate(fromISODate(target.isoDate));
        setStartTime(new Date(target.startISO));
        setEndTime(new Date(target.endISO));

        setUnpaidBreak(!!target.unpaidBreak);
        setBreakMinutesText(String(target.breakMinutes ?? 30));

        setHourlyWageText(String(target.hourlyWage ?? 0));
        setCashTipsText(String(target.cashTips ?? 0));
        setCreditTipsText(String(target.creditTips ?? 0));

        setNote(target.note ?? "");

        // ---- IMPORTANT FIX ----
        // Only set workplace on FIRST load.
        // If we set it every render, it will reset user taps.
        if (!initialLoadDone) {
          setWorkplaceId(target.workplaceId ?? workplaces[0]?.id ?? "");
          setInitialLoadDone(true);
        }

        setLoading(false);
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    })();
  }, [id, initialLoadDone, workplaces]);

  /* =========================================================
     5) Derived / Calculated values
========================================================= */

  const breakMinutes = useMemo(
    () => parseBreakMinutes(breakMinutesText),
    [breakMinutesText]
  );
  const hourlyWage = useMemo(() => parseMoney(hourlyWageText), [hourlyWageText]);
  const cashTips = useMemo(() => parseMoney(cashTipsText), [cashTipsText]);
  const creditTips = useMemo(() => parseMoney(creditTipsText), [creditTipsText]);

  // Apply selected times onto selected date
  const normalizedDates = useMemo(() => {
    const s = new Date(shiftDate);
    s.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const e = new Date(shiftDate);
    e.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

    return { start: s, end: normalizeEndDate(s, e) };
  }, [shiftDate, startTime, endTime]);

  const workedMinutesRaw = useMemo(
    () => diffMinutes(normalizedDates.start, normalizedDates.end),
    [normalizedDates]
  );

  const workedMinutes = useMemo(
    () => applyUnpaidBreak(workedMinutesRaw, unpaidBreak, breakMinutes),
    [workedMinutesRaw, unpaidBreak, breakMinutes]
  );

  const money = useMemo(() => {
    return calcMoney({
      workedMinutes,
      hourlyWage,
      cashTips,
      creditTips,
    });
  }, [workedMinutes, hourlyWage, cashTips, creditTips]);

  const isoDate = useMemo(() => toISODate(shiftDate), [shiftDate]);

  /* =========================================================
     6) Save / Delete Actions
========================================================= */

  async function saveChanges() {
    if (!id) return;

    // Workplace checks
    if (workplaces.length === 0) {
      Alert.alert("Workplace", "Please add a workplace first.");
      router.push("/workplaces");
      return;
    }
    if (!workplaceId || !selectedWorkplace) {
      Alert.alert("Workplace", "Please select a workplace.");
      return;
    }

    // Pay/time checks
    if (hourlyWage <= 0) {
      Alert.alert("Hourly wage", "Please enter your hourly wage.");
      return;
    }
    if (workedMinutes <= 0) {
      Alert.alert("Shift time", "End time must be after start time.");
      return;
    }

    // Load all shifts
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: Shift[] = raw ? JSON.parse(raw) : [];

    // Find shift index
    const idx = arr.findIndex((s) => s.id === String(id));
    if (idx < 0) {
      Alert.alert("Not found", "This shift no longer exists.");
      router.back();
      return;
    }

    const prev = arr[idx];

    // Update the shift
    arr[idx] = {
      ...prev,

      // ✅ Save workplace to shift
      workplaceId,
      workplaceName: selectedWorkplace.name,

      // Date/time
      isoDate,
      startISO: normalizedDates.start.toISOString(),
      endISO: normalizedDates.end.toISOString(),

      // Break
      unpaidBreak,
      breakMinutes,

      // Pay & tips
      hourlyWage,
      cashTips,
      creditTips,

      // Calculated
      workedMinutes,
      workedHours: money.workedHours,
      hourlyPay: money.hourlyPay,
      totalTips: money.totalTips,
      totalEarned: money.totalEarned,

      // Note
      note: note.trim() ? note.trim() : undefined,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

    Alert.alert("Saved", "Shift updated ✅");
    router.back();
  }

  async function deleteShift() {
    if (!id) return;

    Alert.alert("Delete shift?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          const arr: Shift[] = raw ? JSON.parse(raw) : [];
          const next = arr.filter((s) => s.id !== String(id));
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          router.back();
        },
      },
    ]);
  }

  /* =========================================================
     7) Loading / Not found states
========================================================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Edit Shift</Text>
          <Text style={styles.helper}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Edit Shift</Text>
          <Text style={styles.helper}>Shift not found.</Text>

          <Pressable style={styles.saveBtn} onPress={() => router.back()}>
            <Text style={styles.saveBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* =========================================================
     8) Main UI
========================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* -------------------- Header -------------------- */}
        <View style={styles.topRow}>
          <Text style={styles.title}>Edit Shift</Text>

          <Pressable onPress={deleteShift} style={styles.deleteChip}>
            <Text style={styles.deleteChipText}>Delete</Text>
          </Pressable>
        </View>

        {/* -------------------- Workplace -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workplace</Text>

          <Text style={styles.helper}>
            Selected: {selectedWorkplace?.name ?? "None"}
          </Text>

          {workplaces.length === 0 ? (
            <Text style={styles.helper}>No workplaces found. Add one first.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {workplaces.map((w) => (
                <Pressable
                  key={w.id}
                  // ✅ Tap to change workplace
                  onPress={() => setWorkplaceId(w.id)}
                  style={[
                    styles.workplaceItem,
                    w.id === workplaceId && styles.workplaceSelected,
                  ]}
                >
                  <Text style={{ fontWeight: "800" }}>{w.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* -------------------- Date -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift Date</Text>

          <Text style={styles.label}>Date</Text>
          <Pressable style={styles.pickerBox} onPress={() => setOpenDate(true)}>
            <Text style={styles.pickerText}>{formatDate(shiftDate)}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <DateTimePickerModal
            isVisible={openDate}
            mode="date"
            date={shiftDate}
            onConfirm={(d) => {
              setOpenDate(false);
              setShiftDate(d);
            }}
            onCancel={() => setOpenDate(false)}
          />

          <Text style={styles.helper}>Saved as: {isoDate}</Text>
        </View>

        {/* -------------------- Time -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift Time</Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start</Text>
              <Pressable style={styles.pickerBox} onPress={() => setOpenStart(true)}>
                <Text style={styles.pickerText}>{formatTime(startTime)}</Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End</Text>
              <Pressable style={styles.pickerBox} onPress={() => setOpenEnd(true)}>
                <Text style={styles.pickerText}>{formatTime(endTime)}</Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            </View>
          </View>

          <DateTimePickerModal
            isVisible={openStart}
            mode="time"
            date={startTime}
            onConfirm={(d) => {
              setOpenStart(false);
              setStartTime(d);
            }}
            onCancel={() => setOpenStart(false)}
          />

          <DateTimePickerModal
            isVisible={openEnd}
            mode="time"
            date={endTime}
            onConfirm={(d) => {
              setOpenEnd(false);
              setEndTime(d);
            }}
            onCancel={() => setOpenEnd(false)}
          />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Raw minutes</Text>
            <Text style={styles.summaryValue}>{workedMinutesRaw} min</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>After break</Text>
            <Text style={styles.summaryValue}>{workedMinutes} min</Text>
          </View>
        </View>

        {/* -------------------- Break -------------------- */}
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

        {/* -------------------- Pay -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pay</Text>

          <Text style={styles.label}>Hourly Wage</Text>
          <TextInput
            value={hourlyWageText}
            onChangeText={setHourlyWageText}
            keyboardType="decimal-pad"
            placeholder="e.g. 15"
            style={styles.input}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cash Tips</Text>
              <TextInput
                value={cashTipsText}
                onChangeText={setCashTipsText}
                keyboardType="decimal-pad"
                placeholder="0"
                style={styles.input}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Credit Tips</Text>
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

        {/* -------------------- Note -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Note</Text>
          <Text style={styles.helper}>Optional</Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Write a short note…"
            multiline
            style={[styles.input, styles.noteBox]}
          />
        </View>

        {/* -------------------- Summary -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Worked hours</Text>
            <Text style={styles.summaryValue}>{money.workedHours}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hourly pay</Text>
            <Text style={styles.summaryValue}>${money.hourlyPay}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total tips</Text>
            <Text style={styles.summaryValue}>${money.totalTips}</Text>
          </View>

          <View style={[styles.summaryRow, { marginTop: 6 }]}>
            <Text style={[styles.summaryLabel, styles.totalLabel]}>Total earned</Text>
            <Text style={[styles.summaryValue, styles.totalValue]}>
              ${money.totalEarned}
            </Text>
          </View>
        </View>

        {/* -------------------- Actions -------------------- */}
        <Pressable style={styles.saveBtn} onPress={saveChanges}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: "#e5e5e5" }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.saveBtnText, { color: "#111" }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   9) Styles
========================================================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 14 },

  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800" },

  deleteChip: {
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  deleteChipText: { color: "#fff", fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },

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

  noteBox: {
    height: 96,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  pickerBox: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    backgroundColor: "#fff",
  },
  pickerText: { fontSize: 16 },
  chev: { fontSize: 24, opacity: 0.35, marginTop: -2 },

  workplaceItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  workplaceSelected: {
    borderColor: "#111",
    backgroundColor: "#E5E7EB",
  },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, opacity: 0.7 },
  summaryValue: { fontSize: 14, fontWeight: "700" },

  totalLabel: { fontSize: 15, fontWeight: "800", opacity: 0.9 },
  totalValue: { fontSize: 18, fontWeight: "900" },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
