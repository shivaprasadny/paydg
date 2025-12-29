// src/screens/entries.tsx
// ---------------------------------------------------------
// PayDG — Entries (Phase 2)
// ✅ Weekly view (Mon–Sun) grouped by DAY
// ✅ Date picker to jump to any week
// ✅ Daily totals per day
// ✅ Tap a day -> Day Details
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useFocusEffect, useRouter } from "expo-router";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

const STORAGE_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;

  workplaceId: string;
  workplaceName?: string;

  isoDate: string; // YYYY-MM-DD
  startISO: string;
  endISO: string;

  cashTips: number;
  creditTips: number;
  workedMinutes: number;
  workedHours: number;

  hourlyPay: number;
  totalTips: number;
  totalEarned: number;

  note?: string;
};

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(d: Date) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function toISODateLocal(d: Date) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtRange(a: Date, b: Date) {
  const sameYear = a.getFullYear() === b.getFullYear();
  const sameMonth = a.getMonth() === b.getMonth();

  const aText = a.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  const bText = b.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });

  return `${aText} – ${bText}`;
}

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function fmtDayHeader(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function dayTotals(shifts: Shift[]) {
  const mins = shifts.reduce((s, x) => s + (x.workedMinutes || 0), 0);
  const hours = Number((mins / 60).toFixed(2));
  const cash = shifts.reduce((s, x) => s + (x.cashTips || 0), 0);
  const card = shifts.reduce((s, x) => s + (x.creditTips || 0), 0);
  const total = shifts.reduce((s, x) => s + (x.totalEarned || 0), 0);

  return {
    count: shifts.length,
    hours,
    cash: Number(cash.toFixed(2)),
    card: Number(card.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

export default function EntriesScreen() {
  const router = useRouter();

  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];
        setAllShifts(arr);
      })();
    }, [])
  );

  const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
  const weekEnd = useMemo(() => endOfWeekSunday(anchorDate), [anchorDate]);
  const weekLabel = useMemo(() => fmtRange(weekStart, weekEnd), [weekStart, weekEnd]);

  const weekShifts = useMemo(() => {
    const min = weekStart.getTime();
    const max = weekEnd.getTime();
    return allShifts
      .filter((s) => {
        const t = new Date(s.startISO).getTime();
        return t >= min && t <= max;
      })
      .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
  }, [allShifts, weekStart, weekEnd]);

  const days = useMemo(() => {
    const list: { date: Date; iso: string; shifts: Shift[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const iso = toISODateLocal(d);
      list.push({ date: d, iso, shifts: [] });
    }

    for (const s of weekShifts) {
      const iso = s.isoDate;
      const bucket = list.find((x) => x.iso === iso);
      if (bucket) bucket.shifts.push(s);
    }

    return list;
  }, [weekStart, weekShifts]);

  return (
    <Screen pad={16}>
      <ActiveShiftTimerCard />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Entries</Text>

        <Pressable style={styles.pickBtn} onPress={() => setPickerOpen(true)}>
          <Text style={styles.pickBtnText}>Pick Week</Text>
        </Pressable>
      </View>

      <Text style={styles.subTitle}>{weekLabel}</Text>

      {/* Days */}
      {days.map((d) => {
        const totals = dayTotals(d.shifts);

        return (
          <Pressable
            key={d.iso}
            onPress={() =>
              router.push({
                pathname: "/day-details",
                params: { isoDate: d.iso, label: fmtDayHeader(d.date) },
              })
            }
            style={styles.dayCard}
          >
            <View style={styles.dayTopRow}>
              <Text style={styles.dayTitle}>{fmtDayHeader(d.date)}</Text>
              <Text style={styles.dayCount}>{totals.count} shifts</Text>
            </View>

            {totals.count === 0 ? (
              <Text style={styles.helper}>No shifts</Text>
            ) : (
              <View style={{ gap: 6 }}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Hours</Text>
                  <Text style={styles.totalValue}>{totals.hours.toFixed(2)}h</Text>
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Cash</Text>
                  <Text style={styles.totalValue}>{fmtMoney(totals.cash)}</Text>
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Card</Text>
                  <Text style={styles.totalValue}>{fmtMoney(totals.card)}</Text>
                </View>

                <View style={[styles.totalRow, { marginTop: 4 }]}>
                  <Text style={[styles.totalLabel, { fontWeight: "900" }]}>Total</Text>
                  <Text style={[styles.totalValue, { fontSize: 18 }]}>{fmtMoney(totals.total)}</Text>
                </View>

                <Text style={styles.tapHint}>Tap to view shifts →</Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Picker */}
      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="date"
        date={anchorDate}
        onConfirm={(d) => {
          setAnchorDate(d);
          setPickerOpen(false);
        }}
        onCancel={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "white", fontSize: 28, fontWeight: "900" },
  subTitle: { color: "#B8C0CC", marginTop: -2, marginBottom: 6, opacity: 0.85 },

  pickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  pickBtnText: { color: "#fff", fontWeight: "900" },

  dayCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 10,
    marginTop: 10,
  },

  dayTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayTitle: { color: "white", fontSize: 15, fontWeight: "900" },
  dayCount: { color: "#B8C0CC", fontSize: 12, opacity: 0.7 },

  helper: { color: "#B8C0CC", fontSize: 12, opacity: 0.7 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: "#B8C0CC", fontSize: 13, opacity: 0.85 },
  totalValue: { color: "white", fontSize: 16, fontWeight: "900" },

  tapHint: { color: "#B8C0CC", fontSize: 12, opacity: 0.7, marginTop: 6 },
});
