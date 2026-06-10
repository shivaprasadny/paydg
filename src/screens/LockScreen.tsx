import React, { useEffect, useState } from "react";
import {
  Alert,
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

import { getPinHint, verifyPin } from "../services/securityService";

import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  isBiometricEnabled,
} from "../services/biometricService";

type Props = {
  onUnlocked: () => void;
};

export default function LockScreen({ onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [pinHint, setPinHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function loadLockState() {
      const hint = await getPinHint();
      setPinHint(hint);

      const enabled = await isBiometricEnabled();
      const available = await isBiometricAvailable();

      const ready = enabled && available;
      setBiometricReady(ready);

      if (ready) {
        timer = setTimeout(() => {
          handleBiometricUnlock();
        }, 1000);
      }
    }

    loadLockState();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function handleUnlock() {
    Keyboard.dismiss();

    if (pin.length !== 4) {
      Alert.alert("Invalid PIN", "Please enter your 4-digit PIN.");
      return;
    }

    const correct = await verifyPin(pin);

    if (!correct) {
      setPin("");
      Alert.alert("Wrong PIN", "Please try again.");
      return;
    }

    setPin("");
    onUnlocked();
  }

  async function handleBiometricUnlock() {
    const success = await authenticateWithBiometrics();

    if (success) {
      setPin("");
      onUnlocked();
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.card}>
          <View style={styles.lockCircle}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          <Text style={styles.title}>PayDG Locked</Text>

          <Text style={styles.subtitle}>
            Unlock with Face ID, Fingerprint, or your 4-digit PIN.
          </Text>

          {biometricReady ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.biometricButton}
              onPress={handleBiometricUnlock}
            >
              <Text style={styles.biometricButtonText}>
                🧬 Unlock with Biometrics
              </Text>
            </TouchableOpacity>
          ) : null}

          {pinHint.trim().length > 0 && (
            <>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.hintButton}
                onPress={() => setShowHint(!showHint)}
              >
                <Text style={styles.hintButtonText}>
                  {showHint ? "Hide PIN Hint" : "Show PIN Hint"}
                </Text>
              </TouchableOpacity>

              {showHint && (
                <View style={styles.hintBox}>
                  <Text style={styles.hintLabel}>Hint</Text>
                  <Text style={styles.hintText}>{pinHint}</Text>
                </View>
              )}
            </>
          )}

          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="••••"
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            onSubmitEditing={handleUnlock}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.unlockButton}
            onPress={handleUnlock}
          >
            <Text style={styles.unlockButtonText}>Unlock with PIN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 34,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  lockCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  lockIcon: { fontSize: 38 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  biometricButton: {
    width: "100%",
    backgroundColor: "#D97706",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  biometricButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  hintButton: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 13,
    alignItems: "center",
    marginBottom: 12,
  },
  hintButtonText: {
    color: "#D97706",
    fontWeight: "900",
    fontSize: 13,
  },
  hintBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  hintLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#D97706",
    marginBottom: 4,
  },
  hintText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  input: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 16,
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: 10,
    marginBottom: 16,
  },
  unlockButton: {
    width: "100%",
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  unlockButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});