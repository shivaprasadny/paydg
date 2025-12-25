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
import { getProfile } from "../src/storage/repositories/profileRepo";
import {
  createWorkplace,
  deleteWorkplace,
  listWorkplaces,
  updateWorkplace,
} from "../src/storage/repositories/workplaceRepo";

function makeId(prefix = "wp") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export default function WorkplacesScreen() {
  const router = useRouter();
  const profile = getProfile();

  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const workplaces = useMemo(() => listWorkplaces(), [refreshKey]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
  };

  const onSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert("Workplace name required", "Please enter at least 2 characters.");
      return;
    }

    if (editingId) {
      updateWorkplace({ id: editingId, name: trimmed });
    } else {
      createWorkplace({ id: makeId(), name: trimmed });
    }

    resetForm();
    setRefreshKey((k) => k + 1);
  };

  const onEdit = (wp: any) => {
    setEditingId(wp.id);
    setName(wp.name);
  };

  const onDelete = (id: string, wpName: string) => {
    Alert.alert(
      "Delete workplace?",
      `Delete "${wpName}" and all shifts under it? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteWorkplace(id);
            setRefreshKey((k) => k + 1);
            if (editingId === id) resetForm();
          },
        },
      ]
    );
  };

  const canContinue = workplaces.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B0F1A" }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "white" }}>
          Workplaces 🏢
        </Text>
        <Text style={{ fontSize: 14, color: "#B8C0CC", marginTop: 6 }}>
          {profile?.userName
            ? `${profile.userName}, add where you work.`
            : "Add where you work."} You can add multiple restaurants.
        </Text>
      </View>

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
        <Text style={{ color: "#B8C0CC", marginBottom: 6 }}>Workplace name</Text>
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
              {editingId ? "Update" : "Add Workplace"}
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
            <Text style={{ color: "white", fontWeight: "700" }}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, marginTop: 14 }}>
        <FlatList
          data={workplaces}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, gap: 10 }}
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
                  <Text style={{ color: "white", fontWeight: "700" }}>Edit</Text>
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
                  <Text style={{ color: "white", fontWeight: "800" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

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
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
