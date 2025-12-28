// src/screens/punch.tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { getProfile } from "../storage/repositories/profileRepo";
import { listWorkplaces, getWorkplaceById } from "../storage/repositories/workplaceRepo";
import { listRoles, getRoleById } from "../storage/repositories/roleRepo";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

import {
  ActivePunch,
  getActivePunch,
  setActivePunch,
  clearActivePunch,
  punchOut as repoPunchOut,
} from "../storage/repositories/punchRepo";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtMoney(n: number) {
  const val = Number.isFinite(n) ? n : 0;
  return `$${val.toFixed(2)}`;
}
function parseMoney(input: string) {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
function parseBreakMinutes(input: string) {
  const cleaned = input.replace(/[^0-9]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 30;
  return Math.min(240, Math.max(0, Math.round(n)));
}
function makeId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveDefaults(workplaceId: string, roleId?: string) {
  const profile = getProfile();
  const wp = workplaceId ? getWorkplaceById(workplaceId) : null;
  const role = roleId ? getRoleById(roleId) : null;

  const pWage = profile?.defaultHourlyWage ?? 0;
  const pBreak = profile?.defaultBreakMinutes ?? 30;
  const pUnpaid = profile?.defaultUnpaidBreak ?? true;

  const wWage = wp?.defaultHourlyWage;
  const wBreak = wp?.defaultBreakMinutes;
  const wUnpaid = wp?.defaultUnpaidBreak;

  const rWage = role?.defaultHourlyWage;
  const rBreak = role?.defaultBreakMinutes;
  const rUnpaid = role?.defaultUnpaidBreak;

  return {
    hourlyWage: Number(rWage ?? wWage ?? pWage ?? 0),
    breakMinutes: Number(rBreak ?? wBreak ?? pBreak ?? 30),
    unpaidBreak: !!(rUnpaid ?? wUnpaid ?? pUnpaid),
    workplaceName: wp?.name,
    roleName: role?.name,
  };
}

export default function PunchScreen() {
  const router = useRouter();

  const [refreshKey, setRefreshKey] = useState(0);
  const [active, setActive] = useState<ActivePunch | null>(null);

  const workplaces = useMemo(() => listWorkplaces(), [refreshKey]);
  const roles = useMemo(() => listRoles(), [refreshKey]);

  const [workplaceId, setWorkplaceId] = useState("");
  const [roleId, setRoleId] = useState<string>("");

  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(true);

  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  const hourlyWage = useMemo(() => parseMoney(hourlyWageText), [hourlyWageText]);
  const breakMinutes = useMemo(() => parseBreakMinutes(breakMinutesText), [breakMinutesText]);
  const cashTips = useMemo(() => parseMoney(cashTipsText), [cashTipsText]);
  const creditTips = useMemo(() => parseMoney(creditTipsText), [creditTipsText]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setRefreshKey((k) => k + 1);

        const a = await getActivePunch();
        setActive(a);

        const wps = listWorkplaces();
        const defaultWpId = workplaceId || wps[0]?.id || "";
        if (!workplaceId && defaultWpId) setWorkplaceId(defaultWpId);

        if (a) {
          setHourlyWageText(String(a.hourlyWage ?? 0));
          setBreakMinutesText(String(a.breakMinutes ?? 30));
          setUnpaidBreak(a.unpaidBreak ?? true);
        } else if (defaultWpId) {
          const d = resolveDefaults(defaultWpId, roleId || undefined);
          setHourlyWageText(String(d.hourlyWage));
          setBreakMinutesText(String(d.breakMinutes));
          setUnpaidBreak(d.unpaidBreak);
        }
      })();
    }, [workplaceId, roleId])
  );

  const preview = useMemo(() => {
    if (!active) return null;

    const start = new Date(active.startedAtISO);
    const end = new Date();

    let minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    if (unpaidBreak) minutes = Math.max(0, minutes - breakMinutes);

    const hours = Number((minutes / 60).toFixed(2));
    const hourlyPay = Number((hours * hourlyWage).toFixed(2));
    const tips = Number((cashTips + creditTips).toFixed(2));
    const total = Number((hourlyPay + tips).toFixed(2));

    return { hours, hourlyPay, tips, total };
  }, [active, unpaidBreak, breakMinutes, hourlyWage, cashTips, creditTips]);

  async function onPunchIn() {
    if (!workplaceId) {
      Alert.alert("Workplace", "Please select a workplace.");
      return;
    }

    const d = resolveDefaults(workplaceId, roleId || undefined);

    const punch: ActivePunch = {
      id: makeId("punch"),
      startedAtISO: new Date().toISOString(),
      workplaceId,
      workplaceName: d.workplaceName,
      roleId: roleId || undefined,
      roleName: d.roleName,
      hourlyWage: d.hourlyWage,
      breakMinutes: d.breakMinutes,
      unpaidBreak: d.unpaidBreak,
    };

    await setActivePunch(punch);
    setActive(punch);

    setHourlyWageText(String(punch.hourlyWage));
    setBreakMinutesText(String(punch.breakMinutes));
   setUnpaidBreak(punch.unpaidBreak ?? true);


    setCashTipsText("0");
    setCreditTipsText("0");
    setNote("");

    Alert.alert("Punched In ✅", `Started at ${fmtTime(punch.startedAtISO)}`);
  }

  async function onPunchOut() {
    if (!active) return;

    // ✅ Use repo punchOut so Home/auto-close stays consistent
    await repoPunchOut({
      cashTips,
      creditTips,
      note: note.trim(),
    });

    setActive(null);
    Alert.alert("Saved ✅", "Shift saved to History.", [
      { text: "OK", onPress: () => router.push("/history") },
    ]);
  }

  async function onCancelPunch() {
    if (!active) return;
    Alert.alert("Cancel active punch?", "This will remove the running punch without saving.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel Punch",
        style: "destructive",
        onPress: async () => {
          await clearActivePunch();
          setActive(null);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

                <ActiveShiftTimerCard />
        <Text style={styles.title}>Punch</Text>
        <Text style={styles.sub}>Tap in → tap out. No start/end typing.</Text>

        {active ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Shift</Text>
            <Text style={styles.bigLine}>
              {active.workplaceName ?? "Workplace"}
              {active.roleName ? ` • ${active.roleName}` : ""}
            </Text>
            <Text style={styles.muted}>Started: {fmtTime(active.startedAtISO)}</Text>

            <View style={{ height: 10 }} />

            <Text style={styles.label}>Hourly wage</Text>
            <TextInput
              value={hourlyWageText}
              onChangeText={setHourlyWageText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Break minutes</Text>
            <TextInput
              value={breakMinutesText}
              onChangeText={setBreakMinutesText}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            <View style={[styles.rowBetween, { marginTop: 10 }]}>
              <Text style={styles.label}>Deduct unpaid break</Text>
              <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} />
            </View>

            <View style={{ height: 10 }} />

            <Text style={styles.label}>Cash tips</Text>
            <TextInput
              value={cashTipsText}
              onChangeText={setCashTipsText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Card tips</Text>
            <TextInput
              value={creditTipsText}
              onChangeText={setCreditTipsText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional note…"
              placeholderTextColor="#6B7280"
              style={[styles.input, { minHeight: 70, paddingTop: 12 }]}
              multiline
            />

            {!!preview && (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>Live Preview</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Hours</Text>
                  <Text style={styles.previewValue}>{preview.hours.toFixed(2)}h</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Wage</Text>
                  <Text style={styles.previewValue}>{fmtMoney(preview.hourlyPay)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Tips</Text>
                  <Text style={styles.previewValue}>{fmtMoney(preview.tips)}</Text>
                </View>
                <View style={[styles.previewRow, { marginTop: 6 }]}>
                  <Text style={[styles.previewLabel, { fontWeight: "900" }]}>Total</Text>
                  <Text style={[styles.previewValue, { fontSize: 18 }]}>{fmtMoney(preview.total)}</Text>
                </View>
              </View>
            )}

            <Pressable style={[styles.btn, { backgroundColor: "#16A34A" }]} onPress={onPunchOut}>
              <Text style={styles.btnText}>Punch Out (Save)</Text>
            </Pressable>

            <Pressable style={[styles.btn, { backgroundColor: "#7F1D1D" }]} onPress={onCancelPunch}>
              <Text style={styles.btnText}>Cancel Punch</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Punch In</Text>

            <Text style={styles.label}>Workplace</Text>
            <View style={{ gap: 10 }}>
              {workplaces.map((w) => {
                const selected = w.id === workplaceId;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      setWorkplaceId(w.id);
                      const d = resolveDefaults(w.id, roleId || undefined);
                      setHourlyWageText(String(d.hourlyWage));
                      setBreakMinutesText(String(d.breakMinutes));
                      setUnpaidBreak(d.unpaidBreak);
                    }}
                    style={[styles.pickRow, selected && { borderColor: "#2563EB" }]}
                  >
                    <Text style={styles.pickText}>{w.name}</Text>
                    <Text style={styles.pickHint}>{selected ? "Selected" : "Tap"}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 10 }} />

            <Text style={styles.label}>Role (optional)</Text>
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={() => {
                  setRoleId("");
                  const d = resolveDefaults(workplaceId, undefined);
                  setHourlyWageText(String(d.hourlyWage));
                  setBreakMinutesText(String(d.breakMinutes));
                  setUnpaidBreak(d.unpaidBreak);
                }}
                style={[styles.pickRow, !roleId && { borderColor: "#2563EB" }]}
              >
                <Text style={styles.pickText}>No role</Text>
                <Text style={styles.pickHint}>{!roleId ? "Selected" : "Tap"}</Text>
              </Pressable>

              {roles.map((r) => {
                const selected = r.id === roleId;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      setRoleId(r.id);
                      const d = resolveDefaults(workplaceId, r.id);
                      setHourlyWageText(String(d.hourlyWage));
                      setBreakMinutesText(String(d.breakMinutes));
                      setUnpaidBreak(d.unpaidBreak);
                    }}
                    style={[styles.pickRow, selected && { borderColor: "#2563EB" }]}
                  >
                    <Text style={styles.pickText}>{r.name}</Text>
                    <Text style={styles.pickHint}>{selected ? "Selected" : "Tap"}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 10 }} />

            <View style={styles.preview}>
              <Text style={styles.previewTitle}>Defaults</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Hourly wage</Text>
                <Text style={styles.previewValue}>{fmtMoney(hourlyWage)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Break</Text>
                <Text style={styles.previewValue}>{breakMinutes}m</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Unpaid break</Text>
                <Text style={styles.previewValue}>{unpaidBreak ? "Yes" : "No"}</Text>
              </View>
            </View>

            <Pressable style={[styles.btn, { backgroundColor: "#2563EB" }]} onPress={onPunchIn}>
              <Text style={styles.btnText}>Punch In Now</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={[styles.btn, { backgroundColor: "#111827" }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0F1A" },
  container: { padding: 16, paddingBottom: 30, gap: 12 },

  title: { color: "white", fontSize: 28, fontWeight: "900" },
  sub: { color: "#B8C0CC", marginTop: -6, lineHeight: 18 },

  card: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  bigLine: { color: "white", fontSize: 15, fontWeight: "800" },
  muted: { color: "#B8C0CC", fontSize: 13 },

  label: { color: "#B8C0CC", fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: "#0B0F1A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    color: "white",
    fontSize: 16,
  },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  pickRow: {
    backgroundColor: "#0B0F1A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickText: { color: "white", fontWeight: "800" },
  pickHint: { color: "#6B7280", fontWeight: "700" },

  preview: {
    backgroundColor: "#0B0F1A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  previewTitle: { color: "white", fontWeight: "900" },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewLabel: { color: "#B8C0CC", fontSize: 13 },
  previewValue: { color: "white", fontWeight: "900", fontSize: 14 },

  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 4,
  },
  btnText: { color: "white", fontWeight: "900", fontSize: 16 },
});
