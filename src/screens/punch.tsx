// src/screens/punch.tsx
// ---------------------------------------------------------
// PayDG — Punch In / Punch Out
// Premium light finance theme
//
// ✅ Punch in with workplace + optional role
// ✅ Live active shift timer
// ✅ Edit wage, break, tips before punch out
// ✅ Live earnings preview
// ✅ Clean comments, emojis, spacing, premium cards
// ---------------------------------------------------------

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
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
};

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

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
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();

  return Math.max(0, Math.round((end - start) / 60000));
}

function calcHourlyPay(workedMinutes: number, hourlyWage: number) {
  const hours = workedMinutes / 60;
  return Number((hours * hourlyWage).toFixed(2));
}

/**
 * Resolve default values.
 * Priority:
 * 1. Role defaults
 * 2. Workplace defaults
 * 3. Profile defaults
 */
function resolveDefaults(params: { workplaceId?: string; roleId?: string }) {
  const profile = getProfile();
  const workplace = params.workplaceId
    ? getWorkplaceById(params.workplaceId)
    : null;
  const role = params.roleId ? getRoleById(params.roleId) : null;

  const hourlyWage =
    role?.defaultHourlyWage ??
    workplace?.defaultHourlyWage ??
    profile?.defaultHourlyWage ??
    0;

  const breakMinutes =
    role?.defaultBreakMinutes ??
    workplace?.defaultBreakMinutes ??
    profile?.defaultBreakMinutes ??
    30;

  const unpaidBreak =
    role?.defaultUnpaidBreak ??
    workplace?.defaultUnpaidBreak ??
    profile?.defaultUnpaidBreak ??
    false;

  return { hourlyWage, breakMinutes, unpaidBreak };
}

/* =========================================================
   Screen
========================================================= */

