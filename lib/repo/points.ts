import { eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { customers, pointTransactions } from "../../db/schema";
import { applyManualAdjustment } from "../billing/points";

/**
 * The manual +/- escape hatch. Writes the immutable point_transactions row
 * and updates the cached customers.points_balance in the same transaction,
 * guarded by idempotencyKey so a double-submitted form can't double-apply.
 */
export async function manualPointsAdjustment(
  db: Db,
  operatorId: string,
  customerId: string,
  delta: number,
  note: string,
  idempotencyKey: string,
) {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(customers).where(eq(customers.id, customerId));
    const customer = rows[0];
    if (!customer) throw new Error("customer not found");

    const newBalance = applyManualAdjustment(customer.pointsBalance, delta);

    await tx.insert(pointTransactions).values({
      operatorId,
      customerId,
      type: "manual_adjust",
      points: delta,
      note,
      idempotencyKey,
    });
    await tx.update(customers).set({ pointsBalance: newBalance, updatedAt: new Date() }).where(eq(customers.id, customerId));

    return newBalance;
  });
}
