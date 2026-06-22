import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MoneyScreen from "../components/MoneyScreen";
import {
  deleteMoneyCategory,
  listMoneyCategories,
  saveMoneyCategory,
} from "../moneyService";
import { MONEY_COLORS } from "../theme";
import { MoneyCategory, MoneyTransactionType } from "../types";

export default function MoneyCategoriesScreen() {
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [type, setType] = useState<MoneyTransactionType>("EXPENSE");
  const [editing, setEditing] = useState<MoneyCategory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💰");

  const load = useCallback(async () => {
    setCategories(await listMoneyCategories());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openEditor = (category?: MoneyCategory) => {
    setEditing(category ?? null);
    setType(category?.type ?? type);
    setName(category?.name ?? "");
    setIcon(category?.icon ?? "💰");
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Enter a category name.");
      return;
    }
    try {
      await saveMoneyCategory({ name, icon, type }, editing?.id);
      setModalOpen(false);
      await load();
    } catch {
      Alert.alert(
        "Could not save",
        "A category with that name may already exist."
      );
    }
  };

  const remove = (category: MoneyCategory) => {
    Alert.alert(
      "Delete category?",
      "Existing records will move to the matching Other category.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMoneyCategory(category);
              await load();
            } catch (error: any) {
              Alert.alert("Cannot delete", error?.message ?? "Please try again.");
            }
          },
        },
      ]
    );
  };

  const visible = categories.filter((category) => category.type === type);

  return (
    <MoneyScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ORGANIZE YOUR MONEY</Text>
          <Text style={styles.title}>Categories</Text>
          <Text style={styles.subtitle}>
            Keep the list short enough to make every record easy to classify.
          </Text>
        </View>
        <TouchableOpacity style={styles.add} onPress={() => openEditor()}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.switcher}>
        {(["EXPENSE", "INCOME"] as MoneyTransactionType[]).map((item) => (
          <Pressable
            key={item}
            style={[styles.switchItem, type === item && styles.switchActive]}
            onPress={() => setType(item)}
          >
            <Text
              style={[
                styles.switchText,
                type === item && styles.switchTextActive,
              ]}
            >
              {item === "EXPENSE" ? "Expense categories" : "Income categories"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {visible.map((category) => (
          <View key={category.id} style={styles.row}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>{category.icon}</Text>
            </View>
            <Text style={styles.name}>{category.name}</Text>
            <TouchableOpacity onPress={() => openEditor(category)}>
              <Text style={styles.edit}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(category)}>
              <Text style={styles.delete}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Text style={styles.modalTitle}>
              {editing ? "Edit category" : "New category"}
            </Text>
            <Text style={styles.fieldLabel}>Icon</Text>
            <TextInput
              value={icon}
              onChangeText={setIcon}
              style={styles.input}
              maxLength={4}
            />
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Category name"
              placeholderTextColor="#94A3B8"
              maxLength={40}
            />
            <TouchableOpacity style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Save category</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: MONEY_COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: MONEY_COLORS.navy,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: MONEY_COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  add: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: MONEY_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  addText: { color: "#FFFFFF", fontSize: 24 },
  switcher: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    padding: 4,
    borderRadius: 16,
    marginBottom: 14,
  },
  switchItem: {
    flex: 1,
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  switchActive: { backgroundColor: MONEY_COLORS.card },
  switchText: { color: MONEY_COLORS.muted, fontSize: 11, fontWeight: "900" },
  switchTextActive: { color: MONEY_COLORS.navy },
  list: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 67,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MONEY_COLORS.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 19 },
  name: {
    flex: 1,
    color: MONEY_COLORS.navy,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 11,
  },
  edit: { color: MONEY_COLORS.blue, fontSize: 11, fontWeight: "900" },
  delete: {
    color: MONEY_COLORS.red,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 13,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  modal: {
    backgroundColor: MONEY_COLORS.card,
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 17,
  },
  fieldLabel: {
    color: MONEY_COLORS.navy,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 13,
    color: MONEY_COLORS.navy,
    fontWeight: "700",
    marginBottom: 14,
  },
  save: {
    height: 52,
    borderRadius: 16,
    backgroundColor: MONEY_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  saveText: { color: "#FFFFFF", fontWeight: "900" },
});
