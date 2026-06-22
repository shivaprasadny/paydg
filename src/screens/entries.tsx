// src/screens/entries.tsx
// ---------------------------------------------------------
// PayDG — Entries
// Premium light finance theme
//
// ✅ Weekly view Monday–Sunday
// ✅ Date picker to jump to any week
// ✅ Daily totals per day
// ✅ Tap day card -> Day Details
// ✅ Premium cards, emojis, clean spacing
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useFocusEffect, useRouter } from "expo-router";

import Screen from "../components/Screen";

/* ---------------------------------------------------------
   PayDG Theme
--------------------------------------------------------- */

const COLORS = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  navy: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  inputBg: "#F8FAFC",
  gold: "#D97706",
  goldSoft: "#FFF7ED",
  goldBorder: "#FED7AA",
  green: "#059669",
  greenSoft: "#ECFDF5",
  greenBorder: "#A7F3D0",
};

/* ---------------------------------------------------------
   Types / Constants
--------------------------------------------------------- */

const STORAGE_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;
  workplaceId: string;
  workplaceName?: string;
  isoDate: string;
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

type DayBucket = {
  date: Date;
  iso: string;
  shifts: Shift[];
};

/* ---------------------------------------------------------
   Date Helpers
--------------------------------------------------------- */

function startOfWeekMonday(d: Date) {
  const x = new Date(d);

  x.setHours(0, 0, 0, 0);

  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;

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
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function fmtShortDay(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
  });
}

/* ---------------------------------------------------------
   Totals Helper
--------------------------------------------------------- */

