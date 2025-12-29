// src/screens/edit-role.tsx
// ---------------------------------------------------------
// Edit Role
// ✅ Edit role name
// ✅ Optional defaults for Role (wage/break/unpaid)
// ✅ Delete role
// ✅ i18n (English/Spanish) via t() + re-render via useLang()
// ✅ Uses reusable AppScreen (no SafeAreaView/ScrollView here)
// ---------------------------------------------------------

import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { deleteRole, getRoleById, updateRole } from "../storage/repositories/roleRepo";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import AppScreen from "../components/Screen";

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
  // ✅ rerender when language changes
  useLang();

  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? "";

  const role = getRoleById(id);

  // Not found
  if (!role) {
    return (
      <AppScreen bg="#0B0F1A" pad={16} contentContainerStyle={{ gap: 12 }}>
        <ActiveShiftTimerCard />

        <Text style={styles.titleDark}>{t("edit_role_title")}</Text>
        <Text style={styles.helperDark}>{t("role_not_found")}</Text>

        <Pressable style={[styles.btn, styles.btnBlue]} onPress={() => router.back()}>
          <Text style={styles.btnText}>{t("go_back")}</Text>
        </Pressable>
      </AppScreen>
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
    Alert.alert(t("saved"), t("role_updated"), [{ text: "OK", onPress: () => router.back() }]);
  }

  function onDelete() {
    Alert.alert(t("delete_role_q"), t("delete_role_help"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          await deleteRole(id);
          router.replace("/roles");
        },
      },
    ]);
  }

  return (
    <AppScreen bg="#0B0F1A" pad={16} contentContainerStyle={{ gap: 12 }}>
      <ActiveShiftTimerCard />

      <Text style={styles.titleDark}>{t("edit_role_title")}</Text>

      {/* ---------------- Basics ---------------- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("basics")}</Text>

        <Text style={styles.label}>{t("role_name")}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder={t("role_name_placeholder")}
          placeholderTextColor="#6B7280"
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
          placeholderTextColor="#6B7280"
          style={[styles.input, !useDefaults && styles.inputDisabled]}
        />

        <Text style={[styles.label, { marginTop: 10 }]}>{t("default_break_minutes")}</Text>
        <TextInput
          value={breakText}
          onChangeText={setBreakText}
          editable={useDefaults}
          keyboardType="number-pad"
          placeholder={t("leave_blank_fallback")}
          placeholderTextColor="#6B7280"
          style={[styles.input, !useDefaults && styles.inputDisabled]}
        />

        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <Text style={styles.label}>{t("default_deduct_unpaid_break")}</Text>
          <Switch value={unpaidBreak} onValueChange={setUnpaidBreak} disabled={!useDefaults} />
        </View>
      </View>

      {/* ---------------- Actions ---------------- */}
      <Pressable style={[styles.btn, styles.btnGreen]} onPress={onSave}>
        <Text style={styles.btnText}>{t("save")}</Text>
      </Pressable>

      <Pressable style={[styles.btn, styles.btnRed]} onPress={onDelete}>
        <Text style={styles.btnText}>{t("delete_role_btn")}</Text>
      </Pressable>

      <Pressable style={[styles.btn, styles.btnDark]} onPress={() => router.back()}>
        <Text style={styles.btnText}>{t("cancel")}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Dark header text
  titleDark: { color: "white", fontSize: 28, fontWeight: "900" },
  helperDark: { color: "#B8C0CC", fontSize: 13, lineHeight: 18 },

  // Card
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 10,
  },
  cardTitle: { color: "white", fontSize: 16, fontWeight: "900" },

  label: { color: "#B8C0CC", fontSize: 13, marginBottom: 6 },
  helper: { color: "#9CA3AF", fontSize: 12, lineHeight: 16 },

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

  // Buttons
  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "900" },

  btnGreen: { backgroundColor: "#16A34A", borderColor: "#14532D" },
  btnRed: { backgroundColor: "#7F1D1D", borderColor: "#3F0A0A" },
  btnBlue: { backgroundColor: "#2563EB", borderColor: "#1E3A8A" },
  btnDark: { backgroundColor: "#111827" },
});
