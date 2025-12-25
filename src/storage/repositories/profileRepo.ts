import AsyncStorage from "@react-native-async-storage/async-storage";
import { Profile } from "../../models/Profile";

const KEY = "paydg_profile_v1";
let cache: Profile | null = null;

export async function hydrateProfile() {
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? JSON.parse(raw) : null;
  return cache;
}

export function getProfile(): Profile | null {
  return cache;
}

export async function saveProfile(profile: Profile) {
  cache = profile;
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}

// ✅ so your old edit-profile code using upsertProfile won't crash
export const upsertProfile = saveProfile;
