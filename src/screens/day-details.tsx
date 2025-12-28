// src/screens/day-details.tsx
// ---------------------------------------------------------
// Day Details
// ✅ Shows Workplace + Role
// ✅ Tap shift -> Edit Shift
// ✅ i18n (English/Spanish) via t() + re-render via useLang()
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

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
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function DayDetailsScreen() {
  // ✅ STEP 2: rerender when language changes
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
          .sort(
            (a, b) =>
              new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
          );
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

                <ActiveShiftTimerCard />
        <Text style={styles.title}>{t("day_title")}</Text>
        <Text style={styles.subTitle}>{label}</Text>

        {/* ---------------- Totals ---------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("totals_title")}</Text>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("shifts")}</Text>
            <Text style={styles.totalValue}>{totals.count}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("hours")}</Text>
            <Text style={styles.totalValue}>{totals.hours.toFixed(2)}h</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("cash")}</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.cash)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t("card")}</Text>
            <Text style={styles.totalValue}>{fmtMoney(totals.card)}</Text>
          </View>

          <View style={[styles.totalRow, { marginTop: 8 }]}>
            <Text style={[styles.totalLabel, { fontWeight: "900" }]}>
              {t("total")}
            </Text>
            <Text style={[styles.totalValue, { fontSize: 18 }]}>
              {fmtMoney(totals.total)}
            </Text>
          </View>
        </View>

        {/* ---------------- Shifts list ---------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("shifts")}</Text>

          {shifts.length === 0 ? (
            <Text style={styles.helper}>{t("no_shifts_for_day")}</Text>
          ) : (
            shifts.map((s) => (
              <Pressable
                key={s.id}
                onPress={() =>
                  router.push({ pathname: "/edit-shift", params: { id: s.id } })
                }
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  {/* Workplace + Role */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 10 },

  title: { fontSize: 28, fontWeight: "900" },
  subTitle: { opacity: 0.7, marginTop: -6 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
    marginTop: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  helper: { fontSize: 12, opacity: 0.6 },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 13, opacity: 0.7 },
  totalValue: { fontSize: 16, fontWeight: "900" },

  row: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
  },
  rowTop: { fontWeight: "900" },
  rowMeta: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  earned: { fontSize: 16, fontWeight: "900" },
  note: { marginTop: 6, fontSize: 12, opacity: 0.8 },
});
