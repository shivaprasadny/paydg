import AsyncStorage from "@react-native-async-storage/async-storage";
import { Workplace } from "../../models/Workplace";

const KEY = "paydg_workplaces_v1";

// simple in-memory cache (sync reads)
let cache: Workplace[] = [];

/** Hydrate once at app start (migrations/_layout) */
export async function hydrateWorkplaces() {
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? JSON.parse(raw) : [];
  return cache;
}

/** Sync list */
export function listWorkplaces(): Workplace[] {
  return cache;
}

/** Persist list */
async function saveAll(next: Workplace[]) {
  cache = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/** Add workplace */
export async function addWorkplace(name: string) {
  const now = new Date().toISOString();
  const w: Workplace = {
    id: String(Date.now()),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const next = [w, ...cache];
  await saveAll(next);
  return w;
}

/** Find by id (sync) */
export function getWorkplaceById(id: string) {
  return cache.find((w) => w.id === id) ?? null;
}

/** Update by id */
export async function updateWorkplace(id: string, patch: Partial<Workplace>) {
  const now = new Date().toISOString();
  const next = cache.map((w) => {
    if (w.id !== id) return w;
    return { ...w, ...patch, updatedAt: now };
  });
  await saveAll(next);
  return getWorkplaceById(id);
}

/** Delete by id */
export async function deleteWorkplace(id: string) {
  const next = cache.filter((w) => w.id !== id);
  await saveAll(next);
  return true;
}
