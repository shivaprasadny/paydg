import AsyncStorage from "@react-native-async-storage/async-storage";
import { Role } from "../../models/Role";

const KEY = "paydg_roles_v1";

// in-memory cache so listRoles() can be sync
let cache: Role[] = [];

export async function hydrateRoles() {
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? JSON.parse(raw) : [];
  return cache;
}

export function listRoles(): Role[] {
  return cache;
}

async function saveAll(next: Role[]) {
  cache = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getRoleById(id: string) {
  return cache.find((r) => r.id === id) ?? null;
}

export async function addRole(name: string) {
  const now = new Date().toISOString();
  const role: Role = {
    id: String(Date.now()),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };
  await saveAll([role, ...cache]);
  return role;
}

export async function updateRole(id: string, patch: Partial<Role>) {
  const now = new Date().toISOString();
  const next = cache.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now } : r));
  await saveAll(next);
  return getRoleById(id);
}

export async function deleteRole(id: string) {
  const next = cache.filter((r) => r.id !== id);
  await saveAll(next);
  return true;
}
