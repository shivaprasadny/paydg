// src/screens/insights.tsx
// ---------------------------------------------------------
// PayDG — Insights
// ✅ Simple insights from your existing shifts data
// ✅ No AI, just rules
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";

import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

const SHIFTS_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;
  startISO: string;
  workplaceName?: string;
  roleName?: string;
  totalEarned?: number;
  totalTips?: number;
  cashTips?: number;
  creditTips?: number;
};

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

function pctChange(a: number, b: number) {
  // compare b vs a (a=baseline, b=current)
  if (!Number.isFinite(a) || a <= 0) return null;
  const pct = ((b - a) / a) * 100;
  return Number.isFinite(pct) ? pct : null;
}

function tipsOf(s: Shift) {
  if (typeof s.totalTips === "number") return s.totalTips;
  const cash = typeof s.cashTips === "number" ? s.cashTips : 0;
  const card = typeof s.creditTips === "number" ? s.creditTips : 0;
  return cash + card;
}

export default function InsightsScreen() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const raw = await AsyncStorage.getItem(SHIFTS_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];
        setShifts(arr);
        setLoading(false);
      })();
    }, [])
  );

  const insights = useMemo(() => {
    if (!shifts.length) return [];

    // --- Weekend vs Weekday ---
    let weekendEarn = 0;
    let weekdayEarn = 0;

    // --- Workplace totals ---
    const wpEarn = new Map<string, number>();
    const wpTips = new Map<string, number>();

    // --- Role totals ---
    const roleEarn = new Map<string, number>();
    const roleTips = new Map<string, number>();

    for (const s of shifts) {
      const earned = Number(s.totalEarned || 0);
      const tips = Number(tipsOf(s) || 0);

      const d = new Date(s.startISO);
      const day = d.getDay(); // 0 Sun..6 Sat
      const isWeekend = day === 0 || day === 6;

      if (isWeekend) weekendEarn += earned;
      else weekdayEarn += earned;

      const wp = s.workplaceName || "Unknown workplace";
      wpEarn.set(wp, (wpEarn.get(wp) || 0) + earned);
      wpTips.set(wp, (wpTips.get(wp) || 0) + tips);

      const role = s.roleName || "No role";
      roleEarn.set(role, (roleEarn.get(role) || 0) + earned);
      roleTips.set(role, (roleTips.get(role) || 0) + tips);
    }

    // pick best workplace by tips
    let bestWp = "";
    let bestWpTips = 0;
    for (const [k, v] of wpTips) {
      if (v > bestWpTips) {
        bestWpTips = v;
        bestWp = k;
      }
    }

    // pick best role by income
    let bestRole = "";
    let bestRoleEarn = 0;
    for (const [k, v] of roleEarn) {
      if (v > bestRoleEarn) {
        bestRoleEarn = v;
        bestRole = k;
      }
    }

    const weekendPct = pctChange(weekdayEarn, weekendEarn); // weekend vs weekday

    const list: { title: string; body: string }[] = [];

    // Weekend insight
    if (weekendEarn > 0 || weekdayEarn > 0) {
      const body =
        weekendPct == null
          ? `Weekend income: ${money(weekendEarn)} • Weekday income: ${money(weekdayEarn)}`
          : `You earn ${Math.abs(weekendPct).toFixed(0)}% ${
              weekendPct >= 0 ? "more" : "less"
            } on weekends.\nWeekend: ${money(weekendEarn)} • Weekday: ${money(weekdayEarn)}`;

      list.push({ title: "Weekend vs Weekday", body });
    }

    // Best workplace tips
    if (bestWp) {
      list.push({
        title: "Top workplace for tips",
        body: `${bestWp} has the highest tips total: ${money(bestWpTips)}.`,
      });
    }

    // Best role income
    if (bestRole) {
      list.push({
        title: "Best role",
        body: `${bestRole} is your top-earning role: ${money(bestRoleEarn)}.`,
      });
    }

    // If there are 2+ roles, compare top two
    const roleSorted = Array.from(roleEarn.entries()).sort((a, b) => b[1] - a[1]);
    if (roleSorted.length >= 2) {
      const [r1, v1] = roleSorted[0];
      const [r2, v2] = roleSorted[1];
      const pct = pctChange(v2, v1);
      if (pct != null) {
        list.push({
          title: "Role comparison",
          body: `${r1} earns about ${pct.toFixed(0)}% more than ${r2}.`,
        });
      }
    }

    // If there are 2+ workplaces, compare top two by tips
    const wpSorted = Array.from(wpTips.entries()).sort((a, b) => b[1] - a[1]);
    if (wpSorted.length >= 2) {
      const [w1, t1] = wpSorted[0];
      const [w2, t2] = wpSorted[1];
      const pct = pctChange(t2, t1);
      if (pct != null) {
        list.push({
          title: "Workplace tips comparison",
          body: `${w1} tips are about ${pct.toFixed(0)}% higher than ${w2}.`,
        });
      }
    }

    return list;
  }, [shifts]);

  return (
    <Screen pad={16}>
      <ActiveShiftTimerCard />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Insights</Text>
        <Pressable style={styles.btnSmall} onPress={() => router.back()}>
          <Text style={styles.btnSmallText}>Back</Text>
        </Pressable>
      </View>

      <Text style={styles.sub}>
        Quick patterns from your data. The more shifts you add, the smarter this gets.
      </Text>

      {loading ? (
        <Text style={styles.helper}>Loading...</Text>
      ) : insights.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No insights yet</Text>
          <Text style={styles.body}>
            Add a few shifts first. Then you’ll see weekend patterns, best workplace/role, and
            comparisons.
          </Text>
        </View>
      ) : (
        insights.map((x, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardTitle}>{x.title}</Text>
            <Text style={styles.body}>{x.body}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { color: "white", fontSize: 28, fontWeight: "900" },
  sub: { color: "#B8C0CC", marginTop: -6, lineHeight: 18 },

  helper: { color: "#B8C0CC", opacity: 0.7, marginTop: 8 },

  card: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginTop: 12,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  body: { color: "#B8C0CC", fontSize: 14, lineHeight: 20 },

  btnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  btnSmallText: { color: "white", fontWeight: "900" },
});
