// app/index.tsx
// ---------------------------------------------------------
// PayDG — Premium Home Dashboard
//
// ✅ Premium light finance theme
// ✅ Today earnings hero card
// ✅ Active shift status
// ✅ Weekly progress
// ✅ Recent entries
// ✅ Lifetime stats
// ✅ Better drawer menu
// ✅ Drawer auto-closes after selecting option
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
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

import DailyInsightCard from "@/src/components/DailyInsightCard";
import ActiveShiftTimerCard from "@/src/components/ActiveShiftTimerCard";

import { getLanguage } from "../src/i18n";
import { getProfile } from "../src/storage/repositories/profileRepo";
import { listWorkplaces } from "../src/storage/repositories/workplaceRepo";

import {
  autoCloseIfNeeded,
  getActivePunch,
  type ActivePunch,
} from "../src/storage/repositories/punchRepo";

/* ---------------------------------------------------------
   PayDG Theme
--------------------------------------------------------- */

const COLORS = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  navy: "#0F172A",
  muted: "#64748B",
  border: "#E5E7EB",
  inputBg: "#F8FAFC",
  gold: "#D97706",
  goldSoft: "#FFF7ED",
  goldBorder: "#FED7AA",
  green: "#059669",
  greenSoft: "#ECFDF5",
  greenBorder: "#A7F3D0",
  danger: "#DC2626",
};

/* ---------------------------------------------------------
   Types / Constants
--------------------------------------------------------- */

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

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

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

