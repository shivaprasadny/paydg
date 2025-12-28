import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "paydg_active_shift_v1";

// Active shift kept small + fast
export type ActiveShift = {
  id: string;

  workplaceId: string;
  workplaceName?: string;

  roleId?: string;
  roleName?: string;

  startISO: string;

  // Defaults locked at punch-in time (so if user edits settings later, it won’t change this running shift)
  hourlyWage: number;
  breakMinutes: number;
  unpaidBreak: boolean;
};

let cache: ActiveShift | null = null;

/** Call once at app start (optional, but recommended) */
export async function hydrateActiveShift() {
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? JSON.parse(raw) : null;
  return cache;
}

export function getActiveShift(): ActiveShift | null {
  return cache;
}

export async function setActiveShift(s: ActiveShift) {
  cache = s;
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export async function clearActiveShift() {
  cache = null;
  await AsyncStorage.removeItem(KEY);
  return true;
}
