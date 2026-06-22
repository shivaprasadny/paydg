// src/screens/edit-shift.tsx
// ---------------------------------------------------------
// PayDG — Edit Shift
// ✅ Premium light PayDG theme
// ✅ Android/iOS keyboard-safe layout
// ✅ Extra bottom padding for Android navigation bar
// ✅ Edit date, time, pay, tips, break, and note
// ✅ Save or delete shift
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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import Screen from "../components/Screen";

const STORAGE_KEY = "paydg_shifts_v1";

/* =========================
   HELPERS
========================= */

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

/* =========================
   SMALL COMPONENTS
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

function TapField({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tapField} onPress={onPress}>
      <Text style={styles.tapText}>{value}</Text>
    </Pressable>
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
      placeholder={placeholder}
      keyboardType="decimal-pad"
      style={styles.input}
      placeholderTextColor="#94A3B8"
    />
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function EditShiftScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isIOS = Platform.OS === "ios";
  const [pickerOpen, setPickerOpen] = useState<null | "date" | "start" | "end">(
    null
  );

  const [shift, setShift] = useState<any | null>(null);

  // Editable date/time fields
  const [dateObj, setDateObj] = useState(new Date());
  const [startObj, setStartObj] = useState(new Date());
  const [endObj, setEndObj] = useState(new Date());

  // Editable pay fields
  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);

  // Editable tips/note fields
  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  /* ---------- Load selected shift ---------- */
  useFocusEffect(
    useCallback(() => {
      async function loadShift() {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        const found = arr.find((s: any) => s.id === id);

        if (!found) {
          Alert.alert("Not found", "Shift not found");
          router.back();
          return;
        }

        setShift(found);

        const start = new Date(found.startISO);
        const end = new Date(found.endISO);

        setDateObj(start);
        setStartObj(start);
        setEndObj(end);

        setHourlyWageText(String(found.hourlyWage ?? 0));
        setBreakMinutesText(String(found.breakMinutes ?? 30));
        setUnpaidBreak(found.unpaidBreak ?? true);

        setCashTipsText(String(found.cashTips ?? 0));
        setCreditTipsText(String(found.creditTips ?? 0));
        setNote(found.note ?? "");
      }

      loadShift();
    }, [id, router])
  );

  /* ---------- Derived values ---------- */
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
    () => Math.min(240, Math.max(0, parseIntSafe(breakMinutesText, 30))),
    [breakMinutesText]
  );

  const { start, end } = useMemo(() => {
    const startDate = new Date(dateObj);
    startDate.setHours(startObj.getHours(), startObj.getMinutes(), 0, 0);

    const endDate = new Date(dateObj);
    endDate.setHours(endObj.getHours(), endObj.getMinutes(), 0, 0);

    // If end time is before/equal start time, assume overnight shift.
    if (minutesOfDay(endDate) <= minutesOfDay(startDate)) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return { start: startDate, end: endDate };
  }, [dateObj, startObj, endObj]);

  const preview = useMemo(() => {
    let minutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    if (unpaidBreak) {
      minutes = Math.max(0, minutes - breakMinutes);
    }

    const hours = Number((minutes / 60).toFixed(2));
    const hourlyPay = Number((hours * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { hours, hourlyPay, tips, total };
  }, [start, end, unpaidBreak, breakMinutes, hourlyWage, cashTips, creditTips]);

  /* ---------- Date/time picker handler ---------- */
  function onPickerChange(_: DateTimePickerEvent, d?: Date) {
    if (!d) return;

    if (pickerOpen === "date") setDateObj(d);
    if (pickerOpen === "start") setStartObj(d);
    if (pickerOpen === "end") setEndObj(d);

    if (!isIOS) setPickerOpen(null);
  }

  /* ---------- Save shift ---------- */
  async function onSave() {
    if (!shift) return;

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];

    const updated = arr.map((s: any) =>
      s.id === shift.id
        ? {
            ...s,
            isoDate: start.toISOString().slice(0, 10),
            startISO: start.toISOString(),
            endISO: end.toISOString(),
            hourlyWage,
            breakMinutes,
            unpaidBreak,
            cashTips,
            creditTips,
            workedHours: preview.hours,
            workedMinutes: Math.round(preview.hours * 60),
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

  /* ---------- Delete shift ---------- */
  async function onDelete() {
    if (!shift) return;

    Alert.alert("Delete shift?", "This cannot be undone.", [
      {
        text: "Cancel",
        style: "cancel",
      },
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
    <Screen bg="#F6F7FB" pad={0}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={isIOS ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.container}
          >

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.eyebrow}>✏️ Shift details</Text>
              <Text style={styles.title}>Edit Shift</Text>
              <Text style={styles.subtitle}>
                Update time, pay, tips, break, and notes.
              </Text>
            </View>

            {/* Date and time */}
            <SectionCard title="📅 Date & Time" subtitle="Overnight shifts are supported.">
              <FieldLabel>Date</FieldLabel>
              <TapField value={fmtDate(dateObj)} onPress={() => setPickerOpen("date")} />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Start</FieldLabel>
                  <TapField
                    value={fmtTime12(startObj)}
                    onPress={() => setPickerOpen("start")}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <FieldLabel>End</FieldLabel>
                  <TapField
                    value={fmtTime12(endObj)}
                    onPress={() => setPickerOpen("end")}
                  />
                </View>
              </View>
            </SectionCard>

            {/* Pay */}
            <SectionCard title="💵 Pay" subtitle="Hourly wage and unpaid break.">
              <FieldLabel>Hourly wage</FieldLabel>
              <MoneyInput
                value={hourlyWageText}
                onChangeText={setHourlyWageText}
                placeholder="0.00"
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Deduct unpaid break</Text>
                  <Text style={styles.switchSub}>Subtract break time from paid hours.</Text>
                </View>

                <Switch
                  value={unpaidBreak}
                  onValueChange={setUnpaidBreak}
                  trackColor={{ false: "#CBD5E1", true: "#FDBA74" }}
                  thumbColor={unpaidBreak ? "#D97706" : "#F8FAFC"}
                />
              </View>

              <FieldLabel>Break minutes</FieldLabel>
              <TextInput
                value={breakMinutesText}
                onChangeText={setBreakMinutesText}
                keyboardType="number-pad"
                style={styles.input}
                placeholderTextColor="#94A3B8"
              />
            </SectionCard>

            {/* Tips */}
            <SectionCard title="🎁 Tips" subtitle="Track cash and card tips separately.">
              <FieldLabel>Cash tips</FieldLabel>
              <MoneyInput
                value={cashTipsText}
                onChangeText={setCashTipsText}
                placeholder="0.00"
              />

              <FieldLabel>Card tips</FieldLabel>
              <MoneyInput
                value={creditTipsText}
                onChangeText={setCreditTipsText}
                placeholder="0.00"
              />
            </SectionCard>

            {/* Note */}
            <SectionCard title="📝 Note">
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Add a note about this shift..."
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.noteInput]}
              />
            </SectionCard>

            {/* Preview */}
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>💰 Updated total</Text>
              <Text style={styles.previewTotal}>{fmtMoney(preview.total)}</Text>

              <View style={styles.previewGrid}>
                <View style={styles.previewMini}>
                  <Text style={styles.previewMiniLabel}>Hours</Text>
                  <Text style={styles.previewMiniValue}>{preview.hours.toFixed(2)}h</Text>
                </View>

                <View style={styles.previewMini}>
                  <Text style={styles.previewMiniLabel}>Hourly pay</Text>
                  <Text style={styles.previewMiniValue}>{fmtMoney(preview.hourlyPay)}</Text>
                </View>

                <View style={styles.previewMini}>
                  <Text style={styles.previewMiniLabel}>Tips</Text>
                  <Text style={styles.previewMiniValue}>{fmtMoney(preview.tips)}</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <Pressable style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveText}>Save Changes</Text>
            </Pressable>

            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>Delete Shift</Text>
            </Pressable>

            <Text style={styles.bottomNote}>
              Changes are saved only on this device.
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Native date/time picker */}
      {pickerOpen ? (
        <DateTimePicker
          value={
            pickerOpen === "date"
              ? dateObj
              : pickerOpen === "start"
              ? startObj
              : endObj
          }
          mode={pickerOpen === "date" ? "date" : "time"}
          onChange={onPickerChange}
        />
      ) : null}
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

  header: {
    marginTop: 2,
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
    fontWeight: "700",
    marginTop: 6,
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
  },
  tapText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },

  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
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
  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  deleteBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    color: "#B91C1C",
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