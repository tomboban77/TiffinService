import { eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { prepaidPlans } from "../../db/schema";

export async function listPrepaidPlans(db: Db, operatorId: string) {
  return db.select().from(prepaidPlans).where(eq(prepaidPlans.operatorId, operatorId));
}

export interface CreatePrepaidPlanInput {
  name: string;
  pointsPerRenewal: number;
  priceCents: number;
  rolloverEnabled: boolean;
}

export async function createPrepaidPlan(db: Db, operatorId: string, input: CreatePrepaidPlanInput) {
  const rows = await db.insert(prepaidPlans).values({ operatorId, ...input }).returning();
  return rows[0]!;
}
