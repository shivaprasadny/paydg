import { getAll, getFirst, run } from "../database";
import type { Workplace } from "../../models/Workplace";

function map(row: any): Workplace {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listWorkplaces(): Workplace[] {
  return getAll<any>("SELECT * FROM workplaces ORDER BY name ASC").map(map);
}

export function getWorkplace(id: string): Workplace | null {
  const row = getFirst<any>("SELECT * FROM workplaces WHERE id = ?", [id]);
  return row ? map(row) : null;
}

export function createWorkplace(input: { id: string; name: string }) {
  const now = new Date().toISOString();
  run(
    `INSERT INTO workplaces (id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [input.id, input.name.trim(), now, now]
  );
}

export function updateWorkplace(input: { id: string; name: string }) {
  const now = new Date().toISOString();
  run(
    `UPDATE workplaces
     SET name = ?, updated_at = ?
     WHERE id = ?`,
    [input.name.trim(), now, input.id]
  );
}

export function deleteWorkplace(id: string) {
  run("DELETE FROM workplaces WHERE id = ?", [id]);
}
