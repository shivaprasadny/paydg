import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  getWorkplaceById,
  updateWorkplace,
} from "../storage/repositories/workplaceRepo";

import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

function parseMoney(s: string) {
  const cleaned = s.replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(s: string, fallback: number) {
  const cleaned = s.replace(/[^0-9]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export default function EditWorkplaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id ?? "");

  const workplace = getWorkplaceById(id);

  // ✅ Always call hooks before any early return
  const initial = useMemo(() => {
    return {
      name: workplace?.name ?? "",
      wage: workplace?.defaultHourlyWage != null ? String(workplace.defaultHourlyWage) : "",
      breakMinutes:
        workplace?.defaultBreakMinutes != null ? String(workplace.defaultBreakMinutes) : "",
      // ✅ don't accidentally force true
      unpaid: workplace?.defaultUnpaidBreak ?? false,
      useWorkplaceDefaults:
        workplace?.defaultHourlyWage != null ||
        workplace?.defaultBreakMinutes != null ||
        workplace?.defaultUnpaidBreak != null,
    };
  }, [workplace]);

  const [name, setName] = useState(initial.name);
  const [useDefaults, setUseDefaults] = useState(initial.useWorkplaceDefaults);

  const [wageText, setWageText] = useState(initial.wage);
  const [breakText, setBreakText] = useState(initial.breakMinutes);
  const [unpaidBreak, setUnpaidBreak] = useState(initial.unpaid);

  async function onSave() {
    if (!workplace) return;

    const nm = name.trim();
    if (!nm) {
      Alert.alert("Name", "Please enter workplace name.");
      return;
    }

    const patch: any = { name: nm };

    if (!useDefaults) {
      patch.defaultHourlyWage = undefined;
      patch.defaultBreakMinutes = undefined;
      patch.defaultUnpaidBreak = undefined;
    } else {
      const wage = wageText.trim() === "" ? undefined : parseMoney(wageText);
      const brk =
        breakText.trim() === ""
          ? undefined
          : Math.min(240, Math.max(0, parseIntSafe(breakText, 30)));

      patch.defaultHourlyWage = wage;
      patch.defaultBreakMinutes = brk;
      patch.defaultUnpaidBreak = unpaidBreak;
    }

    await updateWorkplace(id, patch);
    Alert.alert("Saved", "Workplace updated ✅", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  // ✅ If workplace not found
  if (!workplace) {
    return (
      <Screen pad={16}>
        <ActiveShiftTimerCard />
        <Text style={styles.title}>Edit Workplace</Text>
        <Text style={styles.helper}>Workplace not found.</Text>

        <Pressable style={styles.saveBtn} onPress={() => router.back()}>
          <Text style={styles.saveBtnText}>Go back</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen pad={16}>
      <ActiveShiftTimerCard />

      <Text style={styles.title}>Edit Workplace</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Basics</Text>

        <Text style={styles.label}>Workplace name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="e.g. Don Giovanni"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Defaults (optional)</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Use workplace defaults</Text>
          <Switch value={useDefaults} onValueChange={setUseDefaults} />
        </View>

        <Text style={styles.helper}>
          If enabled, Add Shift will auto-fill from this workplace first.
        </Text>

        <View style={{ height: 10 }} />

        <Text style={styles.label}>Default hourly wage</Text>
        <TextInput
          value={wageText}
          onChangeText={setWageText}
          editable={useDefaults}
          keyboardType="decimal-pad"
          placeholder="Leave blank to use Settings"
          placeholderTextColor="#9CA3AF"
          style={[styles.input, !useDefaults && styles.inputDisabled]}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>Default break minutes</Text>
        <TextInput
          value={breakText}
          onChangeText={setBreakText}
          editable={useDefaults}
          keyboardType="number-pad"
          placeholder="Leave blank to use Settings"
          placeholderTextColor="#9CA3AF"
          style={[styles.input, !useDefaults && styles.inputDisabled]}
        />

        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <Text style={styles.label}>Default: deduct unpaid break</Text>
          <Switch
            value={unpaidBreak}
            onValueChange={setUnpaidBreak}
            disabled={!useDefaults}
          />
        </View>
      </View>

      <Pressable style={styles.saveBtn} onPress={onSave}>
        <Text style={styles.saveBtnText}>Save</Text>
      </Pressable>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: "#111827", borderWidth: 1, borderColor: "#1F2937" }]}
        onPress={() => router.back()}
      >
        <Text style={styles.saveBtnText}>Cancel</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: "white", fontSize: 26, fontWeight: "900" },

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

  label: { color: "#B8C0CC", fontSize: 13, marginBottom: 6 },
  helper: { color: "#9CA3AF", fontSize: 12, lineHeight: 16, marginTop: 6 },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#0B0F1A",
    fontSize: 16,
    color: "white",
  },
  inputDisabled: { opacity: 0.5 },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginTop: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});
