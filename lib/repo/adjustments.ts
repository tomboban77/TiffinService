import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../../db/types";
import { adjustments } from "../../db/schema";
import type { AdjustmentFixture, AdjustmentKind } from "../billing/counts";

export async function listAdjustmentsForDate(db: Db, operatorId: string, date: string): Promise<AdjustmentFixture[]> {
  const rows = await db
    .select()
    .from(adjustments)
    .where(and(eq(adjustments.operatorId, operatorId), eq(adjustments.effectiveDate, date)));

  return rows.map((r) => ({
    customerId: r.customerId,
    standingOrderId: r.standingOrderId,
    effectiveDate: r.effectiveDate,
    kind: r.kind as AdjustmentKind,
    priceListItemId: r.priceListItemId,
    quantity: r.quantity,
    canceledAt: r.canceledAt?.toISOString() ?? null,
  }));
}

export interface CreateAdjustmentInput {
  customerId: string;
  standingOrderId?: string | null;
  effectiveDate: string;
  kind: AdjustmentKind;
  priceListItemId?: string | null;
  quantity?: number | null;
  note?: string | null;
  source: "bot" | "operator";
  createdByMessageId?: string | null;
  adjustmentGroupId?: string | null;
}

/**
 * Creates an adjustment, first superseding (canceling) any live adjustment
 * for the same customer/standing-order/date — last-write-wins, per the
 * conflicting-instructions rule: the prior adjustment is marked canceled
 * rather than deleted, so the full history stays auditable.
 */
export async function createAdjustment(db: Db, operatorId: string, input: CreateAdjustmentInput) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(adjustments)
      .where(
        and(
          eq(adjustments.operatorId, operatorId),
          eq(adjustments.customerId, input.customerId),
          eq(adjustments.effectiveDate, input.effectiveDate),
          isNull(adjustments.canceledAt),
        ),
      );

    const superseded = existing.filter(
      (a) => input.standingOrderId == null || a.standingOrderId == null || a.standingOrderId === input.standingOrderId,
    );

    const rows = await tx
      .insert(adjustments)
      .values({
        operatorId,
        customerId: input.customerId,
        standingOrderId: input.standingOrderId ?? null,
        effectiveDate: input.effectiveDate,
        kind: input.kind,
        priceListItemId: input.priceListItemId ?? null,
        quantity: input.quantity ?? null,
        note: input.note ?? null,
        source: input.source,
        createdByMessageId: input.createdByMessageId ?? null,
        adjustmentGroupId: input.adjustmentGroupId ?? null,
        supersedesAdjustmentId: superseded[0]?.id ?? null,
      })
      .returning();
    const created = rows[0]!;

    for (const old of superseded) {
      await tx.update(adjustments).set({ canceledAt: new Date() }).where(eq(adjustments.id, old.id));
    }

    return created;
  });
}

export interface CreateAdjustmentBatchInput {
  customerId: string;
  standingOrderId?: string | null;
  effectiveDate: string;
  /** One row per meal type; quantity 0 means "skip this meal type entirely" for the date. */
  items: { priceListItemId: string; quantity: number }[];
  note?: string | null;
  source: "bot" | "operator";
  createdByMessageId?: string | null;
}

/**
 * Like createAdjustment, but writes several set_quantity rows for the same
 * date as one atomic instruction sharing an adjustment_group_id. Calling
 * createAdjustment once per meal type would be wrong here: its supersession
 * query only keys on (customer, date[, standing order]), not priceListItemId,
 * so a second call for a different meal type on the same date would cancel
 * the first meal type's row as if it conflicted with it, rather than
 * coexisting alongside it.
 */
export async function createAdjustmentBatch(db: Db, operatorId: string, input: CreateAdjustmentBatchInput) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(adjustments)
      .where(
        and(
          eq(adjustments.operatorId, operatorId),
          eq(adjustments.customerId, input.customerId),
          eq(adjustments.effectiveDate, input.effectiveDate),
          isNull(adjustments.canceledAt),
        ),
      );

    const superseded = existing.filter(
      (a) => input.standingOrderId == null || a.standingOrderId == null || a.standingOrderId === input.standingOrderId,
    );

    const groupId = randomUUID();
    const created = [];
    for (const item of input.items) {
      const matchingPredecessor = superseded.find((a) => a.priceListItemId === item.priceListItemId);
      const rows = await tx
        .insert(adjustments)
        .values({
          operatorId,
          customerId: input.customerId,
          standingOrderId: input.standingOrderId ?? null,
          effectiveDate: input.effectiveDate,
          kind: "set_quantity",
          priceListItemId: item.priceListItemId,
          quantity: item.quantity,
          note: input.note ?? null,
          source: input.source,
          createdByMessageId: input.createdByMessageId ?? null,
          adjustmentGroupId: groupId,
          supersedesAdjustmentId: matchingPredecessor?.id ?? null,
        })
        .returning();
      created.push(rows[0]!);
    }

    for (const old of superseded) {
      await tx.update(adjustments).set({ canceledAt: new Date() }).where(eq(adjustments.id, old.id));
    }

    return created;
  });
}

export async function listAdjustmentHistoryForCustomer(db: Db, operatorId: string, customerId: string) {
  return db
    .select()
    .from(adjustments)
    .where(and(eq(adjustments.operatorId, operatorId), eq(adjustments.customerId, customerId)))
    .orderBy(adjustments.effectiveDate);
}
