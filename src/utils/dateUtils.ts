// src/utils/dateUtils.ts

/**
 * Convert a Date to a local ISO date string: YYYY-MM-DD
 * (Uses local timezone, not UTC)
 */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse YYYY-MM-DD into a Date (local time, midnight) */
export function fromISODate(iso: string): Date {
  // expected: "YYYY-MM-DD"
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !d) throw new Error(`Invalid ISO date: ${iso}`);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Returns true if two dates fall on same local calendar day */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
