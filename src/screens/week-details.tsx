// src/screens/week-details.tsx
// ---------------------------------------------------------
// PayDG — Week Details (Phase 1 drill-down)
// ✅ Lists all shifts in selected week (Mon–Sun)
// ✅ Uses same filter (workplaceId)
// ✅ Tap a shift -> Edit Shift
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

type Shift = {
  id: string;
  workplaceId: string;
  workplaceName?: string;

  isoDate: string;
  startISO: string;
  endISO: string;

  cashTips: number;
  creditTips: number;
  workedHours: number;
  totalEarned: number;

  note?: string;
};

const STORAGE_KEY = "paydg_shifts_v1";

function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function WeekDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    start: string;
    end: string;
    workplaceId: string;
    label: string;
  }>();

  const [shifts, setShifts] = useState<Shift[]>([]);

  const startMs = useMemo(() => new Date(params.start).getTime(), [params.start]);
  const endMs = useMemo(() => new Date(params.end).getTime(), [params.end]);
  const workplaceId = params.workplaceId ?? "ALL";
  const label = params.label ?? "Week";

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const arr: Shift[] = raw ? JSON.parse(raw) : [];

        const filtered = arr.filter((s) => {
          const t = new Date(s.startISO).getTime();
          if (t < startMs || t > endMs) return false;
          if (workplaceId !== "ALL" && s.workplaceId !== workplaceId) return false;
          return true;
        });

        setShifts(filtered);
      })();
    }, [startMs, endMs, workplaceId])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Week</Text>
        <Text style={styles.subTitle}>{label}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shifts</Text>

          {shifts.length === 0 ? (
            <Text style={styles.helper}>No shifts for this week.</Text>
          ) : (
            shifts.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push({ pathname: "/edit-shift", params: { id: s.id } })}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTop}>
                    {s.isoDate} • {s.workplaceName ?? "Workplace"}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {fmtTime(s.startISO)} – {fmtTime(s.endISO)} • {s.workedHours}h
                  </Text>
                  {!!s.note && <Text style={styles.note}>📝 {s.note}</Text>}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.earned}>{fmtMoney(s.totalEarned)}</Text>
                  <Text style={styles.rowMeta}>
                    Tips {fmtMoney((s.cashTips || 0) + (s.creditTips || 0))}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Text style={styles.helper}>Tap any shift to edit.</Text>
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
