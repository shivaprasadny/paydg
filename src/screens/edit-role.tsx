// src/screens/edit-role.tsx
// ---------------------------------------------------------
// Edit Role
// ✅ Edit role name
// ✅ Optional defaults for Role (wage/break/unpaid)
// ✅ Delete role
// ✅ i18n (English/Spanish) via t() + re-render via useLang()
// ---------------------------------------------------------

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

import { deleteRole, getRoleById, updateRole } from "../storage/repositories/roleRepo";
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

export default function EditRoleScreen() {
  // ✅ STEP 2: rerender when language changes
  useLang();

  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? "";

  const role = getRoleById(id);

  if (!role) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>{t("edit_role_title")}</Text>
          <Text style={styles.helper}>{t("role_not_found")}</Text>

          <Pressable style={styles.saveBtn} onPress={() => router.back()}>
            <Text style={styles.saveBtnText}>{t("go_back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initial = useMemo(() => {
    return {
      name: role.name ?? "",
      wage: String(role.defaultHourlyWage ?? ""),
      breakMinutes: String(role.defaultBreakMinutes ?? ""),
      unpaid: role.defaultUnpaidBreak ?? true,
      useDefaults:
        role.defaultHourlyWage != null ||
        role.defaultBreakMinutes != null ||
        role.defaultUnpaidBreak != null,
    };
  }, [role]);

  const [name, setName] = useState(initial.name);
  const [useDefaults, setUseDefaults] = useState(initial.useDefaults);
  const [wageText, setWageText] = useState(initial.wage);
  const [breakText, setBreakText] = useState(initial.breakMinutes);
  const [unpaidBreak, setUnpaidBreak] = useState(initial.unpaid);

  async function onSave() {
    const nm = name.trim();
    if (!nm) {
      Alert.alert(t("name_required"), t("role_name_required_msg"));
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

    await updateRole(id, patch);
    Alert.alert(t("saved"), t("role_updated"), [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  function onDelete() {
    Alert.alert(
      t("delete_role_q"),
      t("delete_role_help"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            await deleteRole(id);
            router.replace("/roles");
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>


                <ActiveShiftTimerCard />
        <Text style={styles.title}>{t("edit_role_title")}</Text>

        {/* ---------------- Basics ---------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("basics")}</Text>

          <Text style={styles.label}>{t("role_name")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder={t("role_name_placeholder")}
          />
        </View>

        {/* ---------------- Defaults ---------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("defaults_optional")}</Text>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t("use_role_defaults")}</Text>
            <Switch value={useDefaults} onValueChange={setUseDefaults} />
          </View>

          <Text style={styles.helper}>{t("role_defaults_help")}</Text>

          <View style={{ height: 10 }} />

          <Text style={styles.label}>{t("default_hourly_wage")}</Text>
          <TextInput
            value={wageText}
            onChangeText={setWageText}
            editable={useDefaults}
            keyboardType="decimal-pad"
            placeholder={t("leave_blank_fallback")}
            style={[styles.input, !useDefaults && styles.inputDisabled]}
          />

          <Text style={[styles.label, { marginTop: 10 }]}>
            {t("default_break_minutes")}
          </Text>
          <TextInput
            value={breakText}
            onChangeText={setBreakText}
            editable={useDefaults}
            keyboardType="number-pad"
            placeholder={t("leave_blank_fallback")}
            style={[styles.input, !useDefaults && styles.inputDisabled]}
          />

          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <Text style={styles.label}>{t("default_deduct_unpaid_break")}</Text>
            <Switch
              value={unpaidBreak}
              onValueChange={setUnpaidBreak}
              disabled={!useDefaults}
            />
          </View>
        </View>

        {/* ---------------- Actions ---------------- */}
        <Pressable style={styles.saveBtn} onPress={onSave}>
          <Text style={styles.saveBtnText}>{t("save")}</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: "#b91c1c" }]}
          onPress={onDelete}
        >
          <Text style={styles.saveBtnText}>{t("delete_role_btn")}</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: "#e5e5e5" }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.saveBtnText, { color: "#111" }]}>
            {t("cancel")}
          </Text>
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
    backgroundColor: "#111",
    marginTop: 6,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
