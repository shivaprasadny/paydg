// src/screens/history.tsx
// ---------------------------------------------------------
// PayDG — History Timeline
// ✅ Premium light PayDG theme
// ✅ Android-friendly top/bottom spacing using Screen + ScrollView
// ✅ Shows workplace + role
// ✅ Tap shift -> Edit Shift
// ✅ Long press shift -> Delete
// ✅ i18n support through t() + useLang()
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import Screen from "../components/Screen";

const STORAGE_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;
  isoDate: string;
  startISO: string;
  endISO: string;
  workplaceName?: string;
  roleName?: string;
  workedHours?: number;
  workedMinutes?: number;
  cashTips?: number;
  creditTips?: number;
  hourlyPay?: number;
  totalTips?: number;
  totalEarned: number;
  note?: string;
};

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

function getShiftHours(s: Shift) {
  if (typeof s.workedHours === "number") return s.workedHours;
  if (typeof s.workedMinutes === "number") return s.workedMinutes / 60;
  return 0;
}

function getShiftTips(s: Shift) {
  if (typeof s.totalTips === "number") return s.totalTips;
  return (s.cashTips || 0) + (s.creditTips || 0);
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
   SMALL COMPONENTS
========================= */

function TotalMiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.totalMiniCard}>
      <Text style={styles.totalMiniLabel}>{label}</Text>
      <Text style={styles.totalMiniValue}>{value}</Text>
    </View>
  );
}

function ShiftTimelineRow({
  shift,
  onPress,
  onLongPress,
}: {
  shift: Shift;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const workplace = shift.workplaceName || t("workplace");
  const role = shift.roleName ? ` • ${shift.roleName}` : "";
  const hours = getShiftHours(shift);
  const tips = getShiftTips(shift);
  const hourlyPay = shift.hourlyPay || 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.shiftRow}
    >
      {/* Timeline dot */}
      <View style={styles.timelineCol}>
        <View style={styles.timelineDot} />
        <View style={styles.timelineLine} />
      </View>

      {/* Shift content */}
      <View style={styles.shiftContent}>
        <View style={styles.shiftTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shiftTitle}>
              🏢 {workplace}
              {role}
            </Text>

            <Text style={styles.shiftMeta}>
              📅 {shift.isoDate} • {fmtTime(shift.startISO)} –{" "}
              {fmtTime(shift.endISO)}
            </Text>
          </View>

          <Text style={styles.earned}>{fmtMoney(shift.totalEarned)}</Text>
        </View>

        <View style={styles.shiftChipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>⏱ {hours.toFixed(2)}h</Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipText}>🎁 {fmtMoney(tips)} tips</Text>
          </View>

          <View style={styles.chip}>
            <Text style={styles.chipText}>💵 {fmtMoney(hourlyPay)} wage</Text>
          </View>
        </View>

        {shift.note ? (
          <Text style={styles.note}>📝 {shift.note}</Text>
        ) : null}

        <Text style={styles.deleteHint}>Long press to delete</Text>
      </View>
    </Pressable>
  );
}

/* =========================
   MAIN SCREEN
========================= */

export default function HistoryScreen() {
  const router = useRouter();

  // Re-render when language changes.
  useLang();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: Shift[] = raw ? JSON.parse(raw) : [];

      arr.sort(
        (a, b) =>
          new Date(b.startISO).getTime() - new Date(a.startISO).getTime()
      );

      setShifts(arr);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totals = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekStart = startOfWeek(now).getTime();
    const monthStart = startOfMonth(now).getTime();

    let today = 0;
    let week = 0;
    let month = 0;

    for (const s of shifts) {
      const started = new Date(s.startISO).getTime();

      if (s.isoDate === todayKey) today += s.totalEarned || 0;
      if (started >= weekStart) week += s.totalEarned || 0;
      if (started >= monthStart) month += s.totalEarned || 0;
    }

    return { today, week, month };
  }, [shifts]);

  const deleteShift = useCallback(
    (id: string) => {
      Alert.alert(t("delete_shift_q"), t("delete_shift_msg"), [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            const next = shifts.filter((s) => s.id !== id);
            setShifts(next);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          },
        },
      ]);
    },
    [shifts]
  );

  return (
    <Screen bg="#F6F7FB" pad={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>📜 Shift timeline</Text>
            <Text style={styles.title}>{t("history_title")}</Text>
            <Text style={styles.subtitle}>
              Tap to edit • Long press to delete
            </Text>
          </View>

          <Pressable onPress={load} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>↻ {t("refresh")}</Text>
          </Pressable>
        </View>

        {/* Totals */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>💰 This month</Text>
          <Text style={styles.heroAmount}>{fmtMoney(totals.month)}</Text>

          <View style={styles.totalGrid}>
            <TotalMiniCard label={`☀️ ${t("today")}`} value={fmtMoney(totals.today)} />
            <TotalMiniCard label={`📅 ${t("this_week")}`} value={fmtMoney(totals.week)} />
          </View>
        </View>

        {/* Shifts Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧾 {t("shifts")}</Text>

          {loading ? (
            <Text style={styles.helper}>{t("loading")}</Text>
          ) : shifts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No shifts yet</Text>
              <Text style={styles.emptyText}>
                Add your first shift to start building your history.
              </Text>
            </View>
          ) : (
            shifts.map((s) => (
              <ShiftTimelineRow
                key={s.id}
                shift={s}
                onPress={() =>
                  router.push({
                    pathname: "/edit-shift",
                    params: { id: s.id },
                  })
                }
                onLongPress={() => deleteShift(s.id)}
              />
            ))
          )}
        </View>

        <Text style={styles.footer}>{t("history_footer_hint")}</Text>
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
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  refreshBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#1E293B",
  },
  refreshText: {
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
  totalGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  totalMiniCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  totalMiniLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
  },
  totalMiniValue: {
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
    marginBottom: 12,
  },

  helper: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
  },

  shiftRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  timelineCol: {
    alignItems: "center",
    width: 18,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#D97706",
    marginTop: 16,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E2E8F0",
    marginTop: 4,
  },

  shiftContent: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
  },
  shiftTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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
    marginTop: 5,
  },
  earned: {
    color: "#D97706",
    fontSize: 17,
    fontWeight: "900",
  },

  shiftChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
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
  deleteHint: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
  },

  emptyBox: {
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
    fontWeight: "600",
  },

  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
});