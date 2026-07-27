import { eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { closures } from "../../db/schema";

export async function listClosureDates(db: Db, operatorId: string): Promise<string[]> {
  const rows = await db.select({ date: closures.date }).from(closures).where(eq(closures.operatorId, operatorId));
  return rows.map((r) => r.date);
}

export async function createClosure(db: Db, operatorId: string, date: string, reason?: string) {
  const rows = await db.insert(closures).values({ operatorId, date, reason: reason ?? null }).returning();
  return rows[0]!;
}
