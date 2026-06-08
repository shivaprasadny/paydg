// src/screens/workplaces.tsx
// ---------------------------------------------------------
// PayDG — Workplaces
// ✅ Premium light theme
// ✅ Smooth FlatList scrolling
// ✅ Inline edit inside same workplace card
// ✅ Android bottom spacing
// ✅ Onboarding support with skip option
// ---------------------------------------------------------

import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getProfile } from "../storage/repositories/profileRepo";
import {
  addWorkplace,
  deleteWorkplace,
  listWorkplaces,
  updateWorkplace,
} from "../storage/repositories/workplaceRepo";

import { t } from "../i18n";
import { useLang } from "../i18n/useLang";
import ActiveShiftTimerCard from "../components/ActiveShiftTimerCard";
import Screen from "../components/Screen";

export default function WorkplacesScreen() {
  const router = useRouter();
  const profile = getProfile();

  const params = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = params.onboarding === "1";

  useLang();

  const [refreshKey, setRefreshKey] = useState(0);

  // Add form state
  const [name, setName] = useState("");

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const workplaces = useMemo(() => listWorkplaces(), [refreshKey]);

  async function onAdd() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      Alert.alert(
        t("workplace_name_required") ?? "Workplace name required",
        t("workplace_name_required_msg") ?? "Please enter at least 2 characters."
      );
      return;
    }

    try {
      await addWorkplace(trimmed);
      setName("");
      setRefreshKey((k) => k + 1);
    } catch {
      Alert.alert("Error", "Could not save workplace.");
    }
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id: string) {
    const trimmed = editingName.trim();

    if (trimmed.length < 2) {
      Alert.alert("Workplace name required", "Please enter at least 2 characters.");
      return;
    }

    try {
      await updateWorkplace(id, { name: trimmed });
      cancelEdit();
      setRefreshKey((k) => k + 1);
    } catch {
      Alert.alert("Error", "Could not update workplace.");
    }
  }

  function onDelete(id: string, wpName: string) {
    Alert.alert(
      t("delete_workplace_q") ?? "Delete workplace?",
      t("delete_workplace_msg", { name: wpName }) ??
        `Delete ${wpName}? This cannot be undone.`,
      [
        {
          text: t("cancel") ?? "Cancel",
          style: "cancel",
        },
        {
          text: t("delete") ?? "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkplace(id);

              if (editingId === id) {
                cancelEdit();
              }

              setRefreshKey((k) => k + 1);
            } catch {
              Alert.alert("Error", "Could not delete workplace.");
            }
          },
        },
      ]
    );
  }

  function goNext() {
    if (isOnboarding) {
      router.replace("/roles?onboarding=1");
    } else {
      router.back();
    }
  }

  function skipOnboardingStep() {
    router.replace("/roles?onboarding=1");
  }

  return (
    <Screen bg="#F6F7FB" pad={0} scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <FlatList
            data={workplaces}
            keyExtractor={(item: any) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.headerContent}>
                <ActiveShiftTimerCard />

                <View style={styles.heroCard}>
                  <Text style={styles.eyebrow}>
                    {isOnboarding ? "Step 2 of 3" : "🏢 Workplace setup"}
                  </Text>

                  <Text style={styles.title}>
                    {t("workplaces_title") ?? "Workplaces"} 🏢
                  </Text>

                  <Text style={styles.subtitle}>
                    {profile?.userName ? `${profile.userName}, ` : ""}
                    add where you work so PayDG can organize your shifts and stats.
                  </Text>
                </View>

                {/* Add workplace form */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>➕ Add workplace</Text>

                  <Text style={styles.cardSubtitle}>
                    Example: Don Giovanni, Gotham Bar, Brooklyn Cafe
                  </Text>

                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder='e.g., "Don Giovanni"'
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="words"
                    style={styles.input}
                  />

                  <TouchableOpacity
                    onPress={onAdd}
                    activeOpacity={0.85}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryText}>
                      {t("add_workplace") ?? "Add workplace"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.listTitle}>
                  Saved workplaces ({workplaces.length})
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No workplace added yet</Text>

                <Text style={styles.emptyText}>
                  Add one now, or skip this step and add it later.
                </Text>
              </View>
            }
            renderItem={({ item }: any) => {
              const isEditing = editingId === item.id;

              return (
                <View style={styles.workplaceCard}>
                  {!isEditing ? (
                    <>
                      <Text style={styles.workplaceName}>🏢 {item.name}</Text>

                      <Text style={styles.workplaceSub}>
                        Used for shift history, stats, and insights.
                      </Text>

                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          onPress={() => startEdit(item)}
                          style={styles.editBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.editText}>
                            {t("edit") ?? "Edit"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => onDelete(item.id, item.name)}
                          style={styles.deleteBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.deleteText}>
                            {t("delete") ?? "Delete"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.cardTitle}>✏️ Edit workplace</Text>

                      <TextInput
                        value={editingName}
                        onChangeText={setEditingName}
                        placeholder="Workplace name"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="words"
                        style={styles.input}
                      />

                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          onPress={() => saveEdit(item.id)}
                          style={styles.primarySmallBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.primaryText}>Save</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={cancelEdit}
                          style={styles.cancelBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            }}
            ListFooterComponent={
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={goNext}
                  activeOpacity={0.85}
                  style={styles.continueBtn}
                >
                  <Text style={styles.continueText}>
                    {isOnboarding
                      ? "Continue to Role"
                      : t("continue") ?? "Continue"}
                  </Text>
                </TouchableOpacity>

                {isOnboarding ? (
                  <TouchableOpacity
                    onPress={skipOnboardingStep}
                    activeOpacity={0.85}
                    style={styles.skipBtn}
                  >
                    <Text style={styles.skipText}>Skip for now</Text>
                  </TouchableOpacity>
                ) : null}

                <Text style={styles.footerNote}>
                  You can manage workplaces anytime from the menu.
                </Text>
              </View>
            }
          />
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 18,
    paddingBottom: 56,
    gap: 12,
  },
  headerContent: {
    gap: 14,
  },

  heroCard: {
    backgroundColor: "#1E293B",
    borderRadius: 28,
    padding: 22,
  },
  eyebrow: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginTop: 8,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },

  input: {
    backgroundColor: "#F8FAFC",
    color: "#0F172A",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
    fontWeight: "800",
  },

  primaryBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  primarySmallBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  listTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },

  workplaceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  workplaceName: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  workplaceSub: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: -6,
  },

  rowActions: {
    flexDirection: "row",
    gap: 10,
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  editText: {
    color: "#1E293B",
    fontWeight: "900",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  deleteText: {
    color: "#B91C1C",
    fontWeight: "900",
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#1E293B",
    fontWeight: "900",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
    fontWeight: "700",
  },

  footer: {
    gap: 10,
    marginTop: 4,
  },
  continueBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#D97706",
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  skipBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "900",
  },
  footerNote: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
  },
});