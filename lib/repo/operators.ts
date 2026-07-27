import { eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { operators } from "../../db/schema";

export async function getOperatorByAuthUserId(db: Db, authUserId: string) {
  const rows = await db.select().from(operators).where(eq(operators.authUserId, authUserId)).limit(1);
  return rows[0] ?? null;
}

export async function getOperatorById(db: Db, operatorId: string) {
  const rows = await db.select().from(operators).where(eq(operators.id, operatorId)).limit(1);
  return rows[0] ?? null;
}

export interface CreateOperatorInput {
  authUserId: string;
  businessName: string;
  ownerName: string;
  email: string;
  timezone: string;
}

/** Bootstraps the operator row for a freshly-signed-up auth user. One per auth user. */
export async function createOperator(db: Db, input: CreateOperatorInput) {
  const rows = await db.insert(operators).values(input).returning();
  return rows[0]!;
}

export interface OperatorSettingsPatch {
  businessName?: string;
  ownerName?: string;
  timezone?: string;
  botLanguage?: string;
  billingFrequency?: string | null;
  billingDayOfWeek?: number | null;
  billingDayOfMonth?: number | null;
  gracePeriodDays?: number;
}

export async function updateOperatorSettings(db: Db, operatorId: string, patch: OperatorSettingsPatch) {
  const rows = await db
    .update(operators)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(operators.id, operatorId))
    .returning();
  return rows[0]!;
}
