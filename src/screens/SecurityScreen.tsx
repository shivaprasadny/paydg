import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled as saveBiometricEnabled,
} from "../services/biometricService";

export default function SecurityScreen() {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [pinHint, setPinHint] = useState("");

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    const enabled = await isPinEnabled();
    const hint = await getPinHint();

    const bioAvailable = await isBiometricAvailable();
    const bioEnabled = await isBiometricEnabled();

    setPinEnabled(enabled);
    setPinHint(hint);
    setBiometricAvailable(bioAvailable);
    setBiometricEnabled(bioEnabled);
  }

  function isValidPin(value: string) {
    return /^\d{4}$/.test(value);
  }

  function clearFields() {
    setPin("");
    setConfirmPin("");
    setOldPin("");
  }

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

  async function handleDisablePin() {
    if (!isValidPin(oldPin)) {
      Alert.alert("PIN Required", "Please enter your current PIN before disabling.");
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

          // If PIN is disabled, biometric should also be disabled.
          await saveBiometricEnabled(false);

          clearFields();
          setPinHint("");
          setPinEnabled(false);
          setBiometricEnabled(false);

          Alert.alert("Success", "PIN disabled.");
        },
      },
    ]);
  }

  async function handleUpdateHint() {
    await savePinHint(pinHint);
    Alert.alert("Saved", "PIN hint updated.");
  }

 async function handleToggleBiometric() {
  if (!pinEnabled) {
    Alert.alert(
      "Enable PIN first",
      "Please enable PIN lock before using biometric unlock. PIN is required as a fallback."
    );
    return;
  }

  const newValue = !biometricEnabled;

  if (newValue) {
    const available = await isBiometricAvailable();

    if (!available) {
      Alert.alert(
        "Biometric unavailable",
        "Face ID, Touch ID, or Fingerprint is not available or not enrolled on this device."
      );
      return;
    }

    const success = await authenticateWithBiometrics();

    if (!success) {
      Alert.alert(
        "Not enabled",
        "Biometric verification was cancelled or failed."
      );
      return;
    }
  }

  await saveBiometricEnabled(newValue);

  const savedValue = await isBiometricEnabled();
  setBiometricEnabled(savedValue);

  Alert.alert(
    "Biometric Unlock",
    savedValue ? "Biometric is now ON." : "Biometric is now OFF."
  );
}

 return (
  <KeyboardAvoidingView
    style={styles.screen}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
  >
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      scrollEventThrottle={16}
      overScrollMode="never"
    >
      <Text style={styles.title}>Security</Text>
      <Text style={styles.subtitle}>
        Protect PayDG with PIN and biometric unlock.
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

            <Text style={styles.label}>{pinEnabled ? "New PIN" : "Create PIN"}</Text>

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
              <TouchableOpacity style={styles.secondaryButton} onPress={handleUpdateHint}>
                <Text style={styles.secondaryButtonText}>Update PIN Hint</Text>
              </TouchableOpacity>
            )}

            {!pinEnabled ? (
              <TouchableOpacity style={styles.primaryButton} onPress={handleEnablePin}>
                <Text style={styles.primaryButtonText}>Enable PIN Lock</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={handleChangePin}>
                  <Text style={styles.primaryButtonText}>Change PIN</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dangerButton} onPress={handleDisablePin}>
                  <Text style={styles.dangerButtonText}>Disable PIN</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

         

         {/* Biometric Unlock */}
<View style={styles.card}>
  <View style={styles.statusBox}>
    <View>
      <Text style={styles.statusTitle}>Biometric Unlock</Text>
      <Text style={styles.statusSub}>
        Face ID, Touch ID, or Fingerprint with PIN fallback
      </Text>
    </View>

    <Text style={biometricEnabled ? styles.statusOn : styles.statusOff}>
      {biometricEnabled ? "ON" : "OFF"}
    </Text>
  </View>

  {!pinEnabled ? (
    <View style={styles.warningBox}>
      <Text style={styles.warningText}>
        Enable PIN first to use biometric unlock.
      </Text>
    </View>
  ) : !biometricAvailable ? (
    <View style={styles.warningBox}>
      <Text style={styles.warningText}>
        Biometric unlock is not available or not enrolled on this device.
      </Text>
    </View>
  ) : null}

  <TouchableOpacity
    style={biometricEnabled ? styles.biometricOffButton : styles.biometricButton}
    onPress={handleToggleBiometric}
  >
    <Text
      style={
        biometricEnabled
          ? styles.biometricOffButtonText
          : styles.biometricButtonText
      }
    >
      {biometricEnabled ? "Disable Biometric" : "Enable Biometric"}
    </Text>
  </TouchableOpacity>
</View>


        

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Important</Text>
            <Text style={styles.infoText}>
              PIN is saved only on this phone. Biometric unlock only works when PIN lock is enabled.
            </Text>
          </View>
        
   </ScrollView>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7FB" },
content: {
  padding: 20,
  paddingBottom: 70,
},
  title: { fontSize: 32, fontWeight: "900", color: "#0F172A" },
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
  statusTitle: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  statusSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  statusOn: { fontSize: 13, fontWeight: "900", color: "#059669" },
  statusOff: { fontSize: 13, fontWeight: "900", color: "#64748B" },
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
  primaryButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  secondaryButton: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  secondaryButtonText: { color: "#D97706", fontWeight: "900", fontSize: 15 },
  dangerButton: {
    marginTop: 12,
    backgroundColor: "#DC2626",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  dangerButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  biometricButton: {
    backgroundColor: "#D97706",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  biometricButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  biometricOffButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  biometricOffButtonText: {
    color: "#B91C1C",
    fontWeight: "900",
    fontSize: 16,
  },
 warningBox: {
  backgroundColor: "#FFF7ED",
  borderWidth: 1,
  borderColor: "#FED7AA",
  borderRadius: 16,
  padding: 14,
  marginBottom: 14,
},
  warningText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
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
