import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { addRole, listRoles } from "../storage/repositories/roleRepo";
import { t } from "../i18n";
import { useLang } from "../i18n/useLang";

import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

export default function RolesScreen() {
  const router = useRouter();

  // ✅ rerender when language changes
  useLang();

  const [name, setName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ refresh list after add
  const roles = useMemo(() => listRoles(), [refreshKey]);

  async function onAdd() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert(t("role_name_required"), t("role_name_required_msg"));
      return;
    }

    await addRole(trimmed);

    setName("");
    setRefreshKey((k) => k + 1);
  }

  return (
      <Screen bg="#f7f7f7" pad={16}>

                <ActiveShiftTimerCard />
        <Text style={styles.title}>{t("roles_title")}</Text>

        {/* ---------------- Add Role ---------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("add_role")}</Text>

          <Text style={styles.label}>{t("role_name")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Server"
            style={styles.input}
          />

          <Pressable style={styles.btn} onPress={onAdd}>
            <Text style={styles.btnText}>{t("add_role")}</Text>
          </Pressable>
        </View>

        {/* ---------------- Role List ---------------- */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}> {t("roles_title")} </Text>

          {roles.length === 0 ? (
            <Text style={styles.helper}>
              {t("no_roles_helper") /* we will add this key below */}
            </Text>
          ) : (
            roles.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/edit-role?id=${r.id}`)}
                style={styles.row}
              >
                <Text style={styles.rowText}>{r.name}</Text>
                <Text style={styles.rowHint}>{t("edit")} →</Text>
              </Pressable>
            ))
          )}
        </View>
     </Screen>
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

  btn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "900" },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowText: { fontWeight: "900" },
  rowHint: { opacity: 0.6, fontWeight: "800" },
});
