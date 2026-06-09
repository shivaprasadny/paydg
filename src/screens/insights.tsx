// src/screens/insights.tsx
// ---------------------------------------------------------
// PayDG — Insights V2
// ✅ Reads shifts from AsyncStorage: paydg_shifts_v1
// ✅ Premium PayDG light theme
// ✅ Day / Week / Month / Year filters
// ✅ Previous / Next period navigation
// ✅ Expandable insight cards
// ✅ Charts using react-native-chart-kit
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import Screen from "../components/Screen";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

const STORAGE_KEY = "paydg_shifts_v1";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 36;
const CHART_WIDTH = CARD_WIDTH - 34;

type Period = "DAY" | "WEEK" | "MONTH" | "YEAR";

type Shift = {
  id: string;
  workplaceId: string;
  workplaceName?: string;
  roleId?: string;
  roleName?: string;
  isoDate: string;
  startISO: string;
  endISO: string;
  workedMinutes?: number;
  workedHours?: number;
  hourlyPay?: number;
  cashTips?: number;
  creditTips?: number;
  totalTips?: number;
  totalEarned?: number;
  note?: string;
};

type Totals = {
  shifts: number;
  earned: number;
  hours: number;
  hourlyPay: number;
  cashTips: number;
  cardTips: number;
  totalTips: number;
  avgShift: number;
  avgHourly: number;
};

/* =========================
   HELPERS
========================= */