export default function PunchScreen() {
  const router = useRouter();

  const workplaces = useMemo(() => listWorkplaces(), []);
  const roles = useMemo(() => listRoles(), []);

  const [active, setActive] = useState<ActivePunch | null>(null);

  const [workplaceId, setWorkplaceId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [hourlyWageText, setHourlyWageText] = useState("0");
  const [breakMinutesText, setBreakMinutesText] = useState("30");
  const [unpaidBreak, setUnpaidBreak] = useState(false);

  const [cashTipsText, setCashTipsText] = useState("0");
  const [creditTipsText, setCreditTipsText] = useState("0");
  const [note, setNote] = useState("");

  /**
   * Force timer refresh every second while active.
   */
  const [, forceTick] = useState(0);

  const refreshActive = useCallback(async () => {
    const punch = await getActivePunch();
    setActive(punch);
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

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  /**
   * Auto-select first workplace when screen opens.
   */
  useEffect(() => {
    if (!workplaceId && workplaces.length > 0) {
      const first = workplaces[0];

      setWorkplaceId(first.id);

      const defaults = resolveDefaults({
        workplaceId: first.id,
        roleId: undefined,
      });

      setHourlyWageText(String(defaults.hourlyWage));
      setBreakMinutesText(String(defaults.breakMinutes));
      setUnpaidBreak(!!defaults.unpaidBreak);
    }
  }, [workplaceId, workplaces]);

  const hourlyWage = safeNumber(hourlyWageText);
  const breakMinutes = Math.max(0, Math.round(safeNumber(breakMinutesText)));

  const elapsedLabel =
    active?.startedAtISO
      ? formatDuration(
          Math.max(0, Date.now() - new Date(active.startedAtISO).getTime())
        )
      : "00:00:00";

  /**
   * Live earnings preview while shift is active.
   */
  const preview = useMemo(() => {
    if (!active) return null;

    const endISO = new Date().toISOString();
    const rawMins = diffMinutes(active.startedAtISO, endISO);
    const netMins = unpaidBreak
      ? Math.max(0, rawMins - breakMinutes)
      : rawMins;

    const hours = netMins / 60;
    const hourlyPay = calcHourlyPay(netMins, hourlyWage);
    const tips = safeNumber(cashTipsText) + safeNumber(creditTipsText);
    const total = Number((hourlyPay + tips).toFixed(2));

    return { hours, hourlyPay, tips, total };
  }, [
    active,
    unpaidBreak,
    breakMinutes,
    hourlyWage,
    cashTipsText,
    creditTipsText,
  ]);

  /* ---------------------------------------------------------
     Selection Actions
  --------------------------------------------------------- */

  const onSelectWorkplace = useCallback(
    (id: string) => {
      setWorkplaceId(id);

      const defaults = resolveDefaults({
        workplaceId: id,
        roleId: roleId || undefined,
      });

      setHourlyWageText(String(defaults.hourlyWage));
      setBreakMinutesText(String(defaults.breakMinutes));
      setUnpaidBreak(!!defaults.unpaidBreak);
    },
    [roleId]
  );

  const onSelectRole = useCallback(
    (id: string) => {
      setRoleId(id);

      const defaults = resolveDefaults({
        workplaceId,
        roleId: id || undefined,
      });

      setHourlyWageText(String(defaults.hourlyWage));
      setBreakMinutesText(String(defaults.breakMinutes));
      setUnpaidBreak(!!defaults.unpaidBreak);
    },
    [workplaceId]
  );

  /* ---------------------------------------------------------
     Punch Actions
  --------------------------------------------------------- */

  const onPunchIn = useCallback(async () => {
    if (!workplaceId) {
      Alert.alert("Select workplace", "Please choose a workplace first.");
      return;
    }

    const workplace = getWorkplaceById(workplaceId);
    const role = roleId ? getRoleById(roleId) : null;

    try {
      await punchIn({
        workplaceId,
        workplaceName: workplace?.name,
        roleId: roleId || undefined,
        roleName: role?.name,
        hourlyWage,
        breakMinutes,
        unpaidBreak,
        note: note.trim() || undefined,
      });

      setCashTipsText("0");
      setCreditTipsText("0");

      await refreshActive();
    } catch {
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

      setNote("");
      setCashTipsText("0");
      setCreditTipsText("0");

      await refreshActive();

      Alert.alert("Saved ✅", "Shift saved to History.");
      router.back();
    } catch {
      Alert.alert("Error", "Could not punch out.");
    }
  }, [cashTipsText, creditTipsText, note, refreshActive, router]);

  const onCancelPunch = useCallback(async () => {
    Alert.alert("Cancel punch?", "This will remove the active shift without saving.", [
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
          } catch {
            Alert.alert("Error", "Could not cancel punch.");
          }
        },
      },
    ]);
  }, [refreshActive]);

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <Screen bg={COLORS.bg} pad={16}>
      <ActiveShiftTimerCard />

      {/* -------------------- Header -------------------- */}
      <View style={styles.header}>
        <Text style={styles.kicker}>PAYDG LIVE SHIFT</Text>
        <Text style={styles.title}>{active ? "Active Punch" : "Punch In"}</Text>
        <Text style={styles.subtitle}>
          {active
            ? "Track live earnings and save your shift when you punch out."
            : "Choose your workplace, confirm defaults, and start your shift."}
        </Text>
      </View>

      {active ? (
        <ActiveShiftCard
          active={active}
          elapsedLabel={elapsedLabel}
          hourlyWageText={hourlyWageText}
          setHourlyWageText={setHourlyWageText}
          breakMinutesText={breakMinutesText}
          setBreakMinutesText={setBreakMinutesText}
          unpaidBreak={unpaidBreak}
          setUnpaidBreak={setUnpaidBreak}
          cashTipsText={cashTipsText}
          setCashTipsText={setCashTipsText}
          creditTipsText={creditTipsText}
          setCreditTipsText={setCreditTipsText}
          note={note}
          setNote={setNote}
          preview={preview}
          onPunchOut={onPunchOut}
          onCancelPunch={onCancelPunch}
        />
      ) : (
        <PunchInCard
          workplaces={workplaces}
          roles={roles}
          workplaceId={workplaceId}
          roleId={roleId}
          hourlyWage={hourlyWage}
          breakMinutes={breakMinutes}
          unpaidBreak={unpaidBreak}
          onSelectWorkplace={onSelectWorkplace}
          onSelectRole={onSelectRole}
          onPunchIn={onPunchIn}
        />
      )}
    </Screen>
  );
}

/* =========================================================
   Active Shift Card
========================================================= */

function ActiveShiftCard({
  active,
  elapsedLabel,
  hourlyWageText,
  setHourlyWageText,
  breakMinutesText,
  setBreakMinutesText,
  unpaidBreak,
  setUnpaidBreak,
  cashTipsText,
  setCashTipsText,
  creditTipsText,
  setCreditTipsText,
  note,
  setNote,
  preview,
  onPunchOut,
  onCancelPunch,
}: any) {
  return (
    <View style={styles.card}>
      <SectionHeader emoji="⏱️" title="Active Shift" />

      <View style={styles.activeBanner}>
        <Text style={styles.activeLabel}>Currently working</Text>
        <Text style={styles.activeTitle}>
          {active.workplaceName ?? "Workplace"}
          {active.roleName ? ` • ${active.roleName}` : ""}
        </Text>
        <Text style={styles.activeSub}>
          Started {fmtTime(active.startedAtISO)} • {elapsedLabel}
        </Text>
      </View>

      <InputBlock
        label="Hourly wage"
        value={hourlyWageText}
        onChangeText={setHourlyWageText}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <InputBlock
        label="Break minutes"
        value={breakMinutesText}
        onChangeText={setBreakMinutesText}
        keyboardType="number-pad"
        placeholder="30"
      />

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Deduct unpaid break</Text>
          <Text style={styles.toggleSub}>Subtract break time from paid hours.</Text>
        </View>

        <Switch
          value={unpaidBreak}
          onValueChange={setUnpaidBreak}
          trackColor={{ false: "#CBD5E1", true: "#BBF7D0" }}
          thumbColor={unpaidBreak ? COLORS.green : "#F8FAFC"}
        />
      </View>

      <InputBlock
        label="Cash tips"
        value={cashTipsText}
        onChangeText={setCashTipsText}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <InputBlock
        label="Card tips"
        value={creditTipsText}
        onChangeText={setCreditTipsText}
        keyboardType="decimal-pad"
        placeholder="0"
      />

      <Text style={styles.label}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional note…"
        placeholderTextColor="#94A3B8"
        style={[styles.input, styles.noteInput]}
        multiline
      />

      {!!preview && (
        <View style={styles.preview}>
          <SectionHeader emoji="💰" title="Live Preview" small />

          <PreviewRow label="Hours" value={`${preview.hours.toFixed(2)}h`} />
          <PreviewRow label="Wage" value={fmtMoney(preview.hourlyPay)} />
          <PreviewRow label="Tips" value={fmtMoney(preview.tips)} />
          <PreviewRow label="Total" value={fmtMoney(preview.total)} bold />
        </View>
      )}

      <Pressable style={styles.greenBtn} onPress={onPunchOut}>
        <Text style={styles.btnText}>✅ Punch Out & Save</Text>
      </Pressable>

      <Pressable style={styles.dangerOutlineBtn} onPress={onCancelPunch}>
        <Text style={styles.dangerOutlineText}>Cancel Punch</Text>
      </Pressable>
    </View>
  );
}

/* =========================================================
   Punch In Card
========================================================= */

function PunchInCard({
  workplaces,
  roles,
  workplaceId,
  roleId,
  hourlyWage,
  breakMinutes,
  unpaidBreak,
  onSelectWorkplace,
  onSelectRole,
  onPunchIn,
}: any) {
  return (
    <View style={styles.card}>
      <SectionHeader emoji="📍" title="Choose Workplace" />

      <View style={styles.listGap}>
        {workplaces.map((workplace: any) => {
          const selected = workplace.id === workplaceId;

          return (
            <ChoiceRow
              key={workplace.id}
              title={workplace.name}
              selected={selected}
              onPress={() => onSelectWorkplace(workplace.id)}
            />
          );
        })}
      </View>

      <View style={styles.sectionDivider} />

      <SectionHeader emoji="🧢" title="Role Optional" />

      <View style={styles.listGap}>
        <ChoiceRow
          title="No role"
          selected={!roleId}
          onPress={() => onSelectRole("")}
        />

        {roles.map((role: any) => {
          const selected = role.id === roleId;

          return (
            <ChoiceRow
              key={role.id}
              title={role.name}
              selected={selected}
              onPress={() => onSelectRole(role.id)}
            />
          );
        })}
      </View>

      <View style={styles.preview}>
        <SectionHeader emoji="⚙️" title="Shift Defaults" small />

        <PreviewRow label="Hourly wage" value={fmtMoney(hourlyWage)} />
        <PreviewRow label="Break" value={`${breakMinutes}m`} />
        <PreviewRow label="Unpaid break" value={unpaidBreak ? "Yes" : "No"} />
      </View>

      <Pressable style={styles.primaryBtn} onPress={onPunchIn}>
        <Text style={styles.btnText}>🚀 Punch In Now</Text>
      </Pressable>
    </View>
  );
}

