// src/utils/timeUtils.ts

/** Minutes since midnight in local time */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Returns end Date adjusted for overnight shifts.
 * If end time is <= start time, we assume it ends next day.
 */
export function normalizeEndDate(start: Date, end: Date): Date {
  const startMin = minutesSinceMidnight(start);
  const endMin = minutesSinceMidnight(end);

  if (endMin <= startMin) {
    const nextDay = new Date(end);
    nextDay.setDate(end.getDate() + 1);
    return nextDay;
  }
  return end;
}

/** Worked minutes between two dates (end should already be normalized). */
export function diffMinutes(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/**
 * Deduct unpaid break minutes.
 * If deduct is false -> returns original minutes.
 * Default break is 30.
 */
export function applyUnpaidBreak(
  workedMinutes: number,
  deduct: boolean,
  breakMinutes = 30
): number {
  if (!deduct) return workedMinutes;
  return Math.max(0, workedMinutes - breakMinutes);
}

/** Round to 2 decimals */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcMoney(params: {
  workedMinutes: number;
  hourlyWage: number;
  cashTips: number;
  creditTips: number;
}) {
  const workedHours = params.workedMinutes / 60;

  const hourlyPay = round2(workedHours * params.hourlyWage);
  const totalTips = round2((params.cashTips || 0) + (params.creditTips || 0));
  const totalEarned = round2(hourlyPay + totalTips);

  return {
    workedHours: round2(workedHours),
    hourlyPay,
    totalTips,
    totalEarned,
  };
}