function money(n: number) {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
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

function getShiftDate(s: Shift) {
  return new Date(s.startISO);
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;

  x.setDate(x.getDate() + diff);
  return x;
}

function endOfWeekSunday(d: Date) {
  const x = startOfWeekMonday(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getPeriodWindow(period: Period, anchor: Date) {
  const start = new Date(anchor);
  const end = new Date(anchor);

  if (period === "DAY") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (period === "WEEK") {
    return {
      start: startOfWeekMonday(anchor),
      end: endOfWeekSunday(anchor),
    };
  }

  if (period === "MONTH") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }

  if (period === "YEAR") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function movePeriodDate(period: Period, anchor: Date, direction: "PREV" | "NEXT") {
  const next = new Date(anchor);
  const amount = direction === "NEXT" ? 1 : -1;

  if (period === "DAY") next.setDate(next.getDate() + amount);
  if (period === "WEEK") next.setDate(next.getDate() + amount * 7);
  if (period === "MONTH") next.setMonth(next.getMonth() + amount);
  if (period === "YEAR") next.setFullYear(next.getFullYear() + amount);

  return next;
}

function getPeriodLabel(period: Period, anchor: Date) {
  if (period === "DAY") {
    return anchor.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (period === "WEEK") {
    const { start, end } = getPeriodWindow("WEEK", anchor);

    const a = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    const b = end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `${a} – ${b}`;
  }

  if (period === "MONTH") {
    return anchor.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  return String(anchor.getFullYear());
}

function previousPeriodWindow(period: Period, anchor: Date) {
  const prevAnchor = movePeriodDate(period, anchor, "PREV");
  return getPeriodWindow(period, prevAnchor);
}

function filterShiftsByWindow(shifts: Shift[], start: Date, end: Date) {
  const min = start.getTime();
  const max = end.getTime();

  return shifts.filter((s) => {
    const t = getShiftDate(s).getTime();
    return t >= min && t <= max;
  });
}

function computeTotals(shifts: Shift[]): Totals {
  const earned = shifts.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
  const hours = shifts.reduce((sum, s) => sum + getHours(s), 0);
  const hourlyPay = shifts.reduce((sum, s) => sum + (s.hourlyPay || 0), 0);
  const cashTips = shifts.reduce((sum, s) => sum + (s.cashTips || 0), 0);
  const cardTips = shifts.reduce((sum, s) => sum + (s.creditTips || 0), 0);
  const totalTips = shifts.reduce((sum, s) => sum + getTips(s), 0);

  return {
    shifts: shifts.length,
    earned,
    hours,
    hourlyPay,
    cashTips,
    cardTips,
    totalTips,
    avgShift: shifts.length > 0 ? earned / shifts.length : 0,
    avgHourly: hours > 0 ? earned / hours : 0,
  };
}

function pctChange(previous: number, current: number) {
  if (!previous || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function dayName(index: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index];
}

function monthName(index: number) {
  return new Date(2026, index, 1).toLocaleDateString(undefined, {
    month: "short",
  });
}

/* =========================
   CHART CONFIG
========================= */

const chartConfig = {
  backgroundGradientFrom: "#FFFFFF",
  backgroundGradientTo: "#FFFFFF",
  decimalPlaces: 0,
  color: () => "#D97706",
  labelColor: () => "#64748B",
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#D97706",
  },
  propsForLabels: {
    fontWeight: "700",
  },
};

const pieColors = ["#D97706", "#16A34A", "#1E293B"];

/* =========================
   SMALL COMPONENTS
========================= */

function PeriodChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.periodChip, active && styles.periodChipActive]}
    >
      <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function InsightCard({
  id,
  title,
  summary,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.insightCard}>
      <Pressable onPress={() => onToggle(id)}>
        <View style={styles.insightHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>{title}</Text>
            <Text style={styles.insightSummary}>{summary}</Text>
          </View>

          <Text style={styles.expandIcon}>{expanded ? "−" : "+"}</Text>
        </View>
      </Pressable>

      {expanded ? <View style={styles.expandedArea}>{children}</View> : null}
    </View>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function InsightsScreen() {
  const router = useRouter();

  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [period, setPeriod] = useState<Period>("WEEK");
  const [anchorDate, setAnchorDate] = useState(new Date());

  const [expandedId, setExpandedId] = useState<string | null>("summary");

  useFocusEffect(
    useCallback(() => {
      async function loadShifts() {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];

        arr.sort(
          (a, b) =>
            new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
        );

        setAllShifts(arr);
      }

      loadShifts();
    }, [])
  );

  function toggleCard(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  const { start, end } = useMemo(
    () => getPeriodWindow(period, anchorDate),
    [period, anchorDate]
  );

  const prevWindow = useMemo(
    () => previousPeriodWindow(period, anchorDate),
    [period, anchorDate]
  );

  const currentShifts = useMemo(
    () => filterShiftsByWindow(allShifts, start, end),
    [allShifts, start, end]
  );

  const previousShifts = useMemo(
    () => filterShiftsByWindow(allShifts, prevWindow.start, prevWindow.end),
    [allShifts, prevWindow.start, prevWindow.end]
  );

  const totals = useMemo(() => computeTotals(currentShifts), [currentShifts]);
  const prevTotals = useMemo(() => computeTotals(previousShifts), [previousShifts]);
  const lifetimeTotals = useMemo(() => computeTotals(allShifts), [allShifts]);

  const earnPct = pctChange(prevTotals.earned, totals.earned);

  /* =========================
     CHART DATA — PERIOD VS PREVIOUS
  ========================= */

  const comparisonChartData = {
    labels: ["Earned", "Tips", "Hours"],
    datasets: [
      {
        data: [
          Number(prevTotals.earned.toFixed(0)),
          Number(prevTotals.totalTips.toFixed(0)),
          Number(prevTotals.hours.toFixed(0)),
        ],
      },
      {
        data: [
          Number(totals.earned.toFixed(0)),
          Number(totals.totalTips.toFixed(0)),
          Number(totals.hours.toFixed(0)),
        ],
      },
    ],
    legend: ["Previous", "Current"],
  };

  /* =========================
     CHART DATA — BEST DAY
  ========================= */

  const weekdayAverages = useMemo(() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);

    for (const s of currentShifts) {
      const d = getShiftDate(s).getDay();
      sums[d] += s.totalEarned || 0;
      counts[d] += 1;
    }

    return sums.map((sum, index) => ({
      label: dayName(index),
      value: counts[index] > 0 ? sum / counts[index] : 0,
    }));
  }, [currentShifts]);

  const bestDay = weekdayAverages.reduce(
    (best, item) => (item.value > best.value ? item : best),
    { label: "—", value: 0 }
  );

  const weekdayChartData = {
    labels: weekdayAverages.map((x) => x.label),
    datasets: [{ data: weekdayAverages.map((x) => Number(x.value.toFixed(0))) }],
  };

  /* =========================
     CHART DATA — TIPS
  ========================= */

  const tipsPieData = [
    {
      name: "Hourly",
      amount: Math.max(totals.hourlyPay, 0),
      color: pieColors[2],
      legendFontColor: "#334155",
      legendFontSize: 12,
    },
    {
      name: "Cash",
      amount: Math.max(totals.cashTips, 0),
      color: pieColors[0],
      legendFontColor: "#334155",
      legendFontSize: 12,
    },
    {
      name: "Card",
      amount: Math.max(totals.cardTips, 0),
      color: pieColors[1],
      legendFontColor: "#334155",
      legendFontSize: 12,
    },
  ].filter((x) => x.amount > 0);

  const tipPercent =
    totals.earned > 0 ? (totals.totalTips / totals.earned) * 100 : 0;

  /* =========================
     CHART DATA — WORK HABITS
  ========================= */

  const hoursByDay = useMemo(() => {
    const hours = Array(7).fill(0);

    for (const s of currentShifts) {
      const d = getShiftDate(s).getDay();
      hours[d] += getHours(s);
    }

    return hours.map((value, index) => ({
      label: dayName(index),
      value,
    }));
  }, [currentShifts]);

  const hoursChartData = {
    labels: hoursByDay.map((x) => x.label),
    datasets: [{ data: hoursByDay.map((x) => Number(x.value.toFixed(1))) }],
  };

  const longestShift = currentShifts.reduce(
    (max, s) => Math.max(max, getHours(s)),
    0
  );

  const lateNightCount = currentShifts.filter((s) => {
    const startDate = new Date(s.startISO);
    const endDate = new Date(s.endISO);

    return (
      endDate.getDate() !== startDate.getDate() ||
      endDate.getHours() < 6
    );
  }).length;

  /* =========================
     CHART DATA — MILESTONES
  ========================= */

  const monthlyTrend = useMemo(() => {
    const year = anchorDate.getFullYear();
    const totalsByMonth = Array(12).fill(0);

    for (const s of allShifts) {
      const d = getShiftDate(s);

      if (d.getFullYear() === year) {
        totalsByMonth[d.getMonth()] += s.totalEarned || 0;
      }
    }

    return totalsByMonth.map((value, index) => ({
      label: monthName(index),
      value,
    }));
  }, [allShifts, anchorDate]);

  const monthlyTrendData = {
    labels: monthlyTrend.map((x) => x.label),
    datasets: [
      {
        data: monthlyTrend.map((x) => Number(x.value.toFixed(0))),
      },
    ],
  };

  const bestSingleShift = allShifts.reduce(
    (best, s) =>
      (s.totalEarned || 0) > (best?.totalEarned || 0) ? s : best,
    null as Shift | null
  );

  /* =========================
     CARD SUMMARIES
  ========================= */

  const summaryText =
    totals.shifts === 0
      ? "No shifts in this period yet."
      : `You earned ${money(totals.earned)} across ${totals.shifts} shift${
          totals.shifts === 1 ? "" : "s"
        }.`;

  const comparisonText =
    earnPct == null
      ? `Current period: ${money(totals.earned)}.`
      : `You earned ${Math.abs(earnPct).toFixed(0)}% ${
          earnPct >= 0 ? "more" : "less"
        } than the previous period.`;

  const patternsText =
    bestDay.value > 0
      ? `${bestDay.label} is your best earning day in this period.`
      : "Add more shifts to discover your best day.";

  const tipText =
    totals.earned > 0
      ? `Tips are ${tipPercent.toFixed(0)}% of your income.`
      : "Add tips to see cash/card insights.";

  const habitsText =
    totals.shifts > 0
      ? `Your average shift is ${
          totals.shifts > 0 ? (totals.hours / totals.shifts).toFixed(1) : "0"
        } hours.`
      : "Add shifts to see work habits.";

  const milestoneText =
    lifetimeTotals.shifts > 0
      ? `You tracked ${lifetimeTotals.shifts} shifts and ${money(
          lifetimeTotals.earned
        )} total.`
      : "Your milestones will appear after you add shifts.";

  return (
    <Screen bg="#F6F7FB" pad={0}>
      <Stack.Screen options={{ title: "Insights" }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <ActiveShiftTimerCard />

        {/* =========================
            HEADER
        ========================= */}
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>✨ PayDG insights</Text>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>
            Smart patterns from your shifts, tips, hours, workplaces, and roles.
          </Text>
        </View>

        {/* =========================
            PERIOD FILTERS
        ========================= */}
        <View style={styles.periodTabs}>
          {(["DAY", "WEEK", "MONTH", "YEAR"] as Period[]).map((p) => (
            <PeriodChip
              key={p}
              label={p}
              active={period === p}
              onPress={() => {
                setPeriod(p);
                setAnchorDate(new Date());
              }}
            />
          ))}
        </View>

        {/* =========================
            PERIOD NAVIGATION
        ========================= */}
        <View style={styles.periodNav}>
          <Pressable
            style={styles.navBtn}
            onPress={() =>
              setAnchorDate((d) => movePeriodDate(period, d, "PREV"))
            }
          >
            <Text style={styles.navText}>‹</Text>
          </Pressable>

          <Text style={styles.periodLabel}>
            {getPeriodLabel(period, anchorDate)}
          </Text>

          <Pressable
            style={styles.navBtn}
            onPress={() =>
              setAnchorDate((d) => movePeriodDate(period, d, "NEXT"))
            }
          >
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>

        {/* =========================
            EMPTY STATE
        ========================= */}
        {allShifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptyText}>
              Add a few shifts first. Then PayDG will show patterns like best
              day, best workplace, tips percentage, and work habits.
            </Text>
          </View>
        ) : null}

        {/* =========================
            1. SMART SUMMARY
        ========================= */}
        <InsightCard
          id="summary"
          title="💡 Smart Summary"
          summary={summaryText}
          expanded={expandedId === "summary"}
          onToggle={toggleCard}
        >
          <View style={styles.gridTwo}>
            <MiniStat label="Earned" value={money(totals.earned)} />
            <MiniStat label="Hours" value={`${totals.hours.toFixed(2)}h`} />
            <MiniStat label="Avg / Shift" value={money(totals.avgShift)} />
            <MiniStat label="Avg / Hour" value={money(totals.avgHourly)} />
          </View>

          <Text style={styles.explainText}>
            This summary is based only on the selected period.
          </Text>
        </InsightCard>

        {/* =========================
            2. PERIOD VS PREVIOUS
        ========================= */}
        <InsightCard
          id="compare"
          title="📅 This Period vs Previous"
          summary={comparisonText}
          expanded={expandedId === "compare"}
          onToggle={toggleCard}
        >
          <BarChart
            data={comparisonChartData}
            width={CHART_WIDTH}
            height={230}
            chartConfig={chartConfig}
            yAxisLabel="$"
            yAxisSuffix=""
            fromZero
            showValuesOnTopOfBars
            style={styles.chart}
          />

          <Text style={styles.explainText}>
            Compares earned income, tips, and hours with the previous same
            period.
          </Text>
        </InsightCard>

        {/* =========================
            3. BEST PATTERNS
        ========================= */}
        <InsightCard
          id="patterns"
          title="🏆 Best Patterns"
          summary={patternsText}
          expanded={expandedId === "patterns"}
          onToggle={toggleCard}
        >
          <BarChart
            data={weekdayChartData}
            width={CHART_WIDTH}
            height={230}
            chartConfig={chartConfig}
            yAxisLabel="$"
            yAxisSuffix=""
            fromZero
            showValuesOnTopOfBars
            style={styles.chart}
          />

          <Text style={styles.explainText}>
            Shows average earning by weekday for this selected period.
          </Text>
        </InsightCard>

        {/* =========================
            4. TIP INSIGHTS
        ========================= */}
        <InsightCard
          id="tips"
          title="🎁 Tip Insights"
          summary={tipText}
          expanded={expandedId === "tips"}
          onToggle={toggleCard}
        >
          {tipsPieData.length === 0 ? (
            <Text style={styles.emptyText}>No tip chart data for this period.</Text>
          ) : (
            <PieChart
              data={tipsPieData}
              width={CHART_WIDTH}
              height={220}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute
            />
          )}

          <View style={styles.gridTwo}>
            <MiniStat label="Cash tips" value={money(totals.cashTips)} />
            <MiniStat label="Card tips" value={money(totals.cardTips)} />
            <MiniStat label="Total tips" value={money(totals.totalTips)} />
            <MiniStat label="Tip %" value={`${tipPercent.toFixed(0)}%`} />
          </View>
        </InsightCard>

        {/* =========================
            5. WORK HABITS
        ========================= */}
        <InsightCard
          id="habits"
          title="⏱ Work Habits"
          summary={habitsText}
          expanded={expandedId === "habits"}
          onToggle={toggleCard}
        >
          <BarChart
            data={hoursChartData}
            width={CHART_WIDTH}
            height={230}
            chartConfig={chartConfig}
            yAxisLabel=""
            yAxisSuffix="h"
            fromZero
            showValuesOnTopOfBars
            style={styles.chart}
          />

          <View style={styles.gridTwo}>
            <MiniStat
              label="Avg shift"
              value={
                totals.shifts > 0
                  ? `${(totals.hours / totals.shifts).toFixed(1)}h`
                  : "0h"
              }
            />
            <MiniStat label="Longest shift" value={`${longestShift.toFixed(1)}h`} />
            <MiniStat label="Late nights" value={`${lateNightCount}`} />
            <MiniStat label="Shifts" value={`${totals.shifts}`} />
          </View>
        </InsightCard>

        {/* =========================
            6. MILESTONES
        ========================= */}
        <InsightCard
          id="milestones"
          title="🔥 Milestones"
          summary={milestoneText}
          expanded={expandedId === "milestones"}
          onToggle={toggleCard}
        >
          <LineChart
            data={monthlyTrendData}
            width={CHART_WIDTH}
            height={230}
            chartConfig={chartConfig}
            yAxisLabel="$"
            yAxisSuffix=""
            bezier
            style={styles.chart}
          />

          <View style={styles.gridTwo}>
            <MiniStat label="Lifetime earned" value={money(lifetimeTotals.earned)} />
            <MiniStat label="Lifetime hours" value={`${lifetimeTotals.hours.toFixed(0)}h`} />
            <MiniStat label="Total shifts" value={`${lifetimeTotals.shifts}`} />
            <MiniStat
              label="Best shift"
              value={bestSingleShift ? money(bestSingleShift.totalEarned || 0) : "$0.00"}
            />
          </View>
        </InsightCard>

        {/* =========================
            FUTURE SPACE
            Later we can add:
            - Best workplace chart
            - Best role chart
            - Tip percentage trend
            - Export insight summary
            - AI-generated insight text
        ========================= */}

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
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
    paddingBottom: 56,
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
    fontSize: 34,
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

  periodTabs: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 4,
    flexDirection: "row",
  },
  periodChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
  },
  periodChipActive: {
    backgroundColor: "#D97706",
  },
  periodChipText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },

  periodNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    color: "#D97706",
    fontSize: 30,
    fontWeight: "900",
  },
  periodLabel: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },

  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  insightTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  insightSummary: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 5,
  },
  expandIcon: {
    color: "#D97706",
    fontSize: 30,
    fontWeight: "900",
  },
  expandedArea: {
    marginTop: 16,
    gap: 14,
  },

  gridTwo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniStat: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
  },
  miniLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  miniValue: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 6,
  },

  chart: {
    borderRadius: 18,
  },
  explainText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
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
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 6,
  },

  backBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});