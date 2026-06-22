import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MONEY_COLORS } from "../theme";

export type SelectorOption<T extends string | number> = {
  label: string;
  value: T;
  icon?: string;
  detail?: string;
};

export default function SelectorModal<T extends string | number>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: SelectorOption<T>[];
  selectedValue?: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const selected = option.value === selectedValue;
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  {!!option.icon && (
                    <View style={styles.icon}>
                      <Text style={styles.iconText}>{option.icon}</Text>
                    </View>
                  )}
                  <View style={styles.copy}>
                    <Text style={styles.label}>{option.label}</Text>
                    {!!option.detail && (
                      <Text style={styles.detail}>{option.detail}</Text>
                    )}
                  </View>
                  <Text style={styles.check}>{selected ? "✓" : "›"}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: MONEY_COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 28,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 99,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { flex: 1, color: MONEY_COLORS.navy, fontSize: 21, fontWeight: "900" },
  close: { color: MONEY_COLORS.muted, fontSize: 31 },
  option: {
    minHeight: 61,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MONEY_COLORS.border,
    paddingHorizontal: 5,
  },
  optionSelected: { backgroundColor: MONEY_COLORS.blueSoft },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  copy: { flex: 1, marginLeft: 11 },
  label: { color: MONEY_COLORS.navy, fontSize: 14, fontWeight: "900" },
  detail: { color: MONEY_COLORS.muted, fontSize: 11, marginTop: 3 },
  check: { color: MONEY_COLORS.blue, fontSize: 20, fontWeight: "900" },
  cancel: {
    height: 50,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  cancelText: { color: MONEY_COLORS.navy, fontWeight: "900" },
});
