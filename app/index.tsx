// app/index.tsx

import React, { useCallback, useMemo, useState } from "react";
import DailyInsightCard from "@/src/components/DailyInsightCard";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Screen from "../src/components/Screen";
import ActiveShiftTimerCard from "@/src/components/ActiveShiftTimerCard";

import { getLanguage } from "../src/i18n";
import { getProfile } from "../src/storage/repositories/profileRepo";
import { listWorkplaces } from "../src/storage/repositories/workplaceRepo";

import {
  autoCloseIfNeeded,
  getActivePunch,
  type ActivePunch,
} from "../src/storage/repositories/punchRepo";

/* =========================
   TYPES / CONSTANTS
========================= */

const SHIFT_STORAGE_KEY = "paydg_shifts_v1";
const WEEKLY_GOAL = 1000;

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

/* =========================
   HELPERS
========================= */

function fmtMoney(n: number) {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function fmtTime(iso?: string) {
  if (!iso) return "--";

  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

/* =========================
   UI COMPONENTS
========================= */

function HeaderAction({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.headerAction, primary && styles.headerActionPrimary]}
    >
      <Text
        style={[
          styles.headerActionText,
          primary && styles.headerActionPrimaryText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
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
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function RecentEntry({
  shift,
  workplaceName,
  onPress,
}: {
  shift: Shift;
  workplaceName: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.entryRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.entryTitle}>
          {workplaceName}
          {shift.roleName ? ` • ${shift.roleName}` : ""}
        </Text>

        <Text style={styles.entrySub}>
          {shift.isoDate} • {fmtTime(shift.startISO)} - {fmtTime(shift.endISO)}
        </Text>
      </View>

      <Text style={styles.entryAmount}>{fmtMoney(shift.totalEarned)}</Text>
    </TouchableOpacity>
  );
}

function MenuItem({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuItem}>
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* =========================
   HOME SCREEN
========================= */

export default function Home() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState(getProfile());
  const [workplaces, setWorkplaces] = useState(listWorkplaces());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activePunch, setActivePunch] = useState<ActivePunch | null>(null);

  const wpNameById = useMemo(() => {
    return new Map(workplaces.map((w) => [w.id, w.name]));
  }, [workplaces]);

  const loadHome = useCallback(async () => {
    await autoCloseIfNeeded();

    setProfile(getProfile());
    setWorkplaces(listWorkplaces());

    const raw = await AsyncStorage.getItem(SHIFT_STORAGE_KEY);
    const arr: Shift[] = raw ? JSON.parse(raw) : [];

    arr.sort(
      (a, b) =>
        new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
    );

    setShifts(arr);

    const punch = await getActivePunch();
    setActivePunch(punch);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [loadHome])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  }, [loadHome]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekStart = startOfWeek(now).getTime();
    const monthStart = startOfMonth(now).getTime();

    let todayEarned = 0;
    let todayHours = 0;
    let weekEarned = 0;
    let weekHours = 0;
    let monthEarned = 0;
    let monthHours = 0;
    let lifetimeEarned = 0;
    let lifetimeHours = 0;

    for (const s of shifts) {
      const started = new Date(s.startISO).getTime();
      const hours = (s.workedMinutes || 0) / 60;
      const earned = s.totalEarned || 0;

      lifetimeEarned += earned;
      lifetimeHours += hours;

      if (s.isoDate === todayKey) {
        todayEarned += earned;
        todayHours += hours;
      }

      if (started >= weekStart) {
        weekEarned += earned;
        weekHours += hours;
      }

      if (started >= monthStart) {
        monthEarned += earned;
        monthHours += hours;
      }
    }

    const todayEffectiveRate =
      todayHours > 0 ? todayEarned / todayHours : 0;

    const avgPerShift = shifts.length > 0 ? lifetimeEarned / shifts.length : 0;

    return {
      todayEarned,
      todayHours,
      todayEffectiveRate,
      weekEarned,
      weekHours,
      monthEarned,
      monthHours,
      lifetimeEarned,
      lifetimeHours,
      totalShifts: shifts.length,
      avgPerShift,
      weeklyGoalPercent: Math.min((weekEarned / WEEKLY_GOAL) * 100, 100),
    };
  }, [shifts]);

  const recentShifts = shifts.slice(0, 3);

  const insightText = useMemo(() => {
    if (shifts.length < 3) {
      return "Add a few more shifts to unlock better insights.";
    }

    if (stats.weekEarned >= WEEKLY_GOAL) {
      return "Great job — you already reached your weekly goal.";
    }

    if (stats.weekHours > 0) {
      return `You worked ${stats.weekHours.toFixed(
        1
      )}h this week. Keep going to reach your weekly goal.`;
    }

    return "No shifts logged this week yet. Add an entry to start tracking.";
  }, [shifts.length, stats.weekEarned, stats.weekHours]);

  if (!profile) return <Redirect href="/profile" />;
  if (workplaces.length === 0) return <Redirect href="/workplaces" />;

  return (
    <>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {profile.userName} 👋
            </Text>
            <Text style={styles.subLine}>
              {workplaces.length} workplace
              {workplaces.length > 1 ? "s" : ""} • {getLanguage().toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <HeaderAction
              label="+ Entry"
              primary
              onPress={() => router.push("/add-shift")}
            />
            <HeaderAction
              label="⏱ Punch"
              onPress={() => router.push("/punch")}
            />
            <HeaderAction label="☰ Menu" onPress={() => setMenuOpen(true)} />
          </View>
        </View>

        {/* Active badge */}
        <View
          style={[
            styles.statusBadge,
            activePunch ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <Text
            style={[
              styles.statusTitle,
              activePunch ? styles.statusTitleActive : styles.statusTitleInactive,
            ]}
          >
            {activePunch ? "🟢 Active shift" : "⚪ No active shift"}
          </Text>

          <Text style={styles.statusText}>
            {activePunch
              ? "Timer is running. Open Punch when your shift ends."
              : "Start Punch when your shift begins or add a past entry."}
          </Text>
        </View>

        <ActiveShiftTimerCard />

        {/* Today's Earnings */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Today’s Earnings</Text>
          <Text style={styles.heroAmount}>{fmtMoney(stats.todayEarned)}</Text>

          <View style={styles.heroStats}>
            <MiniStat label="Hours" value={`${stats.todayHours.toFixed(2)}h`} />
            <MiniStat
              label="Effective Rate"
              value={fmtMoney(stats.todayEffectiveRate)}
            />
          </View>
        </View>

        {/* This Week Pace */}
        <SectionCard title="This Week Pace" subtitle="Your current weekly progress">
          <View style={styles.weekGrid}>
            <MiniStat label="Earned" value={fmtMoney(stats.weekEarned)} />
            <MiniStat label="Hours" value={`${stats.weekHours.toFixed(2)}h`} />
            <MiniStat label="Avg / Shift" value={fmtMoney(stats.avgPerShift)} />
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${stats.weeklyGoalPercent}%` },
              ]}
            />
          </View>

          <Text style={styles.goalText}>
            Weekly goal: {fmtMoney(stats.weekEarned)} / {fmtMoney(WEEKLY_GOAL)}
          </Text>
        </SectionCard>

        {/* Recent Entries */}
        <SectionCard title="Recent Entries" subtitle="Your latest 3 shifts">
          {recentShifts.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet.</Text>
          ) : (
            recentShifts.map((shift) => {
              const workplaceName =
                shift.workplaceName ||
                wpNameById.get(shift.workplaceId) ||
                "Workplace";

              return (
                <RecentEntry
                  key={shift.id}
                  shift={shift}
                  workplaceName={workplaceName}
                  onPress={() => router.push(`/edit-shift?id=${shift.id}`)}
                />
              );
            })
          )}

          <TouchableOpacity
            onPress={() => router.push("/entries")}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>View all entries →</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* Quick Insight */}

<DailyInsightCard shifts={shifts} />


        {/* Lifetime */}
        <SectionCard title="Lifetime Stats" subtitle="All-time PayDG tracking">
          <View style={styles.weekGrid}>
            <MiniStat label="Earned" value={fmtMoney(stats.lifetimeEarned)} />
            <MiniStat label="Hours" value={`${stats.lifetimeHours.toFixed(0)}h`} />
            <MiniStat label="Shifts" value={`${stats.totalShifts}`} />
          </View>
        </SectionCard>

        <Text style={styles.tip}>
          Pull down to refresh your dashboard.
        </Text>
      </ScrollView>

      {/* Burger Menu */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)}>
                <Text style={styles.drawerClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <MenuItem label="📊 Stats" onPress={() => router.push("/stats")} />
              <MenuItem label="📅 Monthly Summary" onPress={() => router.push("/monthly-summary")} />
              <MenuItem label="📜 History" onPress={() => router.push("/history")} />
              <MenuItem label="✨ Insights" onPress={() => router.push("/insights")} />
              <MenuItem label="🏢 Workplaces" onPress={() => router.push("/workplaces")} />
              <MenuItem label="👔 Roles" onPress={() => router.push("/roles")} />
              <MenuItem label="⚙️ Settings" onPress={() => router.push("/settings")} />
              <MenuItem label="📘 Quick Guide" onPress={() => router.push("/quick-guide")} />
              <MenuItem label="💾 Backup / Restore" onPress={() => router.push("/backup")} />
              <MenuItem label="ℹ️ About" onPress={() => router.push("/about")} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },

  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  greeting: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  name: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  subLine: {
    color: "#64748B",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
  },

  headerActions: {
    gap: 8,
    alignItems: "flex-end",
  },
  headerAction: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  headerActionPrimary: {
    backgroundColor: "#D97706",
    borderColor: "#D97706",
  },
  headerActionText: {
    color: "#1E293B",
    fontSize: 12,
    fontWeight: "900",
  },
  headerActionPrimaryText: {
    color: "#FFFFFF",
  },

  statusBadge: {
    marginTop: 18,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
  },
  statusInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  statusTitleActive: {
    color: "#15803D",
  },
  statusTitleInactive: {
    color: "#334155",
  },
  statusText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },

  heroCard: {
    marginTop: 18,
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
  heroStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  card: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#64748B",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },

  miniStat: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  miniStatLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
  },
  miniStatValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },

  weekGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D97706",
    borderRadius: 999,
  },
  goalText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "700",
  },

  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  entryTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },
  entrySub: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  entryAmount: {
    color: "#D97706",
    fontSize: 16,
    fontWeight: "900",
  },
  viewAllBtn: {
    marginTop: 12,
  },
  viewAllText: {
    color: "#1E293B",
    fontWeight: "900",
  },

  insightText: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748B",
    marginTop: 12,
    fontWeight: "600",
  },
  tip: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "flex-end",
  },
  drawer: {
    width: "82%",
    maxWidth: 360,
    height: "100%",
    backgroundColor: "#FFFFFF",
    padding: 20,
    paddingTop: 60,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  drawerTitle: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "900",
  },
  drawerClose: {
    color: "#0F172A",
    fontSize: 30,
    fontWeight: "700",
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  menuText: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "800",
  },
});