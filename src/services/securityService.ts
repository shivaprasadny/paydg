import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * PayDG PIN storage keys.
 * This PIN is saved locally on the user's phone.
 */
const PIN_ENABLED_KEY = "PAYDG_PIN_ENABLED";
const PIN_VALUE_KEY = "PAYDG_PIN_VALUE";
const PIN_HINT_KEY = "PAYDG_PIN_HINT";

/**
 * Check if PIN lock is enabled.
 */
export async function isPinEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PIN_ENABLED_KEY);
  return value === "true";
}

/**
 * Enable PIN lock and save the PIN.
 */
export async function enablePin(pin: string) {
  await AsyncStorage.setItem(PIN_VALUE_KEY, pin);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, "true");
}

/**
 * Verify entered PIN with saved PIN.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const savedPin = await AsyncStorage.getItem(PIN_VALUE_KEY);
  return savedPin === pin;
}

/**
 * Change existing PIN.
 */
export async function changePin(newPin: string) {
  await AsyncStorage.setItem(PIN_VALUE_KEY, newPin);
}

/**
 * Disable PIN lock and remove saved PIN/hint.
 */
export async function disablePin() {
  await AsyncStorage.removeItem(PIN_VALUE_KEY);
  await AsyncStorage.removeItem(PIN_HINT_KEY);
  await AsyncStorage.setItem(PIN_ENABLED_KEY, "false");
}

/**
 * Save optional PIN hint.
 */
export async function savePinHint(hint: string) {
  await AsyncStorage.setItem(PIN_HINT_KEY, hint);
}

/**
 * Get optional PIN hint.
 */
export async function getPinHint(): Promise<string> {
  return (await AsyncStorage.getItem(PIN_HINT_KEY)) || "";
}