// src/screens/shift-history.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";

import { toISODate } from "../utils/dateUtils";

/* =========================================================
   Types
========================================================= */

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
   Helpers
========================================================= */

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function startOfWeek(d: Date) {
  // week starts Monday
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

/* =========================================================
   Screen
========================================================= */

export default function ShiftHistoryScreen() {
  const router = useRouter();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: Shift[] = raw ? JSON.parse(raw) : [];
      setShifts(arr);
    } finally {
      setLoading(false);
    }
  }

  // Load on first mount
  useEffect(() => {
    load();
  }, []);

  // ✅ Reload whenever user returns from Add/Edit
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const totals = useMemo(() => {
    const now = new Date();
    const todayKey = toISODate(now); // ✅ local day
    const weekStart = startOfWeek(now).getTime();
    const monthStart = startOfMonth(now).getTime();

    let today = 0;
    let week = 0;
    let month = 0;

    for (const s of shifts) {
      const startMs = new Date(s.startISO).getTime();
      if (s.isoDate === todayKey) today += s.totalEarned;
      if (startMs >= weekStart) week += s.totalEarned;
      if (startMs >= monthStart) month += s.totalEarned;
    }

    return { today, week, month };
  }, [shifts]);

  async function deleteShift(id: string) {
    Alert.alert("Delete shift?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const next = shifts.filter((s) => s.id !== id);
          setShifts(next);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* -------------------- Header -------------------- */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>History</Text>

          <Pressable onPress={load} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {/* -------------------- Totals -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Totals</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Today</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.today)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>This Week</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.week)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>This Month</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.month)}</Text>
          </View>
        </View>

        {/* -------------------- Shifts list -------------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shifts</Text>

          {loading ? (
            <Text style={styles.helper}>Loading...</Text>
          ) : shifts.length === 0 ? (
            <Text style={styles.helper}>No shifts yet. Add your first shift.</Text>
          ) : (
            shifts.map((s) => (
              <Pressable
                key={s.id}
                onPress={() =>
                  router.push({ pathname: "/edit-shift", params: { id: s.id } })
                }
                onLongPress={() => deleteShift(s.id)}
                style={styles.shiftRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftDate}>
                    {s.isoDate}
                    {s.workplaceName ? ` • ${s.workplaceName}` : ""}
                  </Text>

                  <Text style={styles.shiftMeta}>
                    {fmtTime(s.startISO)} – {fmtTime(s.endISO)} • {s.workedHours}h
                  </Text>

                  <Text style={styles.shiftMeta}>
                    Tips: {fmtMoney(s.totalTips)} • Wage: {fmtMoney(s.hourlyPay)}
                  </Text>

                  {s.note ? (
                    <Text style={styles.noteText} numberOfLines={2}>
                      Note: {s.note}
                    </Text>
                  ) : null}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.earned}>{fmtMoney(s.totalEarned)}</Text>
                  <Text style={styles.deleteHint}>Tap to edit • Hold to delete</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Text style={styles.footer}>Tip: Tap a shift to edit it.</Text>
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  title: { fontSize: 28, fontWeight: "800" },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  refreshText: { color: "#fff", fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 14, opacity: 0.7 },
  totalValue: { fontSize: 16, fontWeight: "900" },

  helper: { fontSize: 13, opacity: 0.6 },

  shiftRow: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
  },
  shiftDate: { fontSize: 15, fontWeight: "800" },
  shiftMeta: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  noteText: { fontSize: 12, opacity: 0.75, marginTop: 6 },

  earned: { fontSize: 16, fontWeight: "900" },
  deleteHint: { fontSize: 11, opacity: 0.5, marginTop: 4 },

  footer: { textAlign: "center", opacity: 0.6, marginTop: 8 },
});
