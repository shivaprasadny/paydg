// src/screens/monthly-summary.tsx
// ---------------------------------------------------------
// PayDG — Monthly Summary
// ✅ Premium light PayDG theme
// ✅ Android-friendly top/bottom spacing through Screen + ScrollView
// ✅ Month picker
// ✅ Totals + highlights
// ✅ Emoji labels for easier scanning
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Stack, useFocusEffect, useRouter } from "expo-router";

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

/* =========================
   HELPERS
========================= */

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
  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function shiftHours(s: Shift) {
  if (typeof s.workedHours === "number") return s.workedHours;

  if (typeof s.workedMinutes === "number") {
    return Number((s.workedMinutes / 60).toFixed(2));
  }

  return 0;
}

function shiftTips(s: Shift) {
  if (typeof s.totalTips === "number") return s.totalTips;

  const cash = typeof s.cashTips === "number" ? s.cashTips : 0;
  const card = typeof s.creditTips === "number" ? s.creditTips : 0;

  return cash + card;
}

/* =========================
   SMALL COMPONENTS
========================= */

function SummaryMiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={[styles.row, bold && styles.rowHighlight]}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>
        {label}
      </Text>

      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>
        {value}
      </Text>
    </View>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function MonthlySummaryScreen() {
  const router = useRouter();

  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [anchor, setAnchor] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadMonthlySummary() {
        const raw = await AsyncStorage.getItem(SHIFTS_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];
        setAllShifts(arr);
      }

      loadMonthlySummary();
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
      .sort(
        (a, b) =>
          new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
      );
  }, [allShifts, mStart, mEnd]);

  const summary = useMemo(() => {
    const totalEarned = monthShifts.reduce(
      (sum, s) => sum + (s.totalEarned || 0),
      0
    );

    const totalHours = monthShifts.reduce(
      (sum, s) => sum + shiftHours(s),
      0
    );

    const totalTips = monthShifts.reduce(
      (sum, s) => sum + shiftTips(s),
      0
    );

    const cash = monthShifts.reduce(
      (sum, s) => sum + (s.cashTips || 0),
      0
    );

    const card = monthShifts.reduce(
      (sum, s) => sum + (s.creditTips || 0),
      0
    );

    const avgHourly = totalHours > 0 ? totalEarned / totalHours : 0;

    const byWp = new Map<string, number>();
    const byRole = new Map<string, number>();
    const byDowTips = new Map<string, number>();

    for (const s of monthShifts) {
      const workplace = s.workplaceName || "Unknown";
      const role = s.roleName || "No role";
      const day = new Date(s.startISO).toLocaleDateString(undefined, {
        weekday: "long",
      });

      byWp.set(workplace, (byWp.get(workplace) || 0) + (s.totalEarned || 0));
      byRole.set(role, (byRole.get(role) || 0) + (s.totalEarned || 0));
      byDowTips.set(day, (byDowTips.get(day) || 0) + shiftTips(s));
    }

    let bestWp = "";
    let bestWpVal = 0;

    for (const [name, value] of byWp) {
      if (value > bestWpVal) {
        bestWp = name;
        bestWpVal = value;
      }
    }

    let bestRole = "";
    let bestRoleVal = 0;

    for (const [name, value] of byRole) {
      if (value > bestRoleVal) {
        bestRole = name;
        bestRoleVal = value;
      }
    }

    let bestDay = "";
    let bestDayVal = 0;

    for (const [name, value] of byDowTips) {
      if (value > bestDayVal) {
        bestDay = name;
        bestDayVal = value;
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
    <Screen bg="#F6F7FB" pad={0}>
      <Stack.Screen options={{ title: "Monthly Summary" }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <ActiveShiftTimerCard />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>📅 Monthly report</Text>
            <Text style={styles.title}>Monthly Summary</Text>
            <Text style={styles.subtitle}>{monthLabel(anchor)}</Text>
          </View>

          <Pressable
            style={styles.pickBtn}
            onPress={() => setPickerOpen(true)}
          >
            <Text style={styles.pickBtnText}>Pick Month</Text>
          </Pressable>
        </View>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>💰 Total income</Text>
          <Text style={styles.heroAmount}>{money(summary.totalEarned)}</Text>

          <View style={styles.heroMiniRow}>
            <SummaryMiniCard label="Shifts" value={`${summary.count}`} />
            <SummaryMiniCard
              label="Hours"
              value={`${summary.totalHours.toFixed(2)}h`}
            />
          </View>
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Totals</Text>

          <Row label="🧾 Shifts" value={`${summary.count}`} />
          <Row label="⏱ Hours" value={`${summary.totalHours.toFixed(2)}h`} />
          <Row label="💵 Cash tips" value={money(summary.cash)} />
          <Row label="💳 Card tips" value={money(summary.card)} />
          <Row label="🎁 Total tips" value={money(summary.totalTips)} />
          <Row label="💰 Total income" value={money(summary.totalEarned)} bold />
          <Row label="⚡ Avg hourly" value={money(summary.avgHourly)} bold />
        </View>

        {/* Highlights */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ Highlights</Text>

          <Row
            label="🏢 Best workplace"
            value={
              summary.bestWp
                ? `${summary.bestWp} (${money(summary.bestWpVal)})`
                : "—"
            }
          />

          <Row
            label="👔 Best role"
            value={
              summary.bestRole
                ? `${summary.bestRole} (${money(summary.bestRoleVal)})`
                : "—"
            }
          />

          <Row
            label="📆 Best tip day"
            value={
              summary.bestDay
                ? `${summary.bestDay} (${money(summary.bestDayVal)})`
                : "—"
            }
          />
        </View>

        {/* Empty state */}
        {summary.count === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No shifts this month</Text>
            <Text style={styles.emptyText}>
              Pick another month or add a shift to see your monthly summary.
            </Text>
          </View>
        ) : null}

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>

        <Text style={styles.bottomNote}>
          Summary is calculated from shifts saved on this device.
        </Text>
      </ScrollView>

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
    </Screen>
  );
}

/* =========================
   PAYDG PREMIUM LIGHT THEME
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 44,
    gap: 14,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  eyebrow: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },

  pickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#1E293B",
  },
  pickBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  heroCard: {
    backgroundColor: "#1E293B",
    borderRadius: 28,
    padding: 22,
  },
  heroLabel: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
    marginTop: 8,
  },
  heroMiniRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  miniCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  miniLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
  },
  miniValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  rowHighlight: {
    marginTop: 6,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  rowLabel: {
    flex: 1,
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
  rowLabelBold: {
    color: "#92400E",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  rowValueBold: {
    color: "#92400E",
    fontSize: 17,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "600",
  },

  backBtn: {
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
  },
  backBtnText: {
    color: "#FFFFFF",
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