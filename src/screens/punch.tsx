// src/screens/punch.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import Screen from "../components/Screen";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";

import { getProfile } from "../storage/repositories/profileRepo";
import {
  getWorkplaceById,
  listWorkplaces,
} from "../storage/repositories/workplaceRepo";
import { getRoleById, listRoles } from "../storage/repositories/roleRepo";

import {
  ActivePunch,
  clearActivePunch,
  getActivePunch,
  punchIn,
  punchOut,
} from "../storage/repositories/punchRepo";

import { subscribePunchChanged } from "../storage/punchStore";
import { formatDuration } from "../utils/timeUtils";

/* ---------------- helpers ---------------- */

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

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

function diffMinutes(startISO: string, endISO: string) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return Math.max(0, Math.round((e - s) / 60000));
}

function calcHourlyPay(workedMinutes: number, hourlyWage: number) {
  const hours = workedMinutes / 60;
  return Number((hours * hourlyWage).toFixed(2));
}

function resolveDefaults(params: {
  workplaceId?: string;
  roleId?: string;
}) {
  const profile = getProfile();
  const wp = params.workplaceId ? getWorkplaceById(params.workplaceId) : null;
  const role = params.roleId ? getRoleById(params.roleId) : null;

  // order: Profile defaults -> Workplace defaults -> Role defaults
  const hourlyWage =
    role?.defaultHourlyWage ??
    wp?.defaultHourlyWage ??
    profile?.defaultHourlyWage ??
    0;

  const breakMinutes =
    role?.defaultBreakMinutes ??
    wp?.defaultBreakMinutes ??
    profile?.defaultBreakMinutes ??
    30;

  const unpaidBreak =
    role?.defaultUnpaidBreak ??
    wp?.defaultUnpaidBreak ??
    profile?.defaultUnpaidBreak ??
    false;

  return { hourlyWage, breakMinutes, unpaidBreak };
}

/* ---------------- screen ---------------- */

