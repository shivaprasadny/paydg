// src/screens/stats.tsx
// ---------------------------------------------------------
// PayDg — Stats Screen
// ✅ Weekly selector (Mon–Sun)
// ✅ Shows totals for selected week: hours, cash tips, cc tips, total earned
// ✅ Shows all entries for that week (tap entry to edit shift)
// ---------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";

import { toISODate } from "../utils/dateUtils";

type Shift = {
  id: string;

  workplaceId?: string;
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
   Helpers: money/time/week
========================================================= */

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDateShort(isoDate: string) {
  // isoDate is "YYYY-MM-DD"
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

// Week starts Monday 00:00:00
function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Sunday 23:59:59.999 (end of week)
function endOfWeekSunday(d: Date) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// Key for grouping: Monday date "YYYY-MM-DD"
function weekKeyFromDate(d: Date) {
  return toISODate(startOfWeekMonday(d));
}

function weekLabel(weekKey: string) {
  const start = new Date(weekKey + "T00:00:00");
  const end = endOfWeekSunday(start);
  return `${fmtDateShort(toISODate(start))} – ${fmtDateShort(toISODate(end))}`;
}

/* =========================================================
   Screen
========================================================= */

export default function StatsScreen() {
  const router = useRouter();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(
    weekKeyFromDate(new Date())
  );

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: Shift[] = raw ? JSON.parse(raw) : [];
      setShifts(arr);
    } finally {
      setLoading(false);
    }
  }

  // Load once
  useEffect(() => {
    load();
  }, []);

  // Reload when coming back from edit/add
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  /* =========================================================
     Build weeks list (from existing shifts + current week)
  ========================================================= */

  const weeks = useMemo(() => {
    const keys = new Set<string>();

    // Always include current week so screen isn't empty
    keys.add(weekKeyFromDate(new Date()));

    for (const s of shifts) {
      const start = new Date(s.startISO);
      keys.add(weekKeyFromDate(start));
    }

    // Sort newest week first
    const sorted = Array.from(keys).sort((a, b) => {
      const ams = new Date(a + "T00:00:00").getTime();
      const bms = new Date(b + "T00:00:00").getTime();
      return bms - ams;
    });

    return sorted;
  }, [shifts]);

  // Ensure selected week exists (if you have no data yet)
  useEffect(() => {
    if (weeks.length === 0) return;
    if (!weeks.includes(selectedWeekKey)) {
      setSelectedWeekKey(weeks[0]);
    }
  }, [weeks, selectedWeekKey]);

  /* =========================================================
     Filter shifts for selected week
  ========================================================= */

  const selectedWeek = useMemo(() => {
    const start = new Date(selectedWeekKey + "T00:00:00");
    const end = endOfWeekSunday(start);

    const filtered = shifts
      .filter((s) => {
        const ms = new Date(s.startISO).getTime();
        return ms >= start.getTime() && ms <= end.getTime();
      })
      .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());

    // Totals
    let totalMinutes = 0;
    let totalCash = 0;
    let totalCC = 0;
    let totalEarned = 0;

    for (const s of filtered) {
      totalMinutes += Number(s.workedMinutes || 0);
      totalCash += Number(s.cashTips || 0);
      totalCC += Number(s.creditTips || 0);
      totalEarned += Number(s.totalEarned || 0);
    }

    const totalHours = totalMinutes / 60;

    return {
      start,
      end,
      shifts: filtered,
      totals: {
        minutes: totalMinutes,
        hours: totalHours,
        cash: totalCash,
        cc: totalCC,
        earned: totalEarned,
      },
    };
  }, [shifts, selectedWeekKey]);

  /* =========================================================
     UI
  ========================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* -------------------- Header -------------------- */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Stats</Text>

          <Pressable style={styles.smallBtn} onPress={() => router.push("/add-shift")}>
            <Text style={styles.smallBtnText}>+ Add Shift</Text>
          </Pressable>
        </View>

        {/* -------------------- Week selector -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Stats</Text>
          <Text style={styles.helper}>Week is Monday → Sunday</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {weeks.map((wk) => {
                const active = wk === selectedWeekKey;
                return (
                  <Pressable
                    key={wk}
                    onPress={() => setSelectedWeekKey(wk)}
                    style={[styles.weekChip, active && styles.weekChipActive]}
                  >
                    <Text style={[styles.weekChipText, active && styles.weekChipTextActive]}>
                      {weekLabel(wk)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* -------------------- Totals -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Totals • {weekLabel(selectedWeekKey)}
          </Text>

          {loading ? (
            <Text style={styles.helper}>Loading…</Text>
          ) : (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Hours</Text>
                <Text style={styles.totalValue}>{selectedWeek.totals.hours.toFixed(2)}h</Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Cash tips</Text>
                <Text style={styles.totalValue}>{fmtMoney(selectedWeek.totals.cash)}</Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Card tips</Text>
                <Text style={styles.totalValue}>{fmtMoney(selectedWeek.totals.cc)}</Text>
              </View>

              <View style={[styles.totalRow, { marginTop: 8 }]}>
                <Text style={[styles.totalLabel, { fontWeight: "900" }]}>Total earned</Text>
                <Text style={[styles.totalValue, { fontSize: 18 }]}>{fmtMoney(selectedWeek.totals.earned)}</Text>
              </View>
            </>
          )}
        </View>

        {/* -------------------- Entries for selected week -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entries (this week)</Text>

          {loading ? (
            <Text style={styles.helper}>Loading…</Text>
          ) : selectedWeek.shifts.length === 0 ? (
            <Text style={styles.helper}>No entries in this week.</Text>
          ) : (
            selectedWeek.shifts.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push({ pathname: "/edit-shift", params: { id: s.id } })}
                style={styles.shiftRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftTop}>
                    {s.isoDate}
                    {s.workplaceName ? ` • ${s.workplaceName}` : ""}
                  </Text>

                  <Text style={styles.shiftMeta}>
                    {fmtTime(s.startISO)} – {fmtTime(s.endISO)} • {s.workedHours}h
                  </Text>

                  <Text style={styles.shiftMeta}>
                    Cash {fmtMoney(s.cashTips)} • Card {fmtMoney(s.creditTips)}
                  </Text>

                  {s.note ? (
                    <Text style={styles.noteText} numberOfLines={2}>
                      Note: {s.note}
                    </Text>
                  ) : null}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.earned}>{fmtMoney(s.totalEarned)}</Text>
                  <Text style={styles.editHint}>Tap to edit</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          Tip: Tap a week above to see that week’s totals + entries.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 14 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800" },

  smallBtn: {
    backgroundColor: "#111",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  smallBtnText: { color: "#fff", fontWeight: "900" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  helper: { fontSize: 12, opacity: 0.6 },

  weekChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  weekChipActive: {
    borderColor: "#111",
    backgroundColor: "#E5E7EB",
  },
  weekChipText: { fontSize: 12, fontWeight: "800", opacity: 0.8 },
  weekChipTextActive: { opacity: 1 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, opacity: 0.7 },
  totalValue: { fontSize: 16, fontWeight: "900" },

  shiftRow: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
  },
  shiftTop: { fontSize: 15, fontWeight: "900" },
  shiftMeta: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  noteText: { fontSize: 12, opacity: 0.75, marginTop: 6 },

  earned: { fontSize: 16, fontWeight: "900" },
  editHint: { fontSize: 11, opacity: 0.5, marginTop: 4 },

  footer: { textAlign: "center", opacity: 0.6, marginTop: 6 },
});
