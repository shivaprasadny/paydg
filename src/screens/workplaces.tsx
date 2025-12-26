// src/screens/workplaces.tsx
// ---------------------------------------------------------
// Workplaces Screen
// ✅ Add / Edit / Delete workplace
// ✅ Uses workplaceRepo.ts (addWorkplace, updateWorkplace, deleteWorkplace, listWorkplaces)
// ✅ i18n (English/Spanish) + reactive updates via useLang()
// ---------------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { getProfile } from "../storage/repositories/profileRepo";
import {
  addWorkplace,
  deleteWorkplace,
  listWorkplaces,
  updateWorkplace,
} from "../storage/repositories/workplaceRepo";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";

export default function WorkplacesScreen() {
  const router = useRouter();
  const profile = getProfile();

  // ✅ rerender when language changes
  useLang();

  // Used to re-run listWorkplaces() after add/edit/delete
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  // Pull workplaces from cache (sync)
  const workplaces = useMemo(() => listWorkplaces(), [refreshKey]);

  /* ---------------------------
     Helpers
  --------------------------- */
  function resetForm() {
    setEditingId(null);
    setName("");
  }

  function onEdit(item: any) {
    setEditingId(item.id);
    setName(item.name);
  }

  /* ---------------------------
     Save (Add or Update)
  --------------------------- */
  async function onSave() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      Alert.alert(
        t("workplace_name_required"),
        t("workplace_name_required_msg")
      );
      return;
    }

    try {
      if (editingId) {
        // ✅ repo signature: updateWorkplace(id, patch)
        await updateWorkplace(editingId, { name: trimmed });
      } else {
        // ✅ repo signature: addWorkplace(name)
        await addWorkplace(trimmed);
      }

      resetForm();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      Alert.alert("Error", "Could not save workplace.");
    }
  }

  /* ---------------------------
     Delete
  --------------------------- */
  function onDelete(id: string, wpName: string) {
    Alert.alert(
      t("delete_workplace_q"),
      t("delete_workplace_msg", { name: wpName }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkplace(id);
              setRefreshKey((k) => k + 1);
              if (editingId === id) resetForm();
            } catch (e) {
              Alert.alert("Error", "Could not delete workplace.");
            }
          },
        },
      ]
    );
  }

  const canContinue = workplaces.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      {/* ---------------- Header ---------------- */}
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "white" }}>
          {t("workplaces_title")} 🏢
        </Text>





        <Text style={{ fontSize: 14, color: "#B8C0CC", marginTop: 6 }}>
          {profile?.userName ? `${profile.userName}, ` : ""}
          {t("workplaces_title")} — {workplaces.length}
        </Text>
      </View>

      {/* ---------------- Form Card ---------------- */}
      <View
        style={{
          marginHorizontal: 20,
          backgroundColor: "#111827",
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: "#1F2937",
        }}
      >
        <Text style={{ color: "#B8C0CC", marginBottom: 6 }}>
          {t("workplace_name")}
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder='e.g., "Don Giovanni"'
          placeholderTextColor="#6B7280"
          autoCapitalize="words"
          style={{
            backgroundColor: "#0B0F1A",
            color: "white",
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#1F2937",
            marginBottom: 10,
            fontSize: 16,
          }}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={onSave}
            style={{
              flex: 1,
              backgroundColor: "#2563EB",
              padding: 12,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>
              {editingId ? t("update") : t("add_workplace")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={resetForm}
            style={{
              padding: 12,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#334155",
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {t("clear")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------------- List ---------------- */}
      <View style={{ flex: 1, marginTop: 14 }}>
        <FlatList
          data={workplaces}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 14,
            gap: 10,
          }}
          renderItem={({ item }: any) => (
            <View
              style={{
                backgroundColor: "#111827",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#1F2937",
              }}
            >
              <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>
                {item.name}
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => onEdit(item)}
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#334155",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    {t("edit")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onDelete(item.id, item.name)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: "#7F1D1D",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "800" }}>
                    {t("delete")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* ---------------- Continue ---------------- */}
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          disabled={!canContinue}
          style={{
            opacity: canContinue ? 1 : 0.5,
            backgroundColor: "#16A34A",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "800" }}>
            {t("continue")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
