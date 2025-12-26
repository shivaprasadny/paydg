// src/screens/stats.tsx
// ---------------------------------------------------------
// PayDG — Stats (Phase 1)
// ✅ Weekly (Mon–Sun) + Month + Year
// ✅ Jump to any week/month/year using date picker (no endless buttons)
// ✅ Workplace filter (All / one workplace)
// ✅ Drill-down: View shifts (week details)
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useFocusEffect, useRouter } from "expo-router";

import { listWorkplaces } from "../storage/repositories/workplaceRepo";

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
   Date helpers (week starts Monday, ends Sunday)
========================================================= */

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // to Monday
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

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfYear(d: Date) {
  const x = new Date(d.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfYear(d: Date) {
  const x = new Date(d.getFullYear(), 11, 31);
  x.setHours(23, 59, 59, 999);
  return x;
}

function fmtRange(a: Date, b: Date) {
  // Example: Dec 1 – Dec 7, 2025
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

function fmtMonth(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function fmtYear(d: Date) {
  return String(d.getFullYear());
}

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

/* =========================================================
   Totals helper
========================================================= */

function computeTotals(shifts: Shift[]) {
  const workedMinutes = shifts.reduce((s, x) => s + (x.workedMinutes || 0), 0);
  const hours = Number((workedMinutes / 60).toFixed(2));

  const cash = shifts.reduce((s, x) => s + (x.cashTips || 0), 0);
  const card = shifts.reduce((s, x) => s + (x.creditTips || 0), 0);
  const tips = Number((cash + card).toFixed(2));

  const wage = shifts.reduce((s, x) => s + (x.hourlyPay || 0), 0);
  const total = shifts.reduce((s, x) => s + (x.totalEarned || 0), 0);

  return {
    shiftsCount: shifts.length,
    hours,
    cash: Number(cash.toFixed(2)),
    card: Number(card.toFixed(2)),
    tips,
    wage: Number(wage.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

/* =========================================================
   Screen
========================================================= */

type Mode = "week" | "month" | "year";

export default function StatsScreen() {
  const router = useRouter();
  const workplaces = useMemo(() => listWorkplaces(), []);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);

  // Mode tabs
  const [mode, setMode] = useState<Mode>("week");

  // “Anchor date” = controls which week/month/year we’re looking at
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  // Pickers
  const [pickerOpen, setPickerOpen] = useState<null | "week" | "month" | "year">(null);

  // Workplace filter
  const [workplaceId, setWorkplaceId] = useState<string>("ALL");
  const [workplaceModal, setWorkplaceModal] = useState(false);

  // Load shifts whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];
        setAllShifts(arr);
      })();
    }, [])
  );

  // Date window based on mode
  const window = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeekMonday(anchorDate);
      const end = endOfWeekSunday(anchorDate);
      return { start, end, label: fmtRange(start, end) };
    }
    if (mode === "month") {
      const start = startOfMonth(anchorDate);
      const end = endOfMonth(anchorDate);
      return { start, end, label: fmtMonth(anchorDate) };
    }
    const start = startOfYear(anchorDate);
    const end = endOfYear(anchorDate);
    return { start, end, label: fmtYear(anchorDate) };
  }, [mode, anchorDate]);

  // Filter shifts by date window + workplace
  const filtered = useMemo(() => {
    const min = window.start.getTime();
    const max = window.end.getTime();

    return allShifts.filter((s) => {
      const t = new Date(s.startISO).getTime();
      if (t < min || t > max) return false;
      if (workplaceId !== "ALL" && s.workplaceId !== workplaceId) return false;
      return true;
    });
  }, [allShifts, window.start, window.end, workplaceId]);

  const totals = useMemo(() => computeTotals(filtered), [filtered]);

  const workplaceLabel = useMemo(() => {
    if (workplaceId === "ALL") return "All workplaces";
    const w = workplaces.find((x: any) => x.id === workplaceId);
    return w?.name ?? "Workplace";
  }, [workplaceId, workplaces]);

  function openPickerForCurrentMode() {
    if (mode === "week") setPickerOpen("week");
    if (mode === "month") setPickerOpen("month");
    if (mode === "year") setPickerOpen("year");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Stats</Text>

          <Pressable style={styles.filterBtn} onPress={() => setWorkplaceModal(true)}>
            <Text style={styles.filterText}>{workplaceLabel}</Text>
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setMode("week")}
            style={[styles.tab, mode === "week" && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === "week" && styles.tabTextActive]}>Week</Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("month")}
            style={[styles.tab, mode === "month" && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === "month" && styles.tabTextActive]}>Month</Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("year")}
            style={[styles.tab, mode === "year" && styles.tabActive]}
          >
            <Text style={[styles.tabText, mode === "year" && styles.tabTextActive]}>Year</Text>
          </Pressable>
        </View>

        {/* Range Picker Row */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected</Text>

          <View style={styles.rowBetween}>
            <Text style={styles.rangeText}>{window.label}</Text>

            <Pressable style={styles.pickBtn} onPress={openPickerForCurrentMode}>
              <Text style={styles.pickBtnText}>Pick</Text>
            </Pressable>
          </View>

          <Text style={styles.helper}>
            Week starts Monday and ends Sunday.
          </Text>

          {mode === "week" && (
            <Pressable
              style={[styles.pickBtn, { marginTop: 10, alignSelf: "flex-start" }]}
              onPress={() =>
                router.push({
                  pathname: "/week-details",
                  params: {
                    start: window.start.toISOString(),
                    end: window.end.toISOString(),
                    workplaceId,
                    label: window.label,
                  },
                })
              }
            >
              <Text style={styles.pickBtnText}>View shifts →</Text>
            </Pressable>
          )}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Totals</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Shifts</Text>
            <Text style={styles.totalValue}>{totals.shiftsCount}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Hours</Text>
            <Text style={styles.totalValue}>{totals.hours.toFixed(2)}h</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Hourly pay</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.wage)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Cash tips</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.cash)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Card tips</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.card)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total tips</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.tips)}</Text>
          </View>

          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <Text style={[styles.totalLabel, { fontWeight: "900" }]}>Total earned</Text>
            <Text style={[styles.totalValue, { fontSize: 18 }]}>{fmtMoney(totals.total)}</Text>
          </View>
        </View>

        {/* -------------------- Date picker modal -------------------- */}
        <DateTimePickerModal
          isVisible={pickerOpen !== null}
          mode="date"
          date={anchorDate}
          onConfirm={(d) => {
            setAnchorDate(d);
            setPickerOpen(null);
          }}
          onCancel={() => setPickerOpen(null)}
        />

        {/* -------------------- Workplace modal -------------------- */}
        <Modal transparent visible={workplaceModal} animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setWorkplaceModal(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Filter by workplace</Text>

              <Pressable
                onPress={() => {
                  setWorkplaceId("ALL");
                  setWorkplaceModal(false);
                }}
                style={[styles.modalItem, workplaceId === "ALL" && styles.modalItemActive]}
              >
                <Text style={styles.modalItemText}>All workplaces</Text>
              </Pressable>

              {workplaces.map((w: any) => {
                const active = w.id === workplaceId;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      setWorkplaceId(w.id);
                      setWorkplaceModal(false);
                    }}
                    style={[styles.modalItem, active && styles.modalItemActive]}
                  >
                    <Text style={styles.modalItemText}>{w.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   Styles (matches Settings: light theme)
========================================================= */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 12 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800" },

  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  filterText: { color: "#fff", fontWeight: "800" },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { backgroundColor: "#111" },
  tabText: { fontWeight: "800", opacity: 0.7 },
  tabTextActive: { color: "#fff", opacity: 1 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  rangeText: { fontSize: 15, fontWeight: "800" },

  helper: { fontSize: 12, opacity: 0.6 },

  pickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  pickBtnText: { color: "#fff", fontWeight: "900" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13, opacity: 0.7 },
  totalValue: { fontSize: 16, fontWeight: "900" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },

  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  modalItemActive: {
    borderColor: "#111",
    backgroundColor: "#f2f2f2",
  },
  modalItemText: { fontWeight: "800" },
});
