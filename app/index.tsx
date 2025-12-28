// app/index.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useFocusEffect, useRouter } from "expo-router";

import { getProfile } from "../src/storage/repositories/profileRepo";
import { listWorkplaces } from "../src/storage/repositories/workplaceRepo";
import { t, getLanguage } from "../src/i18n";

import {
  autoCloseIfNeeded,
  getActivePunch,
  ActivePunch,
} from "../src/storage/repositories/punchRepo";

import { usePunchTimer } from "../src/hooks/usePunchTimer";
import { formatDuration } from "../src/utils/timeUtils";


const SHIFTS_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;
  isoDate: string;
  startISO: string;
  endISO: string;
  workplaceName?: string;
  roleName?: string;
  workedHours: number;
  cashTips: number;
  creditTips: number;
  totalEarned: number;
};

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#1F2937",
        padding: 14,
        borderRadius: 12,
        marginTop: 10,
      }}
    >
      <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatRow({ label, earned, hours }: { label: string; earned: number; hours: number }) {
  return (
    <View
      style={{
        backgroundColor: "#0B0F1A",
        borderWidth: 1,
        borderColor: "#1F2937",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>{label}</Text>
        <Text style={{ color: "white", fontWeight: "900" }}>{fmtMoney(earned)}</Text>
      </View>

      <Text style={{ color: "#B8C0CC", marginTop: 6, fontSize: 12 }}>
        Hours: {hours.toFixed(2)}h
      </Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();

  const [profile, setProfile] = useState(getProfile());
  const [workplaces, setWorkplaces] = useState(listWorkplaces());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activePunch, setActivePunch] = useState<ActivePunch | null>(null);

  // ✅ live timer based on activePunch start time
  const elapsedMs = usePunchTimer(activePunch?.startedAtISO ?? null);

  const loadShifts = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SHIFTS_KEY);
    const arr: Shift[] = raw ? JSON.parse(raw) : [];
    arr.sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());
    setShifts(arr);
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await autoCloseIfNeeded();
        setProfile(getProfile());
        setWorkplaces(listWorkplaces());
        await loadShifts();

        const a = await getActivePunch();
        setActivePunch(a);
      })();
    }, [loadShifts])
  );

  if (!profile) return <Redirect href="/profile" />;
  if (workplaces.length === 0) return <Redirect href="/workplaces" />;

  const totals = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekStart = startOfWeek(now).getTime();
    const monthStart = startOfMonth(now).getTime();

    let todayEarn = 0, weekEarn = 0, monthEarn = 0;
    let todayHours = 0, weekHours = 0, monthHours = 0;

    for (const s of shifts) {
      const started = new Date(s.startISO).getTime();
      const hrs = Number((s.workedHours || 0).toFixed(2));
      const earned = Number((s.totalEarned || 0).toFixed(2));

      if (s.isoDate === todayKey) {
        todayEarn += earned;
        todayHours += hrs;
      }
      if (started >= weekStart) {
        weekEarn += earned;
        weekHours += hrs;
      }
      if (started >= monthStart) {
        monthEarn += earned;
        monthHours += hrs;
      }
    }

    return {
      today: { earned: todayEarn, hours: todayHours },
      week: { earned: weekEarn, hours: weekHours },
      month: { earned: monthEarn, hours: monthHours },
    };
  }, [shifts]);

  const last = shifts[0] ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text style={{ color: "white", fontSize: 28, fontWeight: "800" }}>
            {t("hi")} {profile.userName} 👋
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12 }}>
            {getLanguage().toUpperCase()}
          </Text>
        </View>

        <Text style={{ color: "#B8C0CC", marginTop: 8 }}>
          Workplaces: {workplaces.length}
        </Text>

        {/* ✅ LIVE TIMER CARD */}
        {activePunch && elapsedMs !== null && (
          <View
            style={{
              backgroundColor: "#052e16",
              borderRadius: 16,
              padding: 16,
              marginTop: 14,
              borderWidth: 1,
              borderColor: "#16a34a",
            }}
          >
            <Text style={{ color: "#bbf7d0", fontWeight: "900", fontSize: 16 }}>
              🟢 Shift In Progress
            </Text>

            <Text style={{ color: "#86efac", marginTop: 6 }}>
              {activePunch.workplaceName ?? "Workplace"}
              {activePunch.roleName ? ` • ${activePunch.roleName}` : ""}
            </Text>

            <Text style={{ color: "white", fontSize: 28, fontWeight: "900", marginTop: 8 }}>
              ⏱ {formatDuration(elapsedMs)}
            </Text>

            <Text style={{ color: "#86efac", fontSize: 12, marginTop: 4 }}>
              Auto-closes at 14 hours
            </Text>
          </View>
        )}

        {/* Quick Stats */}
        <View
          style={{
            marginTop: 16,
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1F2937",
            borderRadius: 14,
            padding: 14,
            gap: 10,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>
            {t("quick_stats")}
          </Text>

          <StatRow label={t("today")} earned={totals.today.earned} hours={totals.today.hours} />
          <StatRow label={t("this_week")} earned={totals.week.earned} hours={totals.week.hours} />
          <StatRow label={t("this_month")} earned={totals.month.earned} hours={totals.month.hours} />
        </View>

        {/* Last Shift */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: "#111827",
            borderWidth: 1,
            borderColor: "#1F2937",
            borderRadius: 14,
            padding: 14,
            gap: 8,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>
            {t("last_shift")}
          </Text>

          {!last ? (
            <Text style={{ color: "#B8C0CC" }}>{t("no_shifts")}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => router.push(`/edit-shift?id=${last.id}`)}
              style={{
                backgroundColor: "#0B0F1A",
                borderWidth: 1,
                borderColor: "#1F2937",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>
                {last.workplaceName ?? "Workplace"}
                {last.roleName ? ` • ${last.roleName}` : ""}
              </Text>
              <Text style={{ color: "#B8C0CC", marginTop: 4, fontSize: 12 }}>
                {last.isoDate} • {fmtTime(last.startISO)}–{fmtTime(last.endISO)} • {last.workedHours}h
              </Text>
              <Text style={{ color: "white", marginTop: 6, fontWeight: "900" }}>
                {fmtMoney(last.totalEarned)}
              </Text>
              <Text style={{ color: "#6B7280", marginTop: 6, fontSize: 12 }}>
                {t("tap_to_edit_shift")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Buttons */}
        <View style={{ marginTop: 14 }}>
          <NavButton label="⏱️ Punch In/Out" onPress={() => router.push("/punch")} />
          <NavButton label={t("add_shift")} onPress={() => router.push("/add-shift")} />
          <NavButton label={t("entries")} onPress={() => router.push("/entries")} />
          <NavButton label={t("history")} onPress={() => router.push("/history")} />
          <NavButton label={t("stats")} onPress={() => router.push("/stats")} />
          <NavButton label="📅 Monthly Summary" onPress={() => router.push("/monthly-summary")} />
          <NavButton label="✨ Insights" onPress={() => router.push("/insights")} />
          <NavButton label={t("manage_workplaces")} onPress={() => router.push("/workplaces")} />
          <NavButton label={t("roles_btn")} onPress={() => router.push("/roles")} />
          <NavButton label={t("settings_btn")} onPress={() => router.push("/settings")} />
          <NavButton label={t("about_btn")} onPress={() => router.push("/about")} />
          <NavButton label="💾 Backup / Restore" onPress={() => router.push("/backup")} />
        </View>

        <Text style={{ color: "#6B7280", marginTop: 16, fontSize: 12 }}>
          {t("tip_defaults")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