/* =========================================================
   Home Screen
========================================================= */

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

  /**
   * Load dashboard data whenever Home gets focus.
   */
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

  /**
   * Pull-to-refresh action.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  }, [loadHome]);

  /**
   * Close drawer first, then navigate.
   * This fixes the bug where the new page opens behind the drawer.
   */
  const goTo = useCallback(
    (path: string) => {
      setMenuOpen(false);

      setTimeout(() => {
        router.push(path as any);
      }, 120);
    },
    [router]
  );

  /**
   * Dashboard statistics.
   */
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

    for (const shift of shifts) {
      const started = new Date(shift.startISO).getTime();
      const hours = (shift.workedMinutes || 0) / 60;
      const earned = shift.totalEarned || 0;

      lifetimeEarned += earned;
      lifetimeHours += hours;

      if (shift.isoDate === todayKey) {
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

  if (!profile) return <Redirect href="/profile" />;
  // if (workplaces.length === 0) return <Redirect href="/workplaces" />;

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
        {/* -------------------- Header -------------------- */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>PAYDG DASHBOARD</Text>
            <Text style={styles.greeting}>{getGreeting()}</Text>

            <Text style={styles.name} numberOfLines={1}>
              {profile.userName} 👋
            </Text>

            <Text style={styles.subLine}>
              {workplaces.length} workplace
              {workplaces.length > 1 ? "s" : ""} • {getLanguage().toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.menuCircle}
            onPress={() => setMenuOpen(true)}
          >
            <Text style={styles.menuCircleText}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* -------------------- Quick Actions -------------------- */}
        <View style={styles.quickRow}>
          <QuickAction
            emoji="➕"
            title="Entry"
            subtitle="Past shift"
            primary
            onPress={() => router.push("/add-shift")}
          />

          <QuickAction
            emoji="⏱️"
            title="Punch"
            subtitle="Live shift"
            onPress={() => router.push("/punch")}
          />
        </View>

        {/* -------------------- Active Status -------------------- */}
        <View
          style={[
            styles.statusCard,
            activePunch ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <View style={styles.statusTop}>
            <Text
              style={[
                styles.statusTitle,
                activePunch
                  ? styles.statusTitleActive
                  : styles.statusTitleInactive,
              ]}
            >
              {activePunch ? "🟢 Active Shift" : "⚪ No Active Shift"}
            </Text>

            {activePunch && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push("/punch")}
                style={styles.statusPill}
              >
                <Text style={styles.statusPillText}>Open</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.statusText}>
            {activePunch
              ? "Timer is running. Open Punch when your shift ends."
              : "Start Punch when your shift begins or add a past entry."}
          </Text>
        </View>

        <ActiveShiftTimerCard />

        {/* -------------------- Today's Earnings Hero -------------------- */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>Today’s Earnings</Text>
              <Text style={styles.heroAmount}>
                {fmtMoney(stats.todayEarned)}
              </Text>
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>💰</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <MiniStat
              label="Hours"
              value={`${stats.todayHours.toFixed(2)}h`}
              dark
            />

            <MiniStat
              label="Effective Rate"
              value={fmtMoney(stats.todayEffectiveRate)}
              dark
            />
          </View>
        </View>

        {/* -------------------- Weekly Progress -------------------- */}
        <SectionCard
          emoji="📈"
          title="This Week Pace"
          subtitle="Your current weekly progress"
        >
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

        {/* -------------------- Recent Entries -------------------- */}
        <SectionCard
          emoji="🧾"
          title="Recent Entries"
          subtitle="Your latest 3 shifts"
        >
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

        {/* -------------------- Daily Insight -------------------- */}
        <DailyInsightCard shifts={shifts} />

        {/* -------------------- Lifetime Stats -------------------- */}
        <SectionCard
          emoji="🏆"
          title="Lifetime Stats"
          subtitle="All-time PayDG tracking"
        >
          <View style={styles.weekGrid}>
            <MiniStat label="Earned" value={fmtMoney(stats.lifetimeEarned)} />
            <MiniStat
              label="Hours"
              value={`${stats.lifetimeHours.toFixed(0)}h`}
            />
            <MiniStat label="Shifts" value={`${stats.totalShifts}`} />
          </View>
        </SectionCard>

        <Text style={styles.tip}>Pull down to refresh your dashboard.</Text>
      </ScrollView>

      {/* -------------------- Drawer Menu -------------------- */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerKicker}>PAYDG MENU</Text>
                <Text style={styles.drawerTitle}>Navigation</Text>
              </View>

              <TouchableOpacity onPress={() => setMenuOpen(false)}>
                <Text style={styles.drawerClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <MenuItem emoji="📊" label="Stats" onPress={() => goTo("/stats")} />
              <MenuItem
                emoji="📅"
                label="Monthly Summary"
                onPress={() => goTo("/monthly-summary")}
              />
              <MenuItem
                emoji="📜"
                label="History"
                onPress={() => goTo("/history")}
              />
              <MenuItem
                emoji="✨"
                label="Insights"
                onPress={() => goTo("/insights")}
              />
              <MenuItem
                emoji="🏢"
                label="Workplaces"
                onPress={() => goTo("/workplaces")}
              />
              <MenuItem emoji="👔" label="Roles" onPress={() => goTo("/roles")} />
              <MenuItem
                emoji="⚙️"
                label="Settings"
                onPress={() => goTo("/settings")}
              />
              <MenuItem
                emoji="📘"
                label="Quick Guide"
                onPress={() => goTo("/quick-guide")}
              />
              <MenuItem
                emoji="💾"
                label="Backup / Restore"
                onPress={() => goTo("/backup")}
              />
              <MenuItem emoji="ℹ️" label="About" onPress={() => goTo("/about")} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* =========================================================
   Small Components
========================================================= */

function QuickAction({
  emoji,
  title,
  subtitle,
  onPress,
  primary,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.quickAction, primary && styles.quickActionPrimary]}
    >
      <Text style={styles.quickEmoji}>{emoji}</Text>

      <View>
        <Text
          style={[
            styles.quickTitle,
            primary && styles.quickTitlePrimary,
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.quickSub,
            primary && styles.quickSubPrimary,
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionCard({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Text style={styles.sectionEmoji}>{emoji}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      {children}
    </View>
  );
}

function MiniStat({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <View style={[styles.miniStat, dark && styles.miniStatDark]}>
      <Text style={[styles.miniStatLabel, dark && styles.miniStatLabelDark]}>
        {label}
      </Text>

      <Text style={[styles.miniStatValue, dark && styles.miniStatValueDark]}>
        {value}
      </Text>
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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.entryRow}
    >
      <View style={styles.entryIcon}>
        <Text style={styles.entryEmoji}>💵</Text>
      </View>

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
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.menuItem}
    >
      <View style={styles.menuIcon}>
        <Text style={styles.menuEmoji}>{emoji}</Text>
      </View>

      <Text style={styles.menuText}>{label}</Text>

      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  content: {
    padding: 18,
    paddingBottom: 38,
  },

  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.gold,
    marginBottom: 4,
  },

  greeting: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },

  name: {
    color: COLORS.navy,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },

  subLine: {
    color: COLORS.muted,
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },

  menuCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  menuCircleText: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: "900",
  },

  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  quickAction: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  quickActionPrimary: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },

  quickEmoji: {
    fontSize: 24,
  },

  quickTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  quickTitlePrimary: {
    color: "#FFFFFF",
  },

  quickSub: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  quickSubPrimary: {
    color: "#CBD5E1",
  },

  statusCard: {
    marginTop: 18,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
  },

  statusActive: {
    backgroundColor: COLORS.greenSoft,
    borderColor: COLORS.greenBorder,
  },

  statusInactive: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },

  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  statusTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  statusTitleActive: {
    color: COLORS.green,
  },

  statusTitleInactive: {
    color: COLORS.navy,
  },

  statusText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 5,
    fontWeight: "700",
    lineHeight: 17,
  },

  statusPill: {
    backgroundColor: COLORS.green,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  statusPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  heroCard: {
    marginTop: 18,
    backgroundColor: COLORS.navy,
    borderRadius: 30,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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

  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(217, 119, 6, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadgeText: {
    fontSize: 26,
  },

  heroStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  card: {
    marginTop: 18,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionEmoji: {
    fontSize: 19,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: COLORS.muted,
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
  },

  miniStat: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  miniStatDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
  },

  miniStatLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
  },

  miniStatLabelDark: {
    color: "#CBD5E1",
  },

  miniStatValue: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },

  miniStatValueDark: {
    color: "#FFFFFF",
  },

  weekGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
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
    backgroundColor: COLORS.gold,
    borderRadius: 999,
  },

  goalText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "700",
  },

  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  entryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  entryEmoji: {
    fontSize: 18,
  },

  entryTitle: {
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  entrySub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  entryAmount: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "900",
  },

  viewAllBtn: {
    marginTop: 12,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 16,
    padding: 13,
    alignItems: "center",
  },

  viewAllText: {
    color: COLORS.gold,
    fontWeight: "900",
  },

  emptyText: {
    color: COLORS.muted,
    marginTop: 4,
    fontWeight: "700",
  },

  tip: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "700",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.50)",
    alignItems: "flex-end",
  },

  drawer: {
    width: "84%",
    maxWidth: 370,
    height: "100%",
    backgroundColor: COLORS.card,
    padding: 20,
    paddingTop: 58,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
  },

  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  drawerKicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.gold,
    marginBottom: 4,
  },

  drawerTitle: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: "900",
  },

  drawerClose: {
    color: COLORS.navy,
    fontSize: 34,
    fontWeight: "700",
    marginTop: -4,
  },

  menuItem: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
  },

  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  menuEmoji: {
    fontSize: 17,
  },

  menuText: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  menuChevron: {
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: "300",
  },
});