import React from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { formatMoney, MONEY_COLORS } from "../theme";
import { MoneyTransaction, MoneyTransactionType } from "../types";

type Props = {
  type: MoneyTransactionType;
  expanded: boolean;
  favorites: MoneyTransaction[];
  recent: MoneyTransaction[];
  onToggle: () => void;
  onChoose: (record: MoneyTransaction) => void;
  onRemoveFavorite: (record: MoneyTransaction) => Promise<void>;
};

function QuickRow({
  record,
  favorite,
  onPress,
  onLongPress,
}: {
  record: MoneyTransaction;
  favorite?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>
          {favorite ? "⭐" : record.categoryIcon}
        </Text>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {record.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {record.workplaceName ? `${record.workplaceName} · ` : ""}
          {record.categoryName} · {record.paymentMethod}
        </Text>
      </View>
      <Text style={styles.amount}>{formatMoney(record.amount)}</Text>
    </TouchableOpacity>
  );
}

export default function QuickAddPanel({
  type,
  expanded,
  favorites,
  recent,
  onToggle,
  onChoose,
  onRemoveFavorite,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Quick Add</Text>
      <Text style={styles.sectionText}>
        Reuse a favorite or recent {type === "EXPENSE" ? "expense" : "income"}.
      </Text>
      <TouchableOpacity style={styles.selector} onPress={onToggle}>
        <Text style={styles.selectorText}>Favorites & recent activity</Text>
        <Text style={styles.arrow}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Text style={styles.subheading}>⭐ Favorites</Text>
          <Text style={styles.hint}>Long-press a favorite to remove it.</Text>
          {favorites.length ? (
            favorites.map((record) => (
              <QuickRow
                key={`favorite-${record.id}`}
                record={record}
                favorite
                onPress={() => onChoose(record)}
                onLongPress={() =>
                  Alert.alert(
                    "Remove favorite?",
                    `${record.title} will stay in your records.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => void onRemoveFavorite(record),
                      },
                    ]
                  )
                }
              />
            ))
          ) : (
            <Text style={styles.empty}>
              No favorites yet. Add them from Money Records.
            </Text>
          )}

          <Text style={[styles.subheading, styles.recentHeading]}>
            🕒 Recent activity
          </Text>
          {recent.length ? (
            recent.map((record) => (
              <QuickRow
                key={`recent-${record.id}`}
                record={record}
                onPress={() => onChoose(record)}
              />
            ))
          ) : (
            <Text style={styles.empty}>Your recent templates will appear here.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MONEY_COLORS.card,
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    borderRadius: 22,
    padding: 17,
    marginBottom: 15,
  },
  sectionTitle: { color: MONEY_COLORS.navy, fontSize: 18, fontWeight: "900" },
  sectionText: {
    color: MONEY_COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  selector: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: MONEY_COLORS.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  selectorText: { flex: 1, color: MONEY_COLORS.navy, fontWeight: "800" },
  arrow: { color: MONEY_COLORS.blue, fontSize: 12, fontWeight: "900" },
  content: { marginTop: 15 },
  subheading: { color: MONEY_COLORS.navy, fontSize: 13, fontWeight: "900" },
  recentHeading: { marginTop: 17 },
  hint: { color: MONEY_COLORS.muted, fontSize: 10, marginTop: 3 },
  row: {
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MONEY_COLORS.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: MONEY_COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconText: { fontSize: 16 },
  rowCopy: { flex: 1, marginHorizontal: 10 },
  rowTitle: { color: MONEY_COLORS.navy, fontSize: 13, fontWeight: "900" },
  rowMeta: { color: MONEY_COLORS.muted, fontSize: 10, marginTop: 3 },
  amount: { color: MONEY_COLORS.navy, fontSize: 12, fontWeight: "900" },
  empty: {
    color: MONEY_COLORS.muted,
    fontSize: 11,
    fontStyle: "italic",
    paddingVertical: 12,
  },
});
