// src/screens/day-details.tsx
// ---------------------------------------------------------
// PayDG — Day Details
// Premium light finance theme
//
// ✅ Shows all shifts for selected day
// ✅ Shows workplace + role
// ✅ Tap shift -> Edit Shift
// ✅ i18n support with t() + useLang()
// ✅ Premium cards, emojis, clean spacing
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import Screen from "../components/Screen";

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
};

/* ---------------------------------------------------------
   Types / Constants
--------------------------------------------------------- */

const STORAGE_KEY = "paydg_shifts_v1";

type Shift = {
  id: string;
  isoDate: string;
  workplaceName?: string;
  roleName?: string;
  startISO: string;
  endISO: string;
  workedHours: number;
  cashTips: number;
  creditTips: number;
  totalEarned: number;
  note?: string;
};

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

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

/* =========================================================
   Screen
========================================================= */

export default function DayDetailsScreen() {
  useLang();

  const router = useRouter();
  const params = useLocalSearchParams<{ isoDate: string; label: string }>();

  const isoDate = params.isoDate ?? "";
  const label = params.label ?? isoDate;

  const [shifts, setShifts] = useState<Shift[]>([]);

  /**
   * Load shifts for selected day every time screen gets focus.
   */
  const loadDayShifts = useCallback(async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: Shift[] = raw ? JSON.parse(raw) : [];

    const filtered = arr
      .filter((shift) => shift.isoDate === isoDate)
      .sort(
        (a, b) =>
          new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
      );

    setShifts(filtered);
  }, [isoDate]);

  useFocusEffect(
    useCallback(() => {
      loadDayShifts();
    }, [loadDayShifts])
  );

  /**
   * Day totals.
   */
  const totals = useMemo(() => {
    const hours = shifts.reduce((sum, shift) => {
      return sum + (shift.workedHours || 0);
    }, 0);

    const cash = shifts.reduce((sum, shift) => {
      return sum + (shift.cashTips || 0);
    }, 0);

    const card = shifts.reduce((sum, shift) => {
      return sum + (shift.creditTips || 0);
    }, 0);

    const total = shifts.reduce((sum, shift) => {
      return sum + (shift.totalEarned || 0);
    }, 0);

    return {
      count: shifts.length,
      hours: Number(hours.toFixed(2)),
      cash: Number(cash.toFixed(2)),
      card: Number(card.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [shifts]);

  return (
    <Screen bg={COLORS.bg} pad={16}>

      {/* -------------------- Header -------------------- */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>PAYDG DAY DETAILS</Text>
          <Text style={styles.title}>{t("day_title")}</Text>
          <Text style={styles.subtitle}>{label}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>

      {/* -------------------- Totals Card -------------------- */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>{t("total")}</Text>
            <Text style={styles.heroAmount}>{fmtMoney(totals.total)}</Text>
          </View>

          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>💰</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <MiniStat label={t("shifts")} value={`${totals.count}`} dark />
          <MiniStat label={t("hours")} value={`${totals.hours.toFixed(2)}h`} dark />
        </View>
      </View>

      {/* -------------------- Breakdown Card -------------------- */}
      <View style={styles.card}>
        <SectionHeader emoji="📊" title={t("totals_title")} />

        <SummaryRow label={t("cash")} value={fmtMoney(totals.cash)} />
        <SummaryRow label={t("card")} value={fmtMoney(totals.card)} />

        <View style={styles.divider} />

        <SummaryRow label={t("total")} value={fmtMoney(totals.total)} bold />
      </View>

      {/* -------------------- Shift List Card -------------------- */}
      <View style={styles.card}>
        <SectionHeader emoji="🧾" title={t("shifts")} />

        {shifts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>{t("no_shifts_for_day")}</Text>
          </View>
        ) : (
          <View style={styles.shiftList}>
            {shifts.map((shift) => (
              <ShiftRow
                key={shift.id}
                shift={shift}
                onPress={() =>
                  router.push({
                    pathname: "/edit-shift",
                    params: { id: shift.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>

      <Text style={styles.footerHint}>{t("tap_shift_to_edit")}</Text>
    </Screen>
  );
}

/* =========================================================
   Small Components
========================================================= */

function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
      </View>

      <Text style={styles.cardTitle}>{title}</Text>
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

function SummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, bold && styles.summaryRowBold]}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>
        {label}
      </Text>

      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>
        {value}
      </Text>
    </View>
  );
}

function ShiftRow({ shift, onPress }: { shift: Shift; onPress: () => void }) {
  const tips = (shift.cashTips || 0) + (shift.creditTips || 0);

  return (
    <Pressable
      style={({ pressed }) => [styles.shiftRow, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.shiftIcon}>
        <Text style={styles.shiftEmoji}>💵</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.shiftTitle}>
          {shift.workplaceName ?? t("workplace_fallback")}
          {shift.roleName ? ` • ${shift.roleName}` : ""}
        </Text>

        <Text style={styles.shiftMeta}>
          {fmtTime(shift.startISO)} – {fmtTime(shift.endISO)} •{" "}
          {shift.workedHours}h
        </Text>

        {!!shift.note && <Text style={styles.note}>📝 {shift.note}</Text>}
      </View>

      <View style={styles.shiftRight}>
        <Text style={styles.earned}>{fmtMoney(shift.totalEarned)}</Text>
        <Text style={styles.shiftMeta}>
          {t("tips")} {fmtMoney(tips)}
        </Text>
      </View>
    </Pressable>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  header: {
    marginTop: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: COLORS.gold,
    marginBottom: 4,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: COLORS.navy,
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 20,
  },

  backBtn: {
    backgroundColor: COLORS.navy,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },

  backBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
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

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(217, 119, 6, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroEmoji: {
    fontSize: 26,
  },

  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
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

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.navy,
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

  summaryRow: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryRowBold: {
    backgroundColor: COLORS.goldSoft,
    borderColor: COLORS.goldBorder,
    marginBottom: 0,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },

  summaryLabelBold: {
    color: COLORS.gold,
    fontWeight: "900",
  },

  summaryValue: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
  },

  summaryValueBold: {
    fontSize: 20,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },

  shiftList: {
    gap: 10,
  },

  shiftRow: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  shiftIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  shiftEmoji: {
    fontSize: 18,
  },

  shiftTitle: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 15,
  },

  shiftMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },

  shiftRight: {
    alignItems: "flex-end",
  },

  earned: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "900",
  },

  note: {
    marginTop: 7,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "700",
    lineHeight: 17,
  },

  emptyBox: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
  },

  emptyEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },

  emptyTitle: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

  footerHint: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 24,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});
