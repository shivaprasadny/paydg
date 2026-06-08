import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Shift = {
  id: string;
  workplaceId: string;
  workplaceName?: string;
  roleName?: string;
  isoDate: string;
  startISO: string;
  endISO: string;
  workedMinutes: number;
  totalEarned: number;
  totalTips?: number;
  cashTips?: number;
  creditTips?: number;
};

type Props = {
  shifts: Shift[];
};

function fmtMoney(n: number) {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function getDayName(dateStr: string) {
  return new Date(dateStr).toLocaleDateString([], { weekday: "long" });
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getThisMonthShifts(shifts: Shift[]) {
  const monthKey = getMonthKey();
  return shifts.filter((s) => s.isoDate?.startsWith(monthKey));
}

function sumEarned(shifts: Shift[]) {
  return shifts.reduce((sum, s) => sum + (s.totalEarned || 0), 0);
}

function sumHours(shifts: Shift[]) {
  return shifts.reduce((sum, s) => sum + (s.workedMinutes || 0) / 60, 0);
}

function sumTips(shifts: Shift[]) {
  return shifts.reduce((sum, s) => {
    const tips =
      typeof s.totalTips === "number"
        ? s.totalTips
        : (s.cashTips || 0) + (s.creditTips || 0);

    return sum + tips;
  }, 0);
}

function buildDailyInsights(shifts: Shift[]) {
  const monthShifts = getThisMonthShifts(shifts);

  const totalEarned = sumEarned(shifts);
  const totalHours = sumHours(shifts);
  const totalTips = sumTips(shifts);

  const monthEarned = sumEarned(monthShifts);
  const monthHours = sumHours(monthShifts);

  const avgShift = shifts.length > 0 ? totalEarned / shifts.length : 0;
  const avgHourly = totalHours > 0 ? totalEarned / totalHours : 0;
  const tipPercent = totalEarned > 0 ? (totalTips / totalEarned) * 100 : 0;

  const workplaceMap = new Map<string, { earned: number; count: number }>();
  const roleMap = new Map<string, { earned: number; count: number }>();
  const dayMap = new Map<string, { earned: number; count: number }>();

  for (const s of shifts) {
    const workplace = s.workplaceName || "Workplace";
    const role = s.roleName || "Role";
    const day = getDayName(s.isoDate);

    workplaceMap.set(workplace, {
      earned: (workplaceMap.get(workplace)?.earned || 0) + (s.totalEarned || 0),
      count: (workplaceMap.get(workplace)?.count || 0) + 1,
    });

    roleMap.set(role, {
      earned: (roleMap.get(role)?.earned || 0) + (s.totalEarned || 0),
      count: (roleMap.get(role)?.count || 0) + 1,
    });

    dayMap.set(day, {
      earned: (dayMap.get(day)?.earned || 0) + (s.totalEarned || 0),
      count: (dayMap.get(day)?.count || 0) + 1,
    });
  }

  const bestWorkplace = [...workplaceMap.entries()].sort(
    (a, b) => b[1].earned / b[1].count - a[1].earned / a[1].count
  )[0];

  const bestRole = [...roleMap.entries()].sort(
    (a, b) => b[1].earned / b[1].count - a[1].earned / a[1].count
  )[0];

  const bestDay = [...dayMap.entries()].sort(
    (a, b) => b[1].earned / b[1].count - a[1].earned / a[1].count
  )[0];

  const insights = [
    shifts.length > 0
      ? `You have logged ${shifts.length} total shifts in PayDG.`
      : "Add your first shift to start seeing smart insights.",

    totalEarned > 0
      ? `You have tracked ${fmtMoney(totalEarned)} in total earnings.`
      : "Once you add earnings, PayDG will show your income insights.",

    totalHours > 0
      ? `You have worked ${totalHours.toFixed(1)} total hours.`
      : "Your worked hours will appear here after you add shifts.",

    avgShift > 0
      ? `Your average shift earns ${fmtMoney(avgShift)}.`
      : "Your average shift value will appear after more entries.",

    avgHourly > 0
      ? `Your effective hourly average is ${fmtMoney(avgHourly)}.`
      : "PayDG can calculate your effective hourly rate after shifts are added.",

    monthEarned > 0
      ? `This month you have earned ${fmtMoney(monthEarned)}.`
      : "No earnings recorded for this month yet.",

    monthHours > 0
      ? `You have worked ${monthHours.toFixed(1)} hours this month.`
      : "Add this month's shifts to see monthly progress.",

    totalTips > 0
      ? `Tips make up ${tipPercent.toFixed(0)}% of your total earnings.`
      : "Tip insights will appear after you add cash or credit tips.",

    bestWorkplace
      ? `${bestWorkplace[0]} is your best earning workplace by average shift.`
      : "Workplace insights will appear after you add shifts.",

    bestRole
      ? `${bestRole[0]} is your highest earning role by average shift.`
      : "Role insights will appear after you add roles to shifts.",

    bestDay
      ? `${bestDay[0]} is your highest earning day on average.`
      : "Day-of-week insights will appear after more shifts.",

    shifts.length >= 10
      ? `You have enough data now to start spotting earning patterns.`
      : "Add at least 10 shifts to unlock stronger patterns.",

    shifts.length >= 25
      ? `You have logged over 25 shifts — your dashboard is getting smarter.`
      : "Your insights improve as you add more shifts.",

    shifts.length >= 50
      ? `You crossed 50 shifts tracked in PayDG. Nice consistency.`
      : "Keep logging shifts to build your earning history.",

    shifts.length >= 100
      ? `You crossed 100 shifts tracked. That's a strong record.`
      : "Long-term tracking helps you understand your real income.",

    totalEarned >= 1000
      ? `You have tracked over ${fmtMoney(1000)} in earnings.`
      : "Your first $1,000 tracked milestone is coming.",

    totalEarned >= 5000
      ? `You have tracked over ${fmtMoney(5000)} in PayDG.`
      : "PayDG will highlight larger earnings milestones over time.",

    totalEarned >= 10000
      ? `You have tracked over ${fmtMoney(10000)}. Big milestone.`
      : "Keep tracking to see your long-term earnings grow.",

    totalHours >= 100
      ? `You have tracked more than 100 working hours.`
      : "Your first 100 tracked hours milestone is coming.",

    totalHours >= 500
      ? `You have tracked more than 500 working hours.`
      : "More logged hours means more accurate income trends.",

    monthShifts.length > 0
      ? `You logged ${monthShifts.length} shifts this month.`
      : "This month has no shift entries yet.",

    monthShifts.length >= 10
      ? `You already logged 10+ shifts this month.`
      : "Log more shifts this month to build better monthly stats.",

    avgShift >= 150
      ? `Your average shift is above ${fmtMoney(150)}. Strong earning pace.`
      : "Your average shift earnings will grow as high-value shifts are added.",

    avgHourly >= 25
      ? `Your effective hourly rate is above ${fmtMoney(25)}.`
      : "Your effective hourly rate combines wages and tips.",

    tipPercent >= 30
      ? `Tips are a major part of your income at ${tipPercent.toFixed(0)}%.`
      : "Tip percentage shows how much of your income comes from tips.",

    bestWorkplace
      ? `Consider comparing more shifts at ${bestWorkplace[0]} to other workplaces.`
      : "Workplace comparison will appear after more data.",

    bestRole
      ? `${bestRole[0]} may be your strongest role financially.`
      : "Role comparison will appear after more data.",

    bestDay
      ? `${bestDay[0]} may be a good day to prioritize shifts.`
      : "Best day insights will appear after more data.",

    shifts.length > 0
      ? `Your newest entry is from ${shifts[0].isoDate}.`
      : "Your newest entry will appear after adding a shift.",

    totalEarned > 0
      ? `Every shift you log makes your PayDG insights more accurate.`
      : "Start with one shift — PayDG will do the tracking from there.",
  ];

  return insights;
}

export default function DailyInsightCard({ shifts }: Props) {
  const insight = useMemo(() => {
    const insights = buildDailyInsights(shifts);

    const today = new Date();
    const dayOfMonth = today.getDate();

    const index = (dayOfMonth - 1) % insights.length;

    return insights[index];
  }, [shifts]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Quick Insight</Text>
      <Text style={styles.subtitle}>Daily smart tip from your shift data</Text>

      <View style={styles.insightBox}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.insightText}>{insight}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  insightBox: {
    marginTop: 14,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 20,
  },
  insightText: {
    flex: 1,
    color: "#334155",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
});