import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { operatorSlots } from "../../db/schema";

export async function listSlots(db: Db, operatorId: string) {
  return db.select().from(operatorSlots).where(eq(operatorSlots.operatorId, operatorId)).orderBy(operatorSlots.sortOrder);
}

export interface UpsertSlotInput {
  id?: string;
  key: string;
  label: string;
  cutoffTime: string; // "HH:MM:SS"
  sortOrder?: number;
  active?: boolean;
}

export async function upsertSlot(db: Db, operatorId: string, input: UpsertSlotInput) {
  if (input.id) {
    const rows = await db
      .update(operatorSlots)
      .set({ key: input.key, label: input.label, cutoffTime: input.cutoffTime, sortOrder: input.sortOrder, active: input.active })
      .where(and(eq(operatorSlots.id, input.id), eq(operatorSlots.operatorId, operatorId)))
      .returning();
    return rows[0]!;
  }
  const rows = await db
    .insert(operatorSlots)
    .values({ operatorId, key: input.key, label: input.label, cutoffTime: input.cutoffTime, sortOrder: input.sortOrder ?? 0 })
    .returning();
  return rows[0]!;
}

export async function setSlotActive(db: Db, operatorId: string, slotId: string, active: boolean) {
  await db
    .update(operatorSlots)
    .set({ active })
    .where(and(eq(operatorSlots.id, slotId), eq(operatorSlots.operatorId, operatorId)));
}
