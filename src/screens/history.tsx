// src/screens/history.tsx
// ---------------------------------------------------------
// History (timeline)
// ✅ Shows Workplace + Role (if any)
// ✅ Tap shift -> Edit Shift
// ✅ Long press shift -> Delete
// ✅ i18n (English/Spanish) via t() + useLang()
// ---------------------------------------------------------

import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

const STORAGE_KEY = "paydg_shifts_v1";

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

  hourlyPay: number;
  totalTips: number;
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

export default function HistoryScreen() {
  const router = useRouter();

  // ✅ rerender when language changes
  useLang();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const arr: Shift[] = raw ? JSON.parse(raw) : [];
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

    // for quick totals only (ok)
    const todayKey = now.toISOString().slice(0, 10);

    const weekStart = startOfWeek(now).getTime();
    const monthStart = startOfMonth(now).getTime();

    let today = 0;
    let week = 0;
    let month = 0;

    for (const s of shifts) {
      const started = new Date(s.startISO).getTime();
      if (s.isoDate === todayKey) today += s.totalEarned;
      if (started >= weekStart) week += s.totalEarned;
      if (started >= monthStart) month += s.totalEarned;
    }

    return { today, week, month };
  }, [shifts]);

  const deleteShift = useCallback(
    (id: string) => {
      Alert.alert(t("delete_shift_q"), t("delete_shift_msg"), [
        { text: t("cancel"), style: "cancel" },
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
    <Screen pad={16}>
      <ActiveShiftTimerCard />

      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("history_title")}</Text>

        <Pressable onPress={load} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>{t("refresh")}</Text>
        </Pressable>
      </View>

      {/* Totals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("totals")}</Text>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t("today")}</Text>
          <Text style={styles.totalValue}>{fmtMoney(totals.today)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t("this_week")}</Text>
          <Text style={styles.totalValue}>{fmtMoney(totals.week)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t("this_month")}</Text>
          <Text style={styles.totalValue}>{fmtMoney(totals.month)}</Text>
        </View>
      </View>

      {/* Shifts */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("shifts")}</Text>

        {loading ? (
          <Text style={styles.helper}>{t("loading")}</Text>
        ) : shifts.length === 0 ? (
          <Text style={styles.helper}>{t("no_shifts")}</Text>
        ) : (
          shifts.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push({ pathname: "/edit-shift", params: { id: s.id } })}
              onLongPress={() => deleteShift(s.id)}
              style={styles.shiftRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftDate}>
                  {s.isoDate} • {s.workplaceName ?? t("workplace")}
                  {s.roleName ? ` • ${s.roleName}` : ""}
                </Text>

                <Text style={styles.shiftMeta}>
                  {fmtTime(s.startISO)} – {fmtTime(s.endISO)} • {s.workedHours}h
                </Text>

                <Text style={styles.shiftMeta}>
                  {t("tips_label")}: {fmtMoney(s.totalTips)} • {t("wage_label")}:{" "}
                  {fmtMoney(s.hourlyPay)}
                </Text>

                {!!s.note && <Text style={styles.note}>📝 {s.note}</Text>}
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.earned}>{fmtMoney(s.totalEarned)}</Text>
                <Text style={styles.deleteHint}>{t("hold_to_delete")}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Text style={styles.footer}>{t("history_footer_hint")}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "white", fontSize: 28, fontWeight: "900" },

  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  refreshText: { color: "#fff", fontWeight: "900" },

  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 10,
    marginTop: 12,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: "#B8C0CC", fontSize: 13 },
  totalValue: { color: "white", fontSize: 16, fontWeight: "900" },

  helper: { color: "#B8C0CC", opacity: 0.7 },

  shiftRow: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#0B0F1A",
  },
  shiftDate: { color: "white", fontSize: 15, fontWeight: "900" },
  shiftMeta: { color: "#B8C0CC", fontSize: 13, opacity: 0.85, marginTop: 2 },

  earned: { color: "white", fontSize: 16, fontWeight: "900" },
  deleteHint: { color: "#B8C0CC", fontSize: 11, opacity: 0.6, marginTop: 4 },

  note: { marginTop: 6, fontSize: 12, color: "#B8C0CC", opacity: 0.95 },

  footer: { textAlign: "center", color: "#B8C0CC", opacity: 0.6, marginTop: 12, fontSize: 12 },
});
