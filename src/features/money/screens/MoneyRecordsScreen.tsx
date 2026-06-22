import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MoneyScreen from "../components/MoneyScreen";
import TransactionRow from "../components/TransactionRow";
import {
  deleteMoneyTransaction,
  listMoneyTransactions,
  toggleMoneyFavorite,
} from "../moneyService";
import { formatMoney, MONEY_COLORS } from "../theme";
import { MoneyTransaction, MoneyTransactionType } from "../types";

type Filter = "ALL" | MoneyTransactionType;

export default function MoneyRecordsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<MoneyTransaction[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRecords(
      await listMoneyTransactions({
        type: filter === "ALL" ? undefined : filter,
      })
    );
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) =>
      [
        record.title,
        record.categoryName,
        record.paymentMethod,
        record.note,
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [records, search]);

  const totals = useMemo(
    () =>
      visibleRecords.reduce(
        (result, record) => {
          result[record.type] += record.amount;
          return result;
        },
        { INCOME: 0, EXPENSE: 0 }
      ),
    [visibleRecords]
  );

  const confirmDelete = (record: MoneyTransaction) => {
    Alert.alert(
      "Delete record?",
      `${record.title} will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteMoneyTransaction(record.id);
            await load();
          },
        },
      ]
    );
  };

  return (
    <MoneyScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>MONEY HISTORY</Text>
          <Text style={styles.title}>Your records</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/money/add")}
        >
          <Text style={styles.addButtonText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <View style={styles.totalColumn}>
          <Text style={styles.totalLabel}>Income shown</Text>
          <Text style={[styles.totalValue, { color: MONEY_COLORS.green }]}>
            {formatMoney(totals.INCOME)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalColumn}>
          <Text style={styles.totalLabel}>Expenses shown</Text>
          <Text style={[styles.totalValue, { color: MONEY_COLORS.red }]}>
            {formatMoney(totals.EXPENSE)}
          </Text>
        </View>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search title, category, or note"
        placeholderTextColor="#94A3B8"
        style={styles.search}
      />

      <View style={styles.filters}>
        {(["ALL", "EXPENSE", "INCOME"] as Filter[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filter, filter === item && styles.filterActive]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item && styles.filterTextActive,
              ]}
            >
              {item === "ALL"
                ? "All"
                : item === "EXPENSE"
                  ? "Expenses"
                  : "Income"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.listCard}>
        {visibleRecords.length ? (
          visibleRecords.map((record) => (
            <View key={record.id} style={styles.recordWrap}>
              <TransactionRow
                transaction={record}
                onPress={() =>
                  router.push({
                    pathname: "/money/add",
                    params: { id: String(record.id) },
                  })
                }
              />
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={async () => {
                  await toggleMoneyFavorite(
                    record.id,
                    record.isFavorite !== 1
                  );
                  await load();
                }}
              >
                <Text style={styles.favoriteText}>
                  {record.isFavorite === 1 ? "★ Favorite" : "☆ Favorite"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(record)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No matching records</Text>
            <Text style={styles.emptyText}>
              Try another filter or add a new transaction.
            </Text>
          </View>
        )}
      </View>
    </MoneyScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    color: MONEY_COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: MONEY_COLORS.navy,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
  },
  addButton: {
    backgroundColor: MONEY_COLORS.navy,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  addButtonText: { color: "#FFFFFF", fontWeight: "900" },
  totalCard: {
    flexDirection: "row",
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 20,
    paddingVertical: 17,
    marginBottom: 14,
  },
  totalColumn: { flex: 1, paddingHorizontal: 16 },
  divider: { width: 1, backgroundColor: MONEY_COLORS.border },
  totalLabel: { color: MONEY_COLORS.muted, fontSize: 11, fontWeight: "700" },
  totalValue: { fontSize: 18, fontWeight: "900", marginTop: 5 },
  search: {
    height: 50,
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 15,
    color: MONEY_COLORS.navy,
    fontWeight: "700",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  filter: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#E2E8F0",
  },
  filterActive: { backgroundColor: MONEY_COLORS.navy },
  filterText: { color: MONEY_COLORS.muted, fontSize: 12, fontWeight: "900" },
  filterTextActive: { color: "#FFFFFF" },
  listCard: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  recordWrap: { position: "relative", paddingBottom: 24 },
  deleteButton: { position: "absolute", right: 0, bottom: 6 },
  favoriteButton: { position: "absolute", left: 0, bottom: 6 },
  favoriteText: { color: MONEY_COLORS.amber, fontSize: 11, fontWeight: "900" },
  deleteText: { color: MONEY_COLORS.red, fontSize: 11, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 38 },
  emptyIcon: { fontSize: 34 },
  emptyTitle: {
    color: MONEY_COLORS.navy,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyText: { color: MONEY_COLORS.muted, fontSize: 12, marginTop: 5 },
});
