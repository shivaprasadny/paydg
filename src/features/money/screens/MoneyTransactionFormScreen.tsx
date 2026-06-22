import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FormField from "../components/FormField";
import MoneyScreen from "../components/MoneyScreen";
import QuickAddPanel from "../components/QuickAddPanel";
import {
  getMoneyTransaction,
  listFavoriteMoneyTransactions,
  listMoneyCategories,
  listRecentMoneyTemplates,
  saveMoneyTransaction,
  toggleMoneyFavorite,
} from "../moneyService";
import { MONEY_COLORS } from "../theme";
import {
  MoneyCategory,
  MoneyTransaction,
  MoneyTransactionType,
} from "../types";
import { listWorkplaces } from "../../../storage/repositories/workplaceRepo";
import type { Workplace } from "../../../models/Workplace";

const PAYMENT_METHODS = [
  "Credit Card",
  "Debit Card",
  "Cash",
  "Online Payment",
  "Venmo",
  "Zelle",
  "PayPal",
  "Bank Transfer",
  "Check",
  "Other",
];
const RECURRING_OPTIONS = [
  { label: "Does not repeat", value: "" },
  { label: "Weekly", value: "WEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
  { label: "Yearly", value: "YEARLY" },
];

function isoForDate(date: Date) {
  return date.toISOString();
}

export default function MoneyTransactionFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; type?: string }>();
  const editingId = params.id ? Number(params.id) : undefined;
  const initialType: MoneyTransactionType =
    params.type === "INCOME" ? "INCOME" : "EXPENSE";

  const [type, setType] = useState<MoneyTransactionType>(initialType);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [recurringFrequency, setRecurringFrequency] = useState("");
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workplaceId, setWorkplaceId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [favorites, setFavorites] = useState<MoneyTransaction[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<MoneyTransaction[]>([]);
  const workplaces: Workplace[] = listWorkplaces();

  const load = useCallback(async () => {
    const [nextCategories, nextFavorites, nextRecent] = await Promise.all([
      listMoneyCategories(type),
      listFavoriteMoneyTransactions(type),
      listRecentMoneyTemplates(type),
    ]);
    setCategories(nextCategories);
    setFavorites(nextFavorites);
    setRecentTemplates(nextRecent);
    if (!editingId) {
      setCategoryId((current) =>
        nextCategories.some((item) => item.id === current)
          ? current
          : (nextCategories[0]?.id ?? null)
      );
      return;
    }

    const record = await getMoneyTransaction(editingId);
    if (!record) return;
    setType(record.type);
    setTitle(record.title);
    setAmount(String(record.amount));
    setCategoryId(record.categoryId);
    setPaymentMethod(record.paymentMethod);
    setNote(record.note);
    setDate(new Date(record.transactionDate));
    setRecurringFrequency(record.recurringFrequency ?? "");
    setWorkplaceId(record.workplaceId);
  }, [editingId, type]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === categoryId),
    [categories, categoryId]
  );

  const changeType = async (nextType: MoneyTransactionType) => {
    setType(nextType);
    const [nextCategories, nextFavorites, nextRecent] = await Promise.all([
      listMoneyCategories(nextType),
      listFavoriteMoneyTransactions(nextType),
      listRecentMoneyTemplates(nextType),
    ]);
    setCategories(nextCategories);
    setFavorites(nextFavorites);
    setRecentTemplates(nextRecent);
    setCategoryId(nextCategories[0]?.id ?? null);
    setPaymentMethod(
      nextType === "INCOME" ? "Bank Transfer" : "Credit Card"
    );
    if (nextType === "EXPENSE") setWorkplaceId(null);
  };

  const prefillFromRecord = (record: MoneyTransaction) => {
    setTitle(record.title);
    setAmount(String(record.amount));
    setCategoryId(record.categoryId);
    setPaymentMethod(record.paymentMethod);
    setNote(record.note);
    setWorkplaceId(record.workplaceId);
    setRecurringFrequency("");
    setDate(new Date());
    setQuickAddOpen(false);
  };

  const removeFavorite = async (record: MoneyTransaction) => {
    await toggleMoneyFavorite(record.id, false);
    setFavorites(await listFavoriteMoneyTransactions(type));
  };

  const save = async () => {
    const numericAmount = Number(amount);
    if (!title.trim()) {
      Alert.alert("Title required", "Add a short name for this record.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      Alert.alert("Category required", "Choose a category before saving.");
      return;
    }
    if (type === "INCOME" && workplaces.length > 0 && !workplaceId) {
      Alert.alert("Workplace required", "Choose where this income came from.");
      return;
    }

    const workplace = workplaces.find((item) => item.id === workplaceId);

    try {
      setSaving(true);
      await saveMoneyTransaction(
        {
          title,
          amount: numericAmount,
          categoryId,
          paymentMethod,
          note,
          transactionDate: isoForDate(date),
          type,
          recurringFrequency: recurringFrequency || null,
          workplaceId: type === "INCOME" ? workplace?.id : null,
          workplaceName: type === "INCOME" ? workplace?.name : null,
        },
        editingId
      );
      router.back();
    } catch (error) {
      console.error("Money record save failed", error);
      Alert.alert("Could not save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MoneyScreen>
      <View style={styles.intro}>
        <Text style={styles.introEyebrow}>
          {editingId ? "EDIT RECORD" : "NEW RECORD"}
        </Text>
        <Text style={styles.introTitle}>
          {editingId ? "Update the details" : "Where did the money move?"}
        </Text>
        <Text style={styles.introText}>
          Keep it simple. A clear title, amount, and category are enough.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Record Type</Text>
        <View style={styles.typeSwitch}>
          {(["EXPENSE", "INCOME"] as MoneyTransactionType[]).map((item) => {
            const active = type === item;
            return (
              <Pressable
                key={item}
                onPress={() => changeType(item)}
                style={[
                  styles.typeButton,
                  active &&
                    (item === "EXPENSE"
                      ? styles.expenseActive
                      : styles.incomeActive),
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    active && styles.typeTextActive,
                  ]}
                >
                  {item === "EXPENSE" ? "Expense" : "Income"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!editingId && (
        <QuickAddPanel
          type={type}
          expanded={quickAddOpen}
          favorites={favorites}
          recent={recentTemplates}
          onToggle={() => setQuickAddOpen((value) => !value)}
          onChoose={prefillFromRecord}
          onRemoveFavorite={removeFavorite}
        />
      )}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Details</Text>
        <FormField
          label="Name"
          value={title}
          onChangeText={setTitle}
          placeholder={type === "EXPENSE" ? "Groceries" : "Freelance payment"}
          maxLength={80}
        />
        <FormField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerBox}>
          <Text style={styles.pickerIcon}>{selectedCategory?.icon ?? "💰"}</Text>
          <Picker
            selectedValue={categoryId}
            onValueChange={(value) => setCategoryId(Number(value))}
            style={styles.picker}
          >
            {categories.map((category) => (
              <Picker.Item
                key={category.id}
                label={`${category.icon}  ${category.name}`}
                value={category.id}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Payment method</Text>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={paymentMethod}
            onValueChange={setPaymentMethod}
            style={styles.picker}
          >
            {PAYMENT_METHODS.map((method) => (
              <Picker.Item key={method} label={method} value={method} />
            ))}
          </Picker>
        </View>

        {type === "INCOME" && (
          <>
            <Text style={styles.label}>Workplace</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={workplaceId}
                onValueChange={(value) => setWorkplaceId(value)}
                style={styles.picker}
              >
                <Picker.Item
                  label={
                    workplaces.length
                      ? "Select a workplace"
                      : "Add a workplace from the menu"
                  }
                  value={null}
                />
                {workplaces.map((workplace) => (
                  <Picker.Item
                    key={workplace.id}
                    label={`🏢  ${workplace.name}`}
                    value={workplace.id}
                  />
                ))}
              </Picker>
            </View>
          </>
        )}

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            📅 {date.toLocaleDateString(undefined, { dateStyle: "long" })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_, selectedDate) => {
              if (Platform.OS !== "ios") setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recurring</Text>
        <Text style={styles.label}>Repeat</Text>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={recurringFrequency}
            onValueChange={setRecurringFrequency}
            style={styles.picker}
          >
            {RECURRING_OPTIONS.map((option) => (
              <Picker.Item
                key={option.value}
                label={option.label}
                value={option.value}
              />
            ))}
          </Picker>
        </View>

      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Note</Text>
        <FormField
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Optional details"
          multiline
          maxLength={300}
          style={styles.noteInput}
        />
      </View>
      <TouchableOpacity
        disabled={saving}
        onPress={save}
        style={[styles.saveButton, saving && styles.disabled]}
      >
        <Text style={styles.saveText}>
          {saving ? "Saving…" : editingId ? "Save changes" : "Add record"}
        </Text>
      </TouchableOpacity>
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 18 },
  introEyebrow: {
    color: MONEY_COLORS.blue,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  introTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 6,
  },
  introText: {
    color: MONEY_COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  sectionCard: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 22,
    padding: 17,
    marginBottom: 15,
  },
  sectionTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  typeSwitch: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 17,
    marginBottom: 0,
  },
  typeButton: {
    flex: 1,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  expenseActive: { backgroundColor: MONEY_COLORS.red },
  incomeActive: { backgroundColor: MONEY_COLORS.green },
  typeText: { color: MONEY_COLORS.muted, fontWeight: "900", fontSize: 13 },
  typeTextActive: { color: "#FFFFFF" },
  label: {
    color: MONEY_COLORS.navy,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pickerBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 15,
    marginBottom: 17,
    overflow: "hidden",
  },
  pickerIcon: { fontSize: 18, marginLeft: 13 },
  picker: { flex: 1, color: MONEY_COLORS.navy },
  dateButton: {
    minHeight: 50,
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 17,
  },
  dateText: { color: MONEY_COLORS.navy, fontSize: 14, fontWeight: "700" },
  noteInput: { minHeight: 92, paddingTop: 13, textAlignVertical: "top" },
  saveButton: {
    minHeight: 56,
    backgroundColor: MONEY_COLORS.navy,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  disabled: { opacity: 0.55 },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
});
