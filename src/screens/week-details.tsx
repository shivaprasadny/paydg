// src/screens/week-details.tsx
// ---------------------------------------------------------
// PayDG — Week Details
// ✅ Used from Stats → View shifts
// ✅ Lists all shifts in selected week
// ✅ Respects workplace filter
// ✅ Tap shift -> Edit Shift
// ✅ Premium PayDG light theme
// ✅ Android bottom spacing
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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

type Shift = {
  id: string;
  workplaceId: string;
  workplaceName?: string;
  roleName?: string;
  isoDate: string;
  startISO: string;
  endISO: string;
  cashTips?: number;
  creditTips?: number;
  totalTips?: number;
  workedHours?: number;
  workedMinutes?: number;
  totalEarned: number;
  note?: string;
};

const STORAGE_KEY = "paydg_shifts_v1";

/* =========================
   HELPERS
========================= */

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getHours(s: Shift) {
  if (typeof s.workedHours === "number") return s.workedHours;
  if (typeof s.workedMinutes === "number") return s.workedMinutes / 60;
  return 0;
}

function getTips(s: Shift) {
  if (typeof s.totalTips === "number") return s.totalTips;
  return (s.cashTips || 0) + (s.creditTips || 0);
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

function ShiftRow({
  shift,
  onPress,
}: {
  shift: Shift;
  onPress: () => void;
}) {
  const hours = getHours(shift);
  const tips = getTips(shift);

  return (
    <Pressable onPress={onPress} style={styles.shiftRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.shiftTitle}>
          🏢 {shift.workplaceName ?? "Workplace"}
          {shift.roleName ? ` • ${shift.roleName}` : ""}
        </Text>

        <Text style={styles.shiftMeta}>
          📅 {shift.isoDate} • {fmtTime(shift.startISO)} –{" "}
          {fmtTime(shift.endISO)}
        </Text>

        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>⏱ {hours.toFixed(2)}h</Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipText}>🎁 {fmtMoney(tips)} tips</Text>
          </View>
        </View>

        {shift.note ? (
          <Text style={styles.note}>📝 {shift.note}</Text>
        ) : null}
      </View>

      <View style={styles.amountCol}>
        <Text style={styles.earned}>{fmtMoney(shift.totalEarned)}</Text>
        <Text style={styles.editHint}>Tap to edit</Text>
      </View>
    </Pressable>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function WeekDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    start: string;
    end: string;
    workplaceId: string;
    label: string;
  }>();

  const [shifts, setShifts] = useState<Shift[]>([]);

  const startMs = useMemo(
    () => new Date(params.start).getTime(),
    [params.start]
  );

  const endMs = useMemo(
    () => new Date(params.end).getTime(),
    [params.end]
  );

  const workplaceId = params.workplaceId ?? "ALL";
  const label = params.label ?? "Week";

  useFocusEffect(
    useCallback(() => {
      async function loadWeekShifts() {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];

        const filtered = arr
          .filter((s) => {
            const time = new Date(s.startISO).getTime();

            if (time < startMs || time > endMs) return false;
            if (workplaceId !== "ALL" && s.workplaceId !== workplaceId) {
              return false;
            }

            return true;
          })
          .sort(
            (a, b) =>
              new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
          );

        setShifts(filtered);
      }

      loadWeekShifts();
    }, [startMs, endMs, workplaceId])
  );

  const totals = useMemo(() => {
    const earned = shifts.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
    const hours = shifts.reduce((sum, s) => sum + getHours(s), 0);
    const tips = shifts.reduce((sum, s) => sum + getTips(s), 0);

    return {
      earned,
      hours,
      tips,
      count: shifts.length,
    };
  }, [shifts]);

  return (
    <Screen bg="#F6F7FB" pad={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <ActiveShiftTimerCard />

        {/* Header */}
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>📅 Week details</Text>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>
            Review all shifts from this selected week.
          </Text>

          <View style={styles.summaryGrid}>
            <SummaryMiniCard label="Shifts" value={`${totals.count}`} />
            <SummaryMiniCard label="Hours" value={`${totals.hours.toFixed(2)}h`} />
          </View>
        </View>

        {/* Weekly total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>💰 Total earned</Text>
          <Text style={styles.totalAmount}>{fmtMoney(totals.earned)}</Text>

          <Text style={styles.totalSub}>
            Tips: {fmtMoney(totals.tips)}
          </Text>
        </View>

        {/* Shift list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧾 Shifts</Text>

          {shifts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No shifts for this week</Text>
              <Text style={styles.emptyText}>
                Try another week or add a shift first.
              </Text>
            </View>
          ) : (
            shifts.map((s) => (
              <ShiftRow
                key={s.id}
                shift={s}
                onPress={() =>
                  router.push({
                    pathname: "/edit-shift",
                    params: { id: s.id },
                  })
                }
              />
            ))
          )}
        </View>

        <Text style={styles.footerText}>Tap any shift to edit it.</Text>
      </ScrollView>
    </Screen>
  );
}

/* =========================
   PAYDG PREMIUM LIGHT THEME
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 48,
    gap: 14,
  },

  heroCard: {
    backgroundColor: "#1E293B",
    borderRadius: 28,
    padding: 22,
  },
  eyebrow: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 8,
  },
  summaryGrid: {
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

  totalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  totalLabel: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  totalAmount: {
    color: "#0F172A",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 6,
  },
  totalSub: {
    color: "#D97706",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },

  shiftRow: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  shiftTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  shiftMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },

  amountCol: {
    alignItems: "flex-end",
  },
  earned: {
    color: "#D97706",
    fontSize: 17,
    fontWeight: "900",
  },
  editHint: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },

  note: {
    color: "#334155",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 14,
    padding: 10,
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
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
    fontWeight: "700",
  },

  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
  },
});