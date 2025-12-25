// src/screens/add-shift.tsx
// ---------------------------------------------------------
// PayDG — Add Shift (same light theme as settings.tsx)
// ✅ Native Date picker + Time picker (no typing)
// ✅ 12-hour time display (AM/PM)
// ✅ Reloads defaults from Settings/Profile each time screen opens
// ✅ Overnight shifts supported
// ✅ Workplace selection + Notes
// ✅ Preview card (hours/pay/tips/total)
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
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

  isoDate: string; // YYYY-MM-DD
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
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
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

function uid() {
  return String(Date.now());
}

/* =========================================================
   Screen
========================================================= */

export default function AddShiftScreen() {
  const router = useRouter();
  const workplaces = useMemo(() => listWorkplaces(), []);

  // -------------------- Pickers --------------------
  const isIOS = Platform.OS === "ios";
  const [pickerOpen, setPickerOpen] = useState<null | "date" | "start" | "end">(null);

  // -------------------- Form state --------------------
  const [workplaceId, setWorkplaceId] = useState(workplaces[0]?.id ?? "");

  // Date + time stored as Date objects (so picker works)
  const [shiftDateObj, setShiftDateObj] = useState(new Date());

  const [startObj, setStartObj] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [endObj, setEndObj] = useState(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });

  // Defaults from settings/profile
  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);

  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  // ✅ Reload defaults each time you open Add Shift (fixes your issue)
  useFocusEffect(
    useCallback(() => {
      const profile = getProfile();
      if (!profile) return;

      setHourlyWageText(String(profile.defaultHourlyWage ?? 0));
      setBreakMinutesText(String(profile.defaultBreakMinutes ?? 30));
      setUnpaidBreak(profile.defaultUnpaidBreak ?? true);
    }, [])
  );

  // -------------------- Derived values --------------------
  const hourlyWage = useMemo(() => parseMoney(hourlyWageText), [hourlyWageText]);
  const cashTips = useMemo(() => parseMoney(cashTipsText), [cashTipsText]);
  const creditTips = useMemo(() => parseMoney(creditTipsText), [creditTipsText]);
  const breakMinutes = useMemo(
    () => Math.min(240, Math.max(0, parseIntSafe(breakMinutesText, 30))),
    [breakMinutesText]
  );

  // ISO date for storage (YYYY-MM-DD)
  const isoDate = useMemo(() => toISODate(shiftDateObj), [shiftDateObj]);

  // Build start/end from selected date + selected times
  const { start, end } = useMemo(() => {
    const s = new Date(shiftDateObj);
    s.setHours(startObj.getHours(), startObj.getMinutes(), 0, 0);

    let e = new Date(shiftDateObj);
    e.setHours(endObj.getHours(), endObj.getMinutes(), 0, 0);

    // Overnight: if end <= start, end is next day
    if (minutesOfDay(e) <= minutesOfDay(s)) {
      e.setDate(e.getDate() + 1);
    }

    return { start: s, end: e };
  }, [shiftDateObj, startObj, endObj]);

  // Preview totals so user sees result before saving
  const preview = useMemo(() => {
    let mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    if (unpaidBreak) mins = Math.max(0, mins - breakMinutes);

    const hoursFixed = Number((mins / 60).toFixed(2));
    const hourlyPay = Number((hoursFixed * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { mins, hoursFixed, hourlyPay, tips, total };
  }, [start, end, unpaidBreak, breakMinutes, hourlyWage, cashTips, creditTips]);

  // -------------------- Picker handlers --------------------
  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (!selected) {
      // cancel
      if (!isIOS) setPickerOpen(null);
      return;
    }

    if (pickerOpen === "date") setShiftDateObj(selected);
    if (pickerOpen === "start") setStartObj(selected);
    if (pickerOpen === "end") setEndObj(selected);

    // Android closes automatically; iOS uses Done/Cancel
    if (!isIOS) setPickerOpen(null);
  }

  // -------------------- Save --------------------
  async function onSave() {
    if (!workplaceId) {
      Alert.alert("Workplace", "Please select a workplace.");
      return;
    }

    let workedMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    if (unpaidBreak) workedMinutes -= breakMinutes;
    workedMinutes = Math.max(0, workedMinutes);

    const workedHours = Number((workedMinutes / 60).toFixed(2));
    const hourlyPay = Number((workedHours * hourlyWage).toFixed(2));
    const totalTips = Number((cashTips + creditTips).toFixed(2));
    const totalEarned = Number((hourlyPay + totalTips).toFixed(2));

    const workplace = workplaces.find((w: any) => w.id === workplaceId);

    const shift: Shift = {
      id: uid(),

      workplaceId,
      workplaceName: workplace?.name,

      isoDate,
      startISO: start.toISOString(),
      endISO: end.toISOString(),

      unpaidBreak,
      breakMinutes,

      hourlyWage,
      cashTips,
      creditTips,

      workedMinutes,
      workedHours,

      hourlyPay,
      totalTips,
      totalEarned,

      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: Shift[] = raw ? JSON.parse(raw) : [];
    arr.unshift(shift);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Add Shift</Text>
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

            <Text style={styles.helper}>Tip: You can manage workplaces from Home → Manage Workplaces.</Text>
          </View>

          {/* Date & Time (tap to pick) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Date & Time</Text>

            <Text style={styles.label}>Date</Text>
            <Pressable style={styles.tapField} onPress={() => setPickerOpen("date")}>
              <Text style={styles.tapFieldText}>{fmtDate(shiftDateObj)}</Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start</Text>
                <Pressable style={styles.tapField} onPress={() => setPickerOpen("start")}>
                  <Text style={styles.tapFieldText}>{fmtTime12(startObj)}</Text>
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End</Text>
                <Pressable style={styles.tapField} onPress={() => setPickerOpen("end")}>
                  <Text style={styles.tapFieldText}>{fmtTime12(endObj)}</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.helper}>Overnight shifts supported (end earlier than start).</Text>
          </View>

          {/* Pay */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pay</Text>

            <Text style={styles.label}>Hourly wage</Text>
            <TextInput
              value={hourlyWageText}
              onChangeText={setHourlyWageText}
              keyboardType="decimal-pad"
              placeholder="e.g. 15"
              style={styles.input}
            />

            <View style={[styles.rowBetween, { marginTop: 10 }]}>
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

          {/* Tips */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tips</Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Cash</Text>
                <TextInput
                  value={cashTipsText}
                  onChangeText={setCashTipsText}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  style={styles.input}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Card</Text>
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
              <Text style={styles.previewValue}>{preview.hoursFixed.toFixed(2)}h</Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Hourly pay</Text>
              <Text style={styles.previewValue}>{fmtMoney(preview.hourlyPay)}</Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Tips</Text>
              <Text style={styles.previewValue}>{fmtMoney(preview.tips)}</Text>
            </View>

            <View style={[styles.previewRow, { marginTop: 8 }]}>
              <Text style={[styles.previewLabel, { fontWeight: "900" }]}>Total</Text>
              <Text style={[styles.previewValue, { fontSize: 18 }]}>{fmtMoney(preview.total)}</Text>
            </View>
          </View>

          {/* Save */}
          <Pressable style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>Save Shift</Text>
          </Pressable>

          {/* -------------------- Picker UI -------------------- */}
          {pickerOpen &&
            (isIOS ? (
              <Modal transparent animationType="slide" visible onRequestClose={() => setPickerOpen(null)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalSheet}>
                    <View style={styles.modalHeader}>
                      <Pressable onPress={() => setPickerOpen(null)}>
                        <Text style={styles.modalBtn}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={() => setPickerOpen(null)}>
                        <Text style={[styles.modalBtn, { fontWeight: "900" }]}>Done</Text>
                      </Pressable>
                    </View>

                    <DateTimePicker
                      value={pickerOpen === "date" ? shiftDateObj : pickerOpen === "start" ? startObj : endObj}
                      mode={pickerOpen === "date" ? "date" : "time"}
                      display="spinner"
                      onChange={onPickerChange}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={pickerOpen === "date" ? shiftDateObj : pickerOpen === "start" ? startObj : endObj}
                mode={pickerOpen === "date" ? "date" : "time"}
                display="default"
                onChange={onPickerChange}
              />
            ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
   Styles (Light theme like Settings)
========================================================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 14 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800" },

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

  tapField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  tapFieldText: {
    fontSize: 16,
    fontWeight: "800",
  },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

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

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalSheet: {
    backgroundColor: "#fff",
    padding: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  modalBtn: { fontSize: 16, color: "#111" },
});
