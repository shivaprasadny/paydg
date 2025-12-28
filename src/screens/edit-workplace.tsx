import React, { useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

import { getWorkplaceById, updateWorkplace } from "../storage/repositories/workplaceRepo";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
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
  const id = params.id ?? "";

  const workplace = getWorkplaceById(id);

  // Safety guard
  if (!workplace) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Edit Workplace</Text>
          <Text style={styles.helper}>Workplace not found.</Text>

          <Pressable style={styles.saveBtn} onPress={() => router.back()}>
            <Text style={styles.saveBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Initialize text fields from existing workplace
  const initial = useMemo(() => {
    return {
      name: workplace.name ?? "",
      wage: String(workplace.defaultHourlyWage ?? ""),
      breakMinutes: String(workplace.defaultBreakMinutes ?? ""),
      unpaid: workplace.defaultUnpaidBreak ?? true,
      useWorkplaceDefaults:
        workplace.defaultHourlyWage != null ||
        workplace.defaultBreakMinutes != null ||
        workplace.defaultUnpaidBreak != null,
    };
  }, [workplace]);

  const [name, setName] = useState(initial.name);

  // If they turn OFF “Use workplace defaults”, we clear wage/break fields on save
  const [useDefaults, setUseDefaults] = useState(initial.useWorkplaceDefaults);

  const [wageText, setWageText] = useState(initial.wage);
  const [breakText, setBreakText] = useState(initial.breakMinutes);
  const [unpaidBreak, setUnpaidBreak] = useState(initial.unpaid);

  async function onSave() {
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
      const brk = breakText.trim() === "" ? undefined : Math.min(240, Math.max(0, parseIntSafe(breakText, 30)));

      patch.defaultHourlyWage = wage;
      patch.defaultBreakMinutes = brk;
      patch.defaultUnpaidBreak = unpaidBreak;
    }

    await updateWorkplace(id, patch);
    Alert.alert("Saved", "Workplace updated ✅", [{ text: "OK", onPress: () => router.back() }]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

                <ActiveShiftTimerCard />
        <Text style={styles.title}>Edit Workplace</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basics</Text>

          <Text style={styles.label}>Workplace name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="e.g. Don Giovanni" />
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
            style={[styles.input, !useDefaults && styles.inputDisabled]}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Default break minutes</Text>
          <TextInput
            value={breakText}
            onChangeText={setBreakText}
            editable={useDefaults}
            keyboardType="number-pad"
            placeholder="Leave blank to use Settings"
            style={[styles.input, !useDefaults && styles.inputDisabled]}
          />

          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <Text style={styles.label}>Default: deduct unpaid break</Text>
            <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} disabled={!useDefaults} />
          </View>
        </View>

        <Pressable style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>

        <Pressable style={[styles.saveBtn, { backgroundColor: "#e5e5e5" }]} onPress={() => router.back()}>
          <Text style={[styles.saveBtnText, { color: "#111" }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, paddingBottom: 30, gap: 12 },

  title: { fontSize: 28, fontWeight: "800" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },

  label: { fontSize: 13, opacity: 0.7, marginBottom: 6 },
  helper: { fontSize: 12, opacity: 0.6 },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  inputDisabled: { opacity: 0.5 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  saveBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