function dayTotals(shifts: Shift[]) {
  const mins = shifts.reduce((sum, shift) => {
    return sum + (shift.workedMinutes || 0);
  }, 0);

  const hours = Number((mins / 60).toFixed(2));

  const cash = shifts.reduce((sum, shift) => {
    return sum + (shift.cashTips || 0);
  }, 0);

  const card = shifts.reduce((sum, shift) => {
    return sum + (shift.creditTips || 0);
  }, 0);

  const total = shifts.reduce((sum, shift) => {
    return sum + (shift.totalEarned || 0);
  }, 0);

  return {
    count: shifts.length,
    hours,
    cash: Number(cash.toFixed(2)),
    card: Number(card.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

/* =========================================================
   Screen
========================================================= */

export default function EntriesScreen() {
  const router = useRouter();

  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * Load shifts every time screen gets focus.
   */
  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: Shift[] = raw ? JSON.parse(raw) : [];
    setAllShifts(arr);
  }

  const weekStart = useMemo(() => startOfWeekMonday(anchorDate), [anchorDate]);
  const weekEnd = useMemo(() => endOfWeekSunday(anchorDate), [anchorDate]);

  const weekLabel = useMemo(
    () => fmtRange(weekStart, weekEnd),
    [weekStart, weekEnd]
  );

  /**
   * Shifts inside selected week.
   */
  const weekShifts = useMemo(() => {
    const min = weekStart.getTime();
    const max = weekEnd.getTime();

    return allShifts
      .filter((shift) => {
        const time = new Date(shift.startISO).getTime();
        return time >= min && time <= max;
      })
      .sort(
        (a, b) =>
          new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
      );
  }, [allShifts, weekStart, weekEnd]);

  /**
   * Create 7 buckets for Mon–Sun.
   */
  const days = useMemo(() => {
    const list: DayBucket[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);

      list.push({
        date,
        iso: toISODateLocal(date),
        shifts: [],
      });
    }

    for (const shift of weekShifts) {
      const bucket = list.find((day) => day.iso === shift.isoDate);

      if (bucket) {
        bucket.shifts.push(shift);
      }
    }

    return list;
  }, [weekStart, weekShifts]);

  /**
   * Weekly summary totals.
   */
  const weeklyTotals = useMemo(() => dayTotals(weekShifts), [weekShifts]);

  return (
    <Screen bg={COLORS.bg} pad={16}>

      {/* -------------------- Header -------------------- */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>PAYDG ENTRIES</Text>
          <Text style={styles.title}>Weekly Entries</Text>
          <Text style={styles.subtitle}>
            Review your shifts grouped by day.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.pickBtn,
            pressed && styles.pressed,
          ]}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={styles.pickBtnText}>📅 Pick Week</Text>
        </Pressable>
      </View>

      {/* -------------------- Week Summary -------------------- */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Selected Week</Text>
        <Text style={styles.summaryRange}>{weekLabel}</Text>

        <View style={styles.summaryGrid}>
          <MiniStat label="Earned" value={fmtMoney(weeklyTotals.total)} />
          <MiniStat label="Hours" value={`${weeklyTotals.hours.toFixed(2)}h`} />
          <MiniStat label="Shifts" value={`${weeklyTotals.count}`} />
        </View>
      </View>

      {/* -------------------- Day Cards -------------------- */}
      <View style={styles.daysList}>
        {days.map((day) => {
          const totals = dayTotals(day.shifts);
          const hasShifts = totals.count > 0;

          return (
            <Pressable
              key={day.iso}
              style={({ pressed }) => [
                styles.dayCard,
                hasShifts && styles.dayCardActive,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: "/day-details",
                  params: {
                    isoDate: day.iso,
                    label: fmtDayHeader(day.date),
                  },
                })
              }
            >
              <View style={styles.dayTopRow}>
                <View style={styles.dayTitleBox}>
                  <View
                    style={[
                      styles.dayIcon,
                      hasShifts && styles.dayIconActive,
                    ]}
                  >
                    <Text style={styles.dayIconText}>
                      {hasShifts ? "💵" : "📭"}
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.dayTitle}>
                      {fmtDayHeader(day.date)}
                    </Text>
                    <Text style={styles.daySub}>
                      {fmtShortDay(day.date)} • {day.iso}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.countPill,
                    hasShifts && styles.countPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      hasShifts && styles.countPillTextActive,
                    ]}
                  >
                    {totals.count} shifts
                  </Text>
                </View>
              </View>

              {!hasShifts ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No shifts logged.</Text>
                  <Text style={styles.tapHint}>Tap to view details →</Text>
                </View>
              ) : (
                <>
                  <View style={styles.totalGrid}>
                    <MiniStat label="Hours" value={`${totals.hours.toFixed(2)}h`} />
                    <MiniStat label="Cash" value={fmtMoney(totals.cash)} />
                    <MiniStat label="Card" value={fmtMoney(totals.card)} />
                  </View>

                  <View style={styles.totalFooter}>
                    <Text style={styles.totalFooterLabel}>Total Earned</Text>
                    <Text style={styles.totalFooterValue}>
                      {fmtMoney(totals.total)}
                    </Text>
                  </View>

                  <Text style={styles.tapHint}>Tap to view shifts →</Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* -------------------- Date Picker -------------------- */}
      <DateTimePickerModal
        isVisible={pickerOpen}
        mode="date"
        date={anchorDate}
        onConfirm={(date) => {
          setAnchorDate(date);
          setPickerOpen(false);
        }}
        onCancel={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

/* =========================================================
   Small Components
========================================================= */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  header: {
    marginTop: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.gold,
    marginBottom: 4,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.navy,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 20,
  },

  pickBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 4,
  },

  pickBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  summaryCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },

  summaryLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },

  summaryRange: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 6,
  },

  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  daysList: {
    gap: 14,
    paddingBottom: 28,
  },

  dayCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  dayCardActive: {
    borderColor: COLORS.goldBorder,
  },

  dayTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  dayTitleBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  dayIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  dayIconActive: {
    backgroundColor: COLORS.goldSoft,
    borderColor: COLORS.goldBorder,
  },

  dayIconText: {
    fontSize: 19,
  },

  dayTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  daySub: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },

  countPill: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  countPillActive: {
    backgroundColor: COLORS.greenSoft,
    borderColor: COLORS.greenBorder,
  },

  countPillText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "900",
  },

  countPillTextActive: {
    color: COLORS.green,
  },

  emptyBox: {
    marginTop: 14,
    backgroundColor: COLORS.inputBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyText: {
    color: COLORS.muted,
    fontWeight: "800",
    fontSize: 13,
  },

  totalGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  miniStat: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  miniStatLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  miniStatValue: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 5,
  },

  totalFooter: {
    marginTop: 12,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalFooterLabel: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "900",
  },

  totalFooterValue: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: "900",
  },

  tapHint: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});