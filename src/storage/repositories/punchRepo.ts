// src/storage/repositories/punchRepo.ts
// ---------------------------------------------------------
// Punch In / Punch Out storage + Auto-close safety (14 hours)
// ---------------------------------------------------------

import AsyncStorage from "@react-native-async-storage/async-storage";

const ACTIVE_KEY = "paydg_active_shift_v1";
const SHIFTS_KEY = "paydg_shifts_v1";

const MAX_SHIFT_HOURS = 14;
const MAX_SHIFT_MS = MAX_SHIFT_HOURS * 60 * 60 * 1000;

export type ActivePunch = {
  id: string; // active punch id
  startedAtISO: string; // punch in time

  // optional metadata (use what you already store)
  workplaceId?: string;
  workplaceName?: string;

  roleId?: string;
  roleName?: string;

  hourlyWage?: number;
  breakMinutes?: number;
  unpaidBreak?: boolean;

  note?: string;
};

type Shift = {
  id: string;
  isoDate: string;
  startISO: string;
  endISO: string;

  workplaceId?: string;
  workplaceName?: string;

  roleId?: string;
  roleName?: string;

  workedMinutes: number;
  workedHours: number;

  cashTips: number;
  creditTips: number;

  hourlyPay: number;
  totalTips: number;
  totalEarned: number;

  note?: string;

  // ✅ new flags
  autoClosed?: boolean;
};

function toISODateLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffMinutes(startISO: string, endISO: string) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return Math.max(0, Math.round((e - s) / 60000));
}

function applyUnpaidBreak(workedMinutes: number, unpaidBreak?: boolean, breakMinutes?: number) {
  if (!unpaidBreak) return workedMinutes;
  const deduct = Math.max(0, Number(breakMinutes ?? 0));
  return Math.max(0, workedMinutes - deduct);
}

function calcHourlyPay(workedMinutes: number, hourlyWage?: number) {
  const wage = Number(hourlyWage ?? 0);
  const hours = workedMinutes / 60;
  return Number((hours * wage).toFixed(2));
}

function safeNumber(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function makeId(prefix = "sh") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* -----------------------------
   Active punch storage
------------------------------ */

export async function getActivePunch(): Promise<ActivePunch | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_KEY);
  return raw ? (JSON.parse(raw) as ActivePunch) : null;
}

export async function setActivePunch(p: ActivePunch) {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(p));
  return p;
}

export async function clearActivePunch() {
  await AsyncStorage.removeItem(ACTIVE_KEY);
}

/* -----------------------------
   Shifts storage helpers
------------------------------ */

async function readAllShifts(): Promise<Shift[]> {
  const raw = await AsyncStorage.getItem(SHIFTS_KEY);
  return raw ? (JSON.parse(raw) as Shift[]) : [];
}

async function writeAllShifts(shifts: Shift[]) {
  await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  return shifts;
}

async function appendShift(shift: Shift) {
  const all = await readAllShifts();
  const next = [shift, ...all];
  await writeAllShifts(next);
  return shift;
}

/* -----------------------------
   Punch actions
------------------------------ */

export async function punchIn(payload: Omit<ActivePunch, "id" | "startedAtISO">) {
  const active: ActivePunch = {
    id: makeId("punch"),
    startedAtISO: new Date().toISOString(),
    ...payload,
  };
  await setActivePunch(active);
  return active;
}

export async function punchOut(params?: { cashTips?: number; creditTips?: number; note?: string }) {
  const active = await getActivePunch();
  if (!active) return null;

  const endISO = new Date().toISOString();
  const startISO = active.startedAtISO;

  const rawMins = diffMinutes(startISO, endISO);
  const netMins = applyUnpaidBreak(rawMins, active.unpaidBreak, active.breakMinutes);

  const workedHours = Number((netMins / 60).toFixed(2));
  const hourlyPay = calcHourlyPay(netMins, active.hourlyWage);

  const cashTips = safeNumber(params?.cashTips);
  const creditTips = safeNumber(params?.creditTips);
  const totalTips = Number((cashTips + creditTips).toFixed(2));

  const totalEarned = Number((hourlyPay + totalTips).toFixed(2));

  const isoDate = toISODateLocal(new Date(startISO));

  const shift: Shift = {
    id: makeId("shift"),
    isoDate,
    startISO,
    endISO,

    workplaceId: active.workplaceId,
    workplaceName: active.workplaceName,
    roleId: active.roleId,
    roleName: active.roleName,

    workedMinutes: netMins,
    workedHours,

    cashTips,
    creditTips,

    hourlyPay,
    totalTips,
    totalEarned,

    note: params?.note ?? active.note,
    autoClosed: false,
  };

  await appendShift(shift);
  await clearActivePunch();

  return shift;
}

/* -----------------------------
   ✅ AUTO CLOSE after 14 hours
   Call this on app start + when Home is focused
------------------------------ */

export async function autoCloseIfNeeded() {
  const active = await getActivePunch();
  if (!active) return { didClose: false as const };

  const startMs = new Date(active.startedAtISO).getTime();
  const nowMs = Date.now();

  // Not expired
  if (nowMs - startMs < MAX_SHIFT_MS) {
    return { didClose: false as const };
  }

  // ✅ auto end time = start + 14 hours
  const endISO = new Date(startMs + MAX_SHIFT_MS).toISOString();
  const startISO = active.startedAtISO;

  const rawMins = diffMinutes(startISO, endISO);
  const netMins = applyUnpaidBreak(rawMins, active.unpaidBreak, active.breakMinutes);

  const workedHours = Number((netMins / 60).toFixed(2));
  const hourlyPay = calcHourlyPay(netMins, active.hourlyWage);

  const cashTips = 0;
  const creditTips = 0;
  const totalTips = 0;
  const totalEarned = Number((hourlyPay + totalTips).toFixed(2));

  const isoDate = toISODateLocal(new Date(startISO));

  const shift: Shift = {
    id: makeId("shift"),
    isoDate,
    startISO,
    endISO,

    workplaceId: active.workplaceId,
    workplaceName: active.workplaceName,
    roleId: active.roleId,
    roleName: active.roleName,

    workedMinutes: netMins,
    workedHours,

    cashTips,
    creditTips,

    hourlyPay,
    totalTips,
    totalEarned,

    // ✅ mark clearly
    note: active.note
      ? `${active.note}\n⏱ Auto-closed after ${MAX_SHIFT_HOURS} hours (forgot punch out)`
      : `⏱ Auto-closed after ${MAX_SHIFT_HOURS} hours (forgot punch out)`,
    autoClosed: true,
  };

  await appendShift(shift);
  await clearActivePunch();

  return { didClose: true as const, shift };
}