/* =========================================================
   Small Components
========================================================= */

function SectionHeader({
  emoji,
  title,
  small,
}: {
  emoji: string;
  title: string;
  small?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={small ? styles.smallIconBox : styles.sectionIconBox}>
        <Text style={small ? styles.smallEmoji : styles.sectionEmoji}>
          {emoji}
        </Text>
      </View>

      <Text style={small ? styles.smallCardTitle : styles.cardTitle}>
        {title}
      </Text>
    </View>
  );
}

function InputBlock({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: any) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
    </>
  );
}

function ChoiceRow({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.choiceRow,
        selected && styles.choiceRowActive,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View>
        <Text style={styles.choiceTitle}>{title}</Text>
        <Text style={styles.choiceSub}>{selected ? "Selected" : "Tap to select"}</Text>
      </View>

      <View style={selected ? styles.selectedPill : styles.tapPill}>
        <Text style={selected ? styles.selectedPillText : styles.tapPillText}>
          {selected ? "✓" : "Tap"}
        </Text>
      </View>
    </Pressable>
  );
}

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
      <Text style={[styles.previewLabel, bold && styles.previewBoldLabel]}>
        {label}
      </Text>

      <Text style={[styles.previewValue, bold && styles.previewBoldValue]}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  header: {
    marginTop: 14,
    marginBottom: 16,
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
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 20,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
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

  sectionIconBox: {
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

  smallIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  sectionEmoji: {
    fontSize: 19,
  },

  smallEmoji: {
    fontSize: 15,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.navy,
  },

  smallCardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.navy,
  },

  activeBanner: {
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  activeLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.green,
    marginBottom: 4,
  },

  activeTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.navy,
  },

  activeSub: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.navy,
    marginBottom: 8,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: COLORS.inputBg,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.navy,
    marginBottom: 14,
  },

  noteInput: {
    minHeight: 82,
    paddingTop: 14,
    textAlignVertical: "top",
  },

  toggleRow: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  toggleTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.navy,
  },

  toggleSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    lineHeight: 17,
  },

  listGap: {
    gap: 10,
  },

  choiceRow: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  choiceRowActive: {
    backgroundColor: COLORS.goldSoft,
    borderColor: COLORS.goldBorder,
  },

  choiceTitle: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 15,
  },

  choiceSub: {
    marginTop: 3,
    color: COLORS.muted,
    fontWeight: "700",
    fontSize: 12,
  },

  selectedPill: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  selectedPillText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },

  tapPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  tapPillText: {
    color: COLORS.muted,
    fontWeight: "800",
    fontSize: 12,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },

  preview: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    marginBottom: 16,
  },

  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  previewLabel: {
    color: COLORS.muted,
    fontWeight: "700",
  },

  previewValue: {
    color: COLORS.navy,
    fontWeight: "900",
  },

  previewBoldLabel: {
    color: COLORS.navy,
    fontWeight: "900",
  },

  previewBoldValue: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: "900",
  },

  primaryBtn: {
    backgroundColor: COLORS.navy,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  greenBtn: {
    backgroundColor: COLORS.green,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 4,
  },

  dangerOutlineBtn: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },

  dangerOutlineText: {
    color: COLORS.danger,
    fontWeight: "900",
    fontSize: 15,
  },

  btnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
});