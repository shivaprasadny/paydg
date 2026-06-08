import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import {
  changePin,
  disablePin,
  enablePin,
  getPinHint,
  isPinEnabled,
  savePinHint,
  verifyPin,
} from "../services/securityService";

/**
 * SecurityScreen
 *
 * User can:
 * - Enable 4-digit PIN
 * - Change existing PIN
 * - Disable PIN
 * - Add/update PIN hint
 */
export default function SecurityScreen() {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [pinHint, setPinHint] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  /**
   * Load current PIN status and saved hint.
   */
  async function loadStatus() {
    const enabled = await isPinEnabled();
    const hint = await getPinHint();

    setPinEnabled(enabled);
    setPinHint(hint);
  }

  /**
   * PIN must be exactly 4 digits.
   */
  function isValidPin(value: string) {
    return /^\d{4}$/.test(value);
  }

  /**
   * Clear PIN inputs after save/change/disable.
   */
  function clearFields() {
    setPin("");
    setConfirmPin("");
    setOldPin("");
  }

  /**
   * Enable PIN for the first time.
   */
  async function handleEnablePin() {
    if (!isValidPin(pin)) {
      Alert.alert("Invalid PIN", "PIN must be exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert("PIN mismatch", "PIN and confirm PIN do not match.");
      return;
    }

    await enablePin(pin);
    await savePinHint(pinHint);

    clearFields();
    setPinEnabled(true);

    Alert.alert("Success", "PIN lock enabled.");
  }

  /**
   * Change existing PIN.
   * Current PIN is required before saving new PIN.
   */
  async function handleChangePin() {
    if (!isValidPin(oldPin)) {
      Alert.alert("Invalid PIN", "Please enter your current 4-digit PIN.");
      return;
    }

    const oldPinCorrect = await verifyPin(oldPin);

    if (!oldPinCorrect) {
      Alert.alert("Wrong PIN", "Your current PIN is incorrect.");
      return;
    }

    if (!isValidPin(pin)) {
      Alert.alert("Invalid New PIN", "New PIN must be exactly 4 digits.");
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert("PIN mismatch", "New PIN and confirm PIN do not match.");
      return;
    }

    await changePin(pin);
    await savePinHint(pinHint);

    clearFields();

    Alert.alert("Success", "PIN changed successfully.");
  }

  /**
   * Disable PIN after verifying current PIN.
   */
  async function handleDisablePin() {
    if (!isValidPin(oldPin)) {
      Alert.alert(
        "PIN Required",
        "Please enter your current PIN before disabling."
      );
      return;
    }

    const correct = await verifyPin(oldPin);

    if (!correct) {
      Alert.alert("Wrong PIN", "Your current PIN is incorrect.");
      return;
    }

    Alert.alert("Disable PIN", "Are you sure you want to disable PIN lock?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disable",
        style: "destructive",
        onPress: async () => {
          await disablePin();

          clearFields();
          setPinHint("");
          setPinEnabled(false);

          Alert.alert("Success", "PIN disabled.");
        },
      },
    ]);
  }

  /**
   * Save or update PIN hint.
   */
  async function handleUpdateHint() {
    await savePinHint(pinHint);
    Alert.alert("Saved", "PIN hint updated.");
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.title}>Security</Text>

          <Text style={styles.subtitle}>
            Add a 4-digit PIN to protect your PayDG app.
          </Text>

          <View style={styles.card}>
            <View style={styles.statusBox}>
              <View>
                <Text style={styles.statusTitle}>PIN Lock</Text>
                <Text style={styles.statusSub}>
                  {pinEnabled ? "Your app is protected" : "No PIN enabled yet"}
                </Text>
              </View>

              <Text style={pinEnabled ? styles.statusOn : styles.statusOff}>
                {pinEnabled ? "ON" : "OFF"}
              </Text>
            </View>

            {pinEnabled && (
              <>
                <Text style={styles.label}>Current PIN</Text>
                <TextInput
                  style={styles.input}
                  value={oldPin}
                  onChangeText={setOldPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  placeholder="••••"
                  placeholderTextColor="#94A3B8"
                />
              </>
            )}

            <Text style={styles.label}>
              {pinEnabled ? "New PIN" : "Create PIN"}
            </Text>

            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>Confirm PIN</Text>

            <TextInput
              style={styles.input}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.label}>PIN Hint Optional</Text>

            <TextInput
              style={styles.hintInput}
              value={pinHint}
              onChangeText={setPinHint}
              placeholder="Example: my lucky number"
              placeholderTextColor="#94A3B8"
            />

            {pinEnabled && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.secondaryButton}
                onPress={handleUpdateHint}
              >
                <Text style={styles.secondaryButtonText}>Update PIN Hint</Text>
              </TouchableOpacity>
            )}

            {!pinEnabled ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.primaryButton}
                onPress={handleEnablePin}
              >
                <Text style={styles.primaryButtonText}>Enable PIN Lock</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.primaryButton}
                  onPress={handleChangePin}
                >
                  <Text style={styles.primaryButtonText}>Change PIN</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.dangerButton}
                  onPress={handleDisablePin}
                >
                  <Text style={styles.dangerButtonText}>Disable PIN</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Important</Text>
            <Text style={styles.infoText}>
              This PIN is saved only on this phone. If you delete app data or
              reinstall the app, the PIN may reset.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

/**
 * PayDG premium light theme.
 */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  content: {
    padding: 20,
    paddingBottom: 44,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 18,
  },
  statusBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  statusSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  statusOn: {
    fontSize: 13,
    fontWeight: "900",
    color: "#059669",
  },
  statusOff: {
    fontSize: 13,
    fontWeight: "900",
    color: "#64748B",
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 6,
  },
  hintInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: "#D97706",
    fontWeight: "900",
    fontSize: 15,
  },
  dangerButton: {
    marginTop: 12,
    backgroundColor: "#DC2626",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 22,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1E3A8A",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    color: "#1E40AF",
  },
});