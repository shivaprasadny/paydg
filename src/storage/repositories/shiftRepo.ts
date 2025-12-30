import { getAll, getFirst, run } from "../database";
import type { Shift } from "../../models/Shift";

function map(row: any): Shift {
  return {
    id: row.id,
    workplaceId: row.workplace_id,
    shiftDate: row.shift_date,
    startTs: row.start_ts,
    endTs: row.end_ts,
    role: row.role,
    hourlyWage: row.hourly_wage,
    lunchDeducted: !!row.lunch_deducted,
    cashTips: row.cash_tips,
    creditTips: row.credit_tips,
    notes: row.notes ?? null,

    workedMinutes: row.worked_minutes,
    hourlyPay: row.hourly_pay,
    totalTips: row.total_tips,
    totalEarned: row.total_earned,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createShift(input: Shift) {
  run(
    `INSERT INTO shifts (
      id, workplace_id, shift_date, start_ts, end_ts, role, hourly_wage, lunch_deducted,
      cash_tips, credit_tips, notes, worked_minutes, hourly_pay, total_tips, total_earned,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.workplaceId,
      input.shiftDate,
      input.startTs,
      input.endTs,
      input.role,
      input.hourlyWage,
      input.lunchDeducted ? 1 : 0,
      input.cashTips,
      input.creditTips,
      input.notes ?? null,
      input.workedMinutes,
      input.hourlyPay,
      input.totalTips,
      input.totalEarned,
      input.createdAt,
      input.updatedAt,
    ]
  );
}

export function listShifts(): Shift[] {
  return getAll<any>(
    "SELECT * FROM shifts ORDER BY start_ts DESC"
  ).map(map);
}


export function getShift(id: string): Shift | null {
  const row = getFirst<any>("SELECT * FROM shifts WHERE id = ?", [id]);
  return row ? map(row) : null;
}

export function deleteShift(id: string) {
  run("DELETE FROM shifts WHERE id = ?", [id]);
}
export function updateShift(input: Shift) {
  run(
    `UPDATE shifts SET
      workplace_id = ?,
      shift_date = ?,
      start_ts = ?,
      end_ts = ?,
      role = ?,
      hourly_wage = ?,
      lunch_deducted = ?,
      cash_tips = ?,
      credit_tips = ?,
      notes = ?,
      worked_minutes = ?,
      hourly_pay = ?,
      total_tips = ?,
      total_earned = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      input.workplaceId,
      input.shiftDate,
      input.startTs,
      input.endTs,
      input.role,
      input.hourlyWage,
      input.lunchDeducted ? 1 : 0,
      input.cashTips,
      input.creditTips,
      input.notes ?? null,
      input.workedMinutes,
      input.hourlyPay,
      input.totalTips,
      input.totalEarned,
      input.updatedAt,
      input.id,
    ]
  );
}