export default function PunchScreen() {
  const router = useRouter();

  // lists (sync from cache)
  const workplaces = useMemo(() => listWorkplaces(), []);
  const roles = useMemo(() => listRoles(), []);

  // active punch
  const [active, setActive] = useState<ActivePunch | null>(null);

  const refreshActive = useCallback(async () => {
    const p = await getActivePunch();
    setActive(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshActive();
    }, [refreshActive])
  );

  useEffect(() => {
    refreshActive();
    const unsub = subscribePunchChanged(() => {
      refreshActive();
    });
    return unsub;
  }, [refreshActive]);

  // selection for punch-in
  const [workplaceId, setWorkplaceId] = useState<string>("");
  const [roleId, setRoleId] = useState<string>("");

  // inputs for punch-in + punch-out edit
  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(false);

  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  // init selection (first workplace)
  useEffect(() => {
    if (!workplaceId && workplaces.length > 0) {
      const first = workplaces[0];
      setWorkplaceId(first.id);

      const d = resolveDefaults({ workplaceId: first.id, roleId: undefined });
      setHourlyWageText(String(d.hourlyWage));
      setBreakMinutesText(String(d.breakMinutes));
      setUnpaidBreak(!!d.unpaidBreak);
    }
  }, [workplaceId, workplaces]);

  // derived numbers
  const hourlyWage = safeNumber(hourlyWageText);
  const breakMinutes = Math.max(0, Math.round(safeNumber(breakMinutesText)));

  // live elapsed timer (only when active)
  const elapsedMs = useMemo(() => {
    if (!active?.startedAtISO) return null;
    const start = new Date(active.startedAtISO).getTime();
    return Math.max(0, Date.now() - start);
  }, [active?.startedAtISO]);

  // keep elapsed ticking every second while active
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const elapsedLabel =
    active && active.startedAtISO
      ? formatDuration(Math.max(0, Date.now() - new Date(active.startedAtISO).getTime()))
      : "00:00:00";

  // preview while active
  const preview = useMemo(() => {
    if (!active) return null;

    const endISO = new Date().toISOString();
    const rawMins = diffMinutes(active.startedAtISO, endISO);

    const shouldDeduct = !!unpaidBreak;
    const netMins = shouldDeduct ? Math.max(0, rawMins - breakMinutes) : rawMins;

    const hours = netMins / 60;
    const hourlyPay = calcHourlyPay(netMins, hourlyWage);

    const tips = safeNumber(cashTipsText) + safeNumber(creditTipsText);
    const total = Number((hourlyPay + tips).toFixed(2));

    return { hours, hourlyPay, tips, total };
  }, [active, unpaidBreak, breakMinutes, hourlyWage, cashTipsText, creditTipsText]);

  /* ---------------- actions ---------------- */

  const onSelectWorkplace = useCallback(
    (id: string) => {
      setWorkplaceId(id);

      const d = resolveDefaults({ workplaceId: id, roleId: roleId || undefined });
      setHourlyWageText(String(d.hourlyWage));
      setBreakMinutesText(String(d.breakMinutes));
      setUnpaidBreak(!!d.unpaidBreak);
    },
    [roleId]
  );

  const onSelectRole = useCallback(
    (id: string) => {
      setRoleId(id);

      const d = resolveDefaults({ workplaceId, roleId: id || undefined });
      setHourlyWageText(String(d.hourlyWage));
      setBreakMinutesText(String(d.breakMinutes));
      setUnpaidBreak(!!d.unpaidBreak);
    },
    [workplaceId]
  );

  const onPunchIn = useCallback(async () => {
    if (!workplaceId) {
      Alert.alert("Select workplace", "Please choose a workplace first.");
      return;
    }

    const wp = getWorkplaceById(workplaceId);
    const role = roleId ? getRoleById(roleId) : null;

    try {
      await punchIn({
        workplaceId,
        workplaceName: wp?.name,
        roleId: roleId || undefined,
        roleName: role?.name,
        hourlyWage,
        breakMinutes,
        unpaidBreak,
        note: note.trim() || undefined,
      });

      // reset tips inputs for punch-out
      setCashTipsText("0");
      setCreditTipsText("0");

      await refreshActive();
    } catch (e) {
      Alert.alert("Error", "Could not punch in.");
    }
  }, [
    workplaceId,
    roleId,
    hourlyWage,
    breakMinutes,
    unpaidBreak,
    note,
    refreshActive,
  ]);

  const onPunchOut = useCallback(async () => {
    try {
      const shift = await punchOut({
        cashTips: safeNumber(cashTipsText),
        creditTips: safeNumber(creditTipsText),
        note: note.trim() || undefined,
      });

      if (!shift) return;

      // clear local UI
      setNote("");
      setCashTipsText("0");
      setCreditTipsText("0");

      await refreshActive();

      Alert.alert("Saved ✅", "Shift saved to History.");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Could not punch out.");
    }
  }, [cashTipsText, creditTipsText, note, refreshActive, router]);

  const onCancelPunch = useCallback(async () => {
    Alert.alert("Cancel punch?", "This will remove the active shift (no save).", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await clearActivePunch();
            setNote("");
            setCashTipsText("0");
            setCreditTipsText("0");
            await refreshActive();
          } catch (e) {
            Alert.alert("Error", "Could not cancel punch.");
          }
        },
      },
    ]);
  }, [refreshActive]);

  /* ---------------- UI ---------------- */

  return (
    <Screen>
      <View style={styles.container}>
        <ActiveShiftTimerCard />

        {/* Header */}
        <View style={styles.headerRow}>
         

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Punch</Text>
            <Text style={styles.sub}>Tap in → tap out. No start/end typing.</Text>
          </View>
        </View>

        {active ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Shift</Text>

            <Text style={styles.bigLine}>
              {active.workplaceName ?? "Workplace"}
              {active.roleName ? ` • ${active.roleName}` : ""}
            </Text>

            <Text style={styles.muted}>
              Started: {fmtTime(active.startedAtISO)} • Elapsed: {elapsedLabel}
            </Text>

            <View style={{ height: 8 }} />

            {/* Hourly wage */}
            <Text style={styles.label}>Hourly wage</Text>
            <TextInput
              value={hourlyWageText}
              onChangeText={setHourlyWageText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            {/* Break */}
            <Text style={[styles.label, styles.mt]}>Break minutes</Text>
            <TextInput
              value={breakMinutesText}
              onChangeText={setBreakMinutesText}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            {/* Unpaid break */}
            <View style={[styles.rowBetween, styles.mt]}>
              <Text style={styles.label}>Deduct unpaid break</Text>
              <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} />
            </View>

            {/* Tips */}
            <Text style={[styles.label, styles.mt]}>Cash tips</Text>
            <TextInput
              value={cashTipsText}
              onChangeText={setCashTipsText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            <Text style={[styles.label, styles.mt]}>Card tips</Text>
            <TextInput
              value={creditTipsText}
              onChangeText={setCreditTipsText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#6B7280"
              style={styles.input}
            />

            {/* Note */}
            <Text style={[styles.label, styles.mt]}>Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional note…"
              placeholderTextColor="#6B7280"
              style={[styles.input, styles.noteInput]}
              multiline
            />

            {!!preview && (
              <View style={styles.preview}>
                <Text style={styles.previewTitle}>Live Preview</Text>

                <PreviewRow label="Hours" value={`${preview.hours.toFixed(2)}h`} />
                <PreviewRow label="Wage" value={fmtMoney(preview.hourlyPay)} />
                <PreviewRow label="Tips" value={fmtMoney(preview.tips)} />
                <PreviewRow label="Total" value={fmtMoney(preview.total)} bold />
              </View>
            )}

            <Pressable style={[styles.btn, styles.btnGreen]} onPress={onPunchOut}>
              <Text style={styles.btnText}>Punch Out (Save)</Text>
            </Pressable>

            <Pressable style={[styles.btn, styles.btnRed]} onPress={onCancelPunch}>
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
                    onPress={() => onSelectWorkplace(w.id)}
                    style={[styles.pickRow, selected && styles.pickRowActive]}
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
                onPress={() => onSelectRole("")}
                style={[styles.pickRow, !roleId && styles.pickRowActive]}
              >
                <Text style={styles.pickText}>No role</Text>
                <Text style={styles.pickHint}>{!roleId ? "Selected" : "Tap"}</Text>
              </Pressable>

              {roles.map((r) => {
                const selected = r.id === roleId;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => onSelectRole(r.id)}
                    style={[styles.pickRow, selected && styles.pickRowActive]}
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
              <PreviewRow label="Hourly wage" value={fmtMoney(hourlyWage)} />
              <PreviewRow label="Break" value={`${breakMinutes}m`} />
              <PreviewRow label="Unpaid break" value={unpaidBreak ? "Yes" : "No"} />
            </View>

            <Pressable style={[styles.btn, styles.btnBlue]} onPress={onPunchIn}>
              <Text style={styles.btnText}>Punch In Now</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

/* ---------------- small helper row ---------------- */

function PreviewRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, bold && { fontWeight: "900" }]}>{label}</Text>
      <Text style={[styles.previewValue, bold && { fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 30,
    gap: 14,
  },

  headerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  backText: { color: "white", fontSize: 20, fontWeight: "900" },

  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4, // ✅ keeps subtitle from touching
  },
  sub: {
    color: "#B8C0CC",
    fontSize: 14,
    lineHeight: 18,
  },

  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 10,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },

  bigLine: { color: "white", fontSize: 16, fontWeight: "800" },
  muted: { color: "#9CA3AF", fontSize: 12 },

  label: { color: "#B8C0CC", fontSize: 13 },
  input: {
    backgroundColor: "#0B0F1A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    color: "white",
  },
  noteInput: { minHeight: 70, textAlignVertical: "top" },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  preview: {
    backgroundColor: "#0B0F1A",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 6,
  },
  previewTitle: { color: "white", fontWeight: "900" },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  previewLabel: { color: "#9CA3AF" },
  previewValue: { color: "white", fontWeight: "800" },

  pickRow: {
    backgroundColor: "#0B0F1A",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickRowActive: { borderColor: "#2563EB" },
  pickText: { color: "white", fontWeight: "800" },
  pickHint: { color: "#9CA3AF", fontSize: 12 },

  btn: {
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "white", fontWeight: "900" },
  btnGreen: { backgroundColor: "#16A34A" },
  btnRed: { backgroundColor: "#7F1D1D" },
  btnBlue: { backgroundColor: "#2563EB" },

  mt: { marginTop: 10 },
});
