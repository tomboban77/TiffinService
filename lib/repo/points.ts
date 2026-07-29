import { eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { customers, pointTransactions } from "../../db/schema";
import { applyManualAdjustment, burnPoints } from "../billing/points";

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

export interface DeliveryBurnLine {
  deliveryLedgerId: string;
  quantity: number;
}

/**
 * Burns points for billable delivery_ledger lines (called from within
 * markDelivered/markNotDelivered's own transaction — pass that transaction
 * as `db`). No-ops for non-prepaid customers or an empty line list. One
 * debit_delivery point_transactions row per line, idempotency-keyed on the
 * ledger line's own id — a double-write of the same ledger line (which
 * shouldn't happen given the route-stop status guard callers already have,
 * but the unique constraint is the real backstop) fails loudly on retry
 * rather than silently double-burning.
 */
export async function burnPointsForDelivery(db: Db, operatorId: string, customerId: string, lines: DeliveryBurnLine[]) {
  if (lines.length === 0) return;

  const rows = await db.select().from(customers).where(eq(customers.id, customerId));
  const customer = rows[0];
  if (!customer || customer.billingMode !== "prepaid") return;

  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
  const newBalance = burnPoints(customer.pointsBalance, totalQuantity);

  for (const line of lines) {
    await db.insert(pointTransactions).values({
      operatorId,
      customerId,
      type: "debit_delivery",
      points: -line.quantity,
      relatedDeliveryLedgerId: line.deliveryLedgerId,
      idempotencyKey: `debit_delivery:${line.deliveryLedgerId}`,
    });
  }

  await db.update(customers).set({ pointsBalance: newBalance, updatedAt: new Date() }).where(eq(customers.id, customerId));
}
