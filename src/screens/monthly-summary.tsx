// src/screens/monthly-summary.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
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
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

const SHIFTS_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;
  startISO: string;
  totalEarned?: number;
  hourlyPay?: number;
  totalTips?: number;
  cashTips?: number;
  creditTips?: number;
  workedHours?: number;
  workedMinutes?: number;
  workplaceName?: string;
  roleName?: string;
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
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

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shiftHours(s: Shift) {
  if (typeof s.workedHours === "number") return s.workedHours;
  if (typeof s.workedMinutes === "number") return Number((s.workedMinutes / 60).toFixed(2));
  return 0;
}

function shiftTips(s: Shift) {
  if (typeof s.totalTips === "number") return s.totalTips;
  const cash = typeof s.cashTips === "number" ? s.cashTips : 0;
  const card = typeof s.creditTips === "number" ? s.creditTips : 0;
  return cash + card;
}

export default function MonthlySummaryScreen() {
  const router = useRouter();
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [anchor, setAnchor] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(SHIFTS_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];
        setAllShifts(arr);
      })();
    }, [])
  );

  const mStart = useMemo(() => startOfMonth(anchor), [anchor]);
  const mEnd = useMemo(() => endOfMonth(anchor), [anchor]);

  const monthShifts = useMemo(() => {
    const min = mStart.getTime();
    const max = mEnd.getTime();
    return allShifts
      .filter((s) => {
        const t = new Date(s.startISO).getTime();
        return t >= min && t <= max;
      })
      .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());
  }, [allShifts, mStart, mEnd]);

  const summary = useMemo(() => {
    const totalEarned = monthShifts.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
    const totalHours = monthShifts.reduce((sum, s) => sum + shiftHours(s), 0);
    const totalTips = monthShifts.reduce((sum, s) => sum + shiftTips(s), 0);

    const cash = monthShifts.reduce((sum, s) => sum + (s.cashTips || 0), 0);
    const card = monthShifts.reduce((sum, s) => sum + (s.creditTips || 0), 0);

    const avgHourly = totalHours > 0 ? totalEarned / totalHours : 0;

    // Best workplace
    const byWp = new Map<string, number>();
    for (const s of monthShifts) {
      const k = s.workplaceName || "Unknown";
      byWp.set(k, (byWp.get(k) || 0) + (s.totalEarned || 0));
    }
    let bestWp = "";
    let bestWpVal = 0;
    for (const [k, v] of byWp) {
      if (v > bestWpVal) {
        bestWpVal = v;
        bestWp = k;
      }
    }

    // Best role
    const byRole = new Map<string, number>();
    for (const s of monthShifts) {
      const k = s.roleName || "No role";
      byRole.set(k, (byRole.get(k) || 0) + (s.totalEarned || 0));
    }
    let bestRole = "";
    let bestRoleVal = 0;
    for (const [k, v] of byRole) {
      if (v > bestRoleVal) {
        bestRoleVal = v;
        bestRole = k;
      }
    }

    // Best day of week (by tips)
    const byDow = new Map<string, number>();
    for (const s of monthShifts) {
      const d = new Date(s.startISO);
      const name = d.toLocaleDateString(undefined, { weekday: "long" });
      byDow.set(name, (byDow.get(name) || 0) + shiftTips(s));
    }
    let bestDay = "";
    let bestDayVal = 0;
    for (const [k, v] of byDow) {
      if (v > bestDayVal) {
        bestDayVal = v;
        bestDay = k;
      }
    }

    return {
      count: monthShifts.length,
      totalEarned,
      totalHours,
      totalTips,
      cash,
      card,
      avgHourly,
      bestWp,
      bestWpVal,
      bestRole,
      bestRoleVal,
      bestDay,
      bestDayVal,
    };
  }, [monthShifts]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

                <ActiveShiftTimerCard />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Monthly Summary</Text>
          <Pressable style={styles.pickBtn} onPress={() => setPickerOpen(true)}>
            <Text style={styles.pickBtnText}>Pick Month</Text>
          </Pressable>
        </View>

        <Text style={styles.subTitle}>{monthLabel(anchor)}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Totals</Text>

          <Row label="Shifts" value={`${summary.count}`} />
          <Row label="Hours" value={`${summary.totalHours.toFixed(2)}h`} />
          <Row label="Total income" value={money(summary.totalEarned)} />
          <Row label="Total tips" value={money(summary.totalTips)} />
          <Row label="Cash tips" value={money(summary.cash)} />
          <Row label="Card tips" value={money(summary.card)} />

          <View style={[styles.divider, { marginTop: 10 }]} />

          <Row label="Avg hourly" value={money(summary.avgHourly)} bold />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Highlights</Text>

          <Row
            label="Best workplace"
            value={summary.bestWp ? `${summary.bestWp} (${money(summary.bestWpVal)})` : "—"}
          />
          <Row
            label="Best role"
            value={summary.bestRole ? `${summary.bestRole} (${money(summary.bestRoleVal)})` : "—"}
          />
          <Row
            label="Best tip day"
            value={summary.bestDay ? `${summary.bestDay} (${money(summary.bestDayVal)})` : "—"}
          />
        </View>

        <Pressable style={[styles.btn, { backgroundColor: "#111827" }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>

        <DateTimePickerModal
          isVisible={pickerOpen}
          mode="date"
          date={anchor}
          onConfirm={(d) => {
            setAnchor(d);
            setPickerOpen(false);
          }}
          onCancel={() => setPickerOpen(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: "900" }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0F1A" },
  container: { padding: 16, paddingBottom: 30, gap: 12 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "white", fontSize: 28, fontWeight: "900" },
  subTitle: { color: "#B8C0CC", marginTop: -6 },

  pickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  pickBtnText: { color: "#fff", fontWeight: "900" },

  card: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },

  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: "#B8C0CC", fontSize: 13 },
  rowValue: { color: "white", fontSize: 16, fontWeight: "900" },

  divider: { height: 1, backgroundColor: "#1F2937" },

  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 4,
  },
  btnText: { color: "white", fontWeight: "900", fontSize: 16 },
});
