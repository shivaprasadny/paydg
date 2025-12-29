// src/screens/day-details.tsx
// ---------------------------------------------------------
// Day Details
// ✅ Shows Workplace + Role
// ✅ Tap shift -> Edit Shift
// ✅ i18n (English/Spanish) via t() + re-render via useLang()
// ✅ Uses AppScreen (your reusable Screen component)
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import AppScreen from "../components/Screen";

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

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function DayDetailsScreen() {
  useLang();

  const router = useRouter();
  const params = useLocalSearchParams<{ isoDate: string; label: string }>();

  const isoDate = params.isoDate ?? "";
  const label = params.label ?? isoDate;

  const [shifts, setShifts] = useState<Shift[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];

        const filtered = arr
          .filter((s) => s.isoDate === isoDate)
          .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

        setShifts(filtered);
      })();
    }, [isoDate])
  );

  const totals = useMemo(() => {
    const hours = shifts.reduce((s, x) => s + (x.workedHours || 0), 0);
    const cash = shifts.reduce((s, x) => s + (x.cashTips || 0), 0);
    const card = shifts.reduce((s, x) => s + (x.creditTips || 0), 0);
    const total = shifts.reduce((s, x) => s + (x.totalEarned || 0), 0);

    return {
      count: shifts.length,
      hours: Number(hours.toFixed(2)),
      cash: Number(cash.toFixed(2)),
      card: Number(card.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [shifts]);

  return (
    <AppScreen bg="#0B0F1A" pad={16} contentContainerStyle={{ gap: 12 }}>
      <ActiveShiftTimerCard />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t("day_title")}</Text>
          <Text style={styles.subTitle}>{label}</Text>
        </View>

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>

      {/* Totals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("totals_title")}</Text>

        <Row label={t("shifts")} value={`${totals.count}`} />
        <Row label={t("hours")} value={`${totals.hours.toFixed(2)}h`} />
        <Row label={t("cash")} value={fmtMoney(totals.cash)} />
        <Row label={t("card")} value={fmtMoney(totals.card)} />

        <View style={styles.divider} />

        <Row label={t("total")} value={fmtMoney(totals.total)} bold />
      </View>

      {/* Shifts list */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("shifts")}</Text>

        {shifts.length === 0 ? (
          <Text style={styles.helper}>{t("no_shifts_for_day")}</Text>
        ) : (
          shifts.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push({ pathname: "/edit-shift", params: { id: s.id } })}
              style={styles.row}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTop}>
                  {s.workplaceName ?? t("workplace_fallback")}
                  {s.roleName ? ` • ${s.roleName}` : ""}
                </Text>

                <Text style={styles.rowMeta}>
                  {fmtTime(s.startISO)} – {fmtTime(s.endISO)} • {s.workedHours}h
                </Text>

                {!!s.note && <Text style={styles.note}>📝 {s.note}</Text>}
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.earned}>{fmtMoney(s.totalEarned)}</Text>
                <Text style={styles.rowMeta}>
                  {t("tips")} {fmtMoney((s.cashTips || 0) + (s.creditTips || 0))}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Text style={styles.helper}>{t("tap_shift_to_edit")}</Text>
    </AppScreen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && { fontWeight: "900", color: "white" }]}>{label}</Text>
      <Text style={[styles.totalValue, bold && { fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  title: { color: "white", fontSize: 28, fontWeight: "900" },
  subTitle: { color: "#B8C0CC", marginTop: -6 },

  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  backText: { color: "white", fontWeight: "900" },

  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 10,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },

  helper: { color: "#9CA3AF", fontSize: 12, lineHeight: 16 },

  divider: { height: 1, backgroundColor: "#1F2937", marginTop: 6 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: "#B8C0CC", fontSize: 13 },
  totalValue: { color: "white", fontSize: 16, fontWeight: "900" },

  row: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#0B0F1A",
  },
  rowTop: { color: "white", fontWeight: "900" },
  rowMeta: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  earned: { color: "white", fontSize: 16, fontWeight: "900" },
  note: { marginTop: 6, fontSize: 12, color: "#B8C0CC" },
});
