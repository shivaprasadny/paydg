// src/services/biometricService.ts
// ---------------------------------------------------------
// PayDG — Biometric Service
// ✅ Saves ON/OFF setting
// ✅ Checks Face ID / Touch ID / Fingerprint availability
// ✅ Authenticates user
// ---------------------------------------------------------

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const BIOMETRIC_ENABLED_KEY = "paydg_biometric_enabled_v1";

export async function isBiometricAvailable() {
  const hardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();

  return hardware && enrolled;
}

export async function isBiometricEnabled() {
  const raw = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return raw === "true";
}

export async function setBiometricEnabled(enabled: boolean) {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? "true" : "false");
}

export async function authenticateWithBiometrics() {
  const available = await isBiometricAvailable();

  if (!available) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock PayDG",
    promptSubtitle: "Use Face ID, Touch ID, or Fingerprint",
    fallbackLabel: "Use PIN",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  return result.success === true;
}