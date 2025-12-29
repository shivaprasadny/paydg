// app/insights.tsx (or src/screens/insights.tsx)
// ---------------------------------------------------------
// PayDG — Insights (Rules-based)
// ✅ Reads from SQLite shifts table
// ✅ No AI, just patterns
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import Screen from "../components/Screen";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import { Stack } from "expo-router";

// ✅ SQLite
import { listShifts } from "../storage/repositories/shiftRepo";
import { listWorkplaces } from "../storage/repositories/workplaceRepo";

type Insight = { title: string; body: string; tone?: "good" | "neutral" | "warn" };

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

function pctChange(prev: number, cur: number) {
  if (!Number.isFinite(prev) || prev <= 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  return Number.isFinite(pct) ? pct : null;
}

function startOfWeekMon(d: Date) {
  // Monday start
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  x.setDate(x.getDate() + diff);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function InsightsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [shifts, setShifts] = useState<any[]>([]);
  const [workplaceNameById, setWorkplaceNameById] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      // Load from SQLite (sync repos)
      const s = listShifts();
      const wps = listWorkplaces();
      const map: Record<string, string> = {};
      for (const w of wps) map[w.id] = w.name;

      setWorkplaceNameById(map);
      setShifts(s);
      setLoading(false);
    }, [])
  );

  const insights = useMemo<Insight[]>(() => {
    if (!shifts.length) return [];

    // Totals
    let totalEarn = 0;
    let totalTips = 0;
    let totalHourly = 0;
    let cashTotal = 0;
    let creditTotal = 0;

    // Weekend vs weekday
    let weekendEarn = 0;
    let weekdayEarn = 0;

    // By workplace
    const wpEarn = new Map<string, number>();
    const wpCount = new Map<string, number>();
    const wpTips = new Map<string, number>();

    // By day of week (avg)
    const dayEarn = new Map<number, number>();
    const dayCount = new Map<number, number>();

    // Late-night
    let lateNightCount = 0;

    // Tip % best shift
    let bestTipPct = -1;
    let bestTipPctShift: any | null = null;

    // Work dates for streak
    const workedDays = new Set<string>();

    // For week comparison
    const now = new Date();
    const thisMon = startOfWeekMon(now);
    const lastMon = new Date(thisMon);
    lastMon.setDate(lastMon.getDate() - 7);
    const nextMon = new Date(thisMon);
    nextMon.setDate(nextMon.getDate() + 7);

    let thisWeekEarn = 0,
      lastWeekEarn = 0,
      thisWeekTips = 0,
      lastWeekTips = 0,
      thisWeekHourly = 0,
      lastWeekHourly = 0;

    for (const s of shifts) {
      const earned = Number(s.totalEarned || 0);
      const tips = Number(s.totalTips || 0);
      const hourly = Number(s.hourlyPay || 0);
      const cash = Number(s.cashTips || 0);
      const credit = Number(s.creditTips || 0);

      totalEarn += earned;
      totalTips += tips;
      totalHourly += hourly;
      cashTotal += cash;
      creditTotal += credit;

      const start = new Date(s.startTs);
      const end = new Date(s.endTs);

      // streak day key
      workedDays.add(dateKey(start));

      // weekend/weekday
      const day = start.getDay();
      const isWeekend = day === 0 || day === 6;
      if (isWeekend) weekendEarn += earned;
      else weekdayEarn += earned;

      // workplace buckets
      const wpName = workplaceNameById[s.workplaceId] ?? "Unknown workplace";
      wpEarn.set(wpName, (wpEarn.get(wpName) || 0) + earned);
      wpTips.set(wpName, (wpTips.get(wpName) || 0) + tips);
      wpCount.set(wpName, (wpCount.get(wpName) || 0) + 1);

      // day-of-week avg
      dayEarn.set(day, (dayEarn.get(day) || 0) + earned);
      dayCount.set(day, (dayCount.get(day) || 0) + 1);

      // late-night (end next day OR ends after midnight hour)
      if (end.getDate() !== start.getDate() || end.getHours() < 6) {
        lateNightCount += 1;
      }

      // tip percentage
      if (earned > 0) {
        const tipPct = (tips / earned) * 100;
        if (tipPct > bestTipPct) {
          bestTipPct = tipPct;
          bestTipPctShift = s;
        }
      }

      // week buckets
      if (start >= thisMon && start < nextMon) {
        thisWeekEarn += earned;
        thisWeekTips += tips;
        thisWeekHourly += hourly;
      } else if (start >= lastMon && start < thisMon) {
        lastWeekEarn += earned;
        lastWeekTips += tips;
        lastWeekHourly += hourly;
      }
    }

    // Best workplace by avg per shift
    let bestWpAvgName = "";
    let bestWpAvg = 0;
    for (const [name, sum] of wpEarn.entries()) {
      const c = wpCount.get(name) || 1;
      const avg = sum / c;
      if (avg > bestWpAvg) {
        bestWpAvg = avg;
        bestWpAvgName = name;
      }
    }

    // Best day of week by avg
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let bestDay = -1;
    let bestDayAvg = 0;
    for (const [d, sum] of dayEarn.entries()) {
      const c = dayCount.get(d) || 1;
      const avg = sum / c;
      if (avg > bestDayAvg) {
        bestDayAvg = avg;
        bestDay = d;
      }
    }

    // Streak: count backwards from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (workedDays.has(dateKey(d))) streak++;
      else break;
    }

    const list: Insight[] = [];

    // ⭐ Fun fact (dynamic)
    const cashPct = totalTips > 0 ? (cashTotal / totalTips) * 100 : 0;
    const funFact =
      totalTips > 0
        ? cashPct >= 60
          ? `Fun fact: ${cashPct.toFixed(
              0
            )}% of your tips are CASH. Track it — cash gets forgotten the fastest. 😄`
          : `Fun fact: ${creditTotal > cashTotal ? "Most" : "A lot"} of your tips are on CARD. Good tracking = better tax time. ✅`
        : `Fun fact: Add a few shifts and PayDG will start showing patterns automatically. 😄`;

    list.push({
      title: "🎯 Fun fact",
      body: funFact,
      tone: "good",
    });

    // Week vs last week
    const earnPct = pctChange(lastWeekEarn, thisWeekEarn);
    const tipsPct = pctChange(lastWeekTips, thisWeekTips);
    const hourlyPct = pctChange(lastWeekHourly, thisWeekHourly);

    list.push({
      title: "📅 This week vs last week",
      body:
        `Total: ${money(thisWeekEarn)} ` +
        (earnPct == null ? "" : `(${earnPct >= 0 ? "+" : ""}${earnPct.toFixed(0)}%)`) +
        `\nTips: ${money(thisWeekTips)} ` +
        (tipsPct == null ? "" : `(${tipsPct >= 0 ? "+" : ""}${tipsPct.toFixed(0)}%)`) +
        `\nHourly: ${money(thisWeekHourly)} ` +
        (hourlyPct == null ? "" : `(${hourlyPct >= 0 ? "+" : ""}${hourlyPct.toFixed(0)}%)`),
      tone: "neutral",
    });

    // Weekend vs weekday
    const weekendPct = pctChange(weekdayEarn, weekendEarn);
    list.push({
      title: "🗓️ Weekend vs Weekday",
      body:
        weekendPct == null
          ? `Weekend: ${money(weekendEarn)} • Weekday: ${money(weekdayEarn)}`
          : `You earn ${Math.abs(weekendPct).toFixed(0)}% ${
              weekendPct >= 0 ? "more" : "less"
            } on weekends.\nWeekend: ${money(weekendEarn)} • Weekday: ${money(weekdayEarn)}`,
      tone: weekendPct != null && weekendPct < 0 ? "warn" : "neutral",
    });

    // Best day
    if (bestDay >= 0) {
      list.push({
        title: "🏆 Best day of the week",
        body: `${dayNames[bestDay]} is your highest average day: ${money(bestDayAvg)} per shift.`,
        tone: "good",
      });
    }

    // Best workplace avg
    if (bestWpAvgName) {
      list.push({
        title: "🏢 Most profitable workplace",
        body: `${bestWpAvgName} has the best average shift: ${money(bestWpAvg)} per shift.`,
        tone: "good",
      });
    }

    // Tip split
    list.push({
      title: "💳 Tips split (cash vs card)",
      body:
        `Cash: ${money(cashTotal)}\n` +
        `Card: ${money(creditTotal)}\n` +
        (totalTips > 0 ? `Cash share: ${(cashTotal / totalTips * 100).toFixed(0)}%` : ""),
      tone: "neutral",
    });

    // Tip % best shift
    if (bestTipPctShift && bestTipPct >= 0) {
      const wpName =
        workplaceNameById[bestTipPctShift.workplaceId] ?? "Unknown workplace";
      list.push({
        title: "🔥 Highest tip percentage shift",
        body: `${wpName} • ${bestTipPctShift.role}\nTips were ${bestTipPct.toFixed(
          0
        )}% of your total that shift.`,
        tone: "good",
      });
    }

    // Late night
    if (lateNightCount > 0) {
      list.push({
        title: "🌙 Late-night shifts",
        body: `You worked ${lateNightCount} late-night/overnight shift${
          lateNightCount === 1 ? "" : "s"
        }. Overnight shifts are tracked correctly in PayDG ✅`,
        tone: "neutral",
      });
    }

    // Streak
    list.push({
      title: "📈 Work streak",
      body:
        streak >= 2
          ? `You’ve worked ${streak} days in a row. Respect. 💪`
          : streak === 1
          ? `You worked today. Keep the momentum 💪`
          : `No streak right now — add a shift and start one today 😊`,
      tone: "neutral",
    });

    return list;
  }, [shifts, workplaceNameById]);

  return (
    <Screen pad={16}>
        <Stack.Screen options={{ title: "Insights" }} />

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
            Add a few shifts first. Then you’ll see weekend patterns, best day, best workplace,
            and comparisons.
          </Text>
        </View>
      ) : (
        insights.map((x, idx) => (
          <View
            key={idx}
            style={[
              styles.card,
              x.tone === "good" ? styles.cardGood : null,
              x.tone === "warn" ? styles.cardWarn : null,
            ]}
          >
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
  sub: { color: "#B8C0CC", marginTop: 10,marginBottom:4, lineHeight: 18 },

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
  cardGood: {
    borderColor: "#14532D",
    backgroundColor: "#0B2A17",
  },
  cardWarn: {
    borderColor: "#7F1D1D",
    backgroundColor: "#2A0B0B",
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
