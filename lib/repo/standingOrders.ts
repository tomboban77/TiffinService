import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { standingOrders, standingOrderItems } from "../../db/schema";
import type { StandingOrderFixture } from "../billing/counts";

export interface StandingOrderItemInput {
  priceListItemId: string;
  quantity: number;
}

export interface CreateStandingOrderInput {
  customerId: string;
  slotId: string;
  dayPattern: number[];
  cadence: "per_day" | "batch";
  periodDays?: number | null;
  deliveryMethod: "delivery" | "pickup";
  items: StandingOrderItemInput[];
}

export async function createStandingOrder(db: Db, operatorId: string, input: CreateStandingOrderInput) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(standingOrders)
      .values({
        operatorId,
        customerId: input.customerId,
        slotId: input.slotId,
        dayPattern: input.dayPattern,
        cadence: input.cadence,
        periodDays: input.periodDays ?? null,
        deliveryMethod: input.deliveryMethod,
      })
      .returning();
    const order = rows[0]!;

    if (input.items.length > 0) {
      await tx.insert(standingOrderItems).values(
        input.items.map((item) => ({
          operatorId,
          standingOrderId: order.id,
          priceListItemId: item.priceListItemId,
          quantity: item.quantity,
        })),
      );
    }
    return order;
  });
}

export interface UpdateStandingOrderInput {
  dayPattern?: number[];
  cadence?: "per_day" | "batch";
  periodDays?: number | null;
  deliveryMethod?: "delivery" | "pickup";
  active?: boolean;
  items?: StandingOrderItemInput[];
}

export async function updateStandingOrder(db: Db, operatorId: string, orderId: string, patch: UpdateStandingOrderInput) {
  return db.transaction(async (tx) => {
    const { items, ...fields } = patch;
    if (Object.keys(fields).length > 0) {
      await tx
        .update(standingOrders)
        .set({ ...fields, updatedAt: new Date() })
        .where(and(eq(standingOrders.id, orderId), eq(standingOrders.operatorId, operatorId)));
    }
    if (items) {
      await tx.delete(standingOrderItems).where(eq(standingOrderItems.standingOrderId, orderId));
      if (items.length > 0) {
        await tx.insert(standingOrderItems).values(
          items.map((item) => ({
            operatorId,
            standingOrderId: orderId,
            priceListItemId: item.priceListItemId,
            quantity: item.quantity,
          })),
        );
      }
    }
  });
}

export async function listStandingOrdersForCustomer(db: Db, operatorId: string, customerId: string) {
  const orders = await db
    .select()
    .from(standingOrders)
    .where(and(eq(standingOrders.customerId, customerId), eq(standingOrders.operatorId, operatorId)));

  const items = await db.select().from(standingOrderItems).where(eq(standingOrderItems.operatorId, operatorId));
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    if (!itemsByOrder.has(item.standingOrderId)) itemsByOrder.set(item.standingOrderId, []);
    itemsByOrder.get(item.standingOrderId)!.push(item);
  }

  return orders.map((order) => ({ ...order, items: itemsByOrder.get(order.id) ?? [] }));
}

/** Every active standing order for the operator, shaped for lib/billing/counts.ts. */
export async function listActiveStandingOrderFixtures(db: Db, operatorId: string): Promise<StandingOrderFixture[]> {
  const orders = await db
    .select()
    .from(standingOrders)
    .where(and(eq(standingOrders.operatorId, operatorId), eq(standingOrders.active, true)));

  const items = await db.select().from(standingOrderItems).where(eq(standingOrderItems.operatorId, operatorId));
  const itemsByOrder = new Map<string, StandingOrderFixture["items"]>();
  for (const item of items) {
    if (!itemsByOrder.has(item.standingOrderId)) itemsByOrder.set(item.standingOrderId, []);
    itemsByOrder.get(item.standingOrderId)!.push({ priceListItemId: item.priceListItemId, quantity: item.quantity });
  }

  return orders.map((order) => ({
    id: order.id,
    customerId: order.customerId,
    slotId: order.slotId,
    active: order.active,
    dayPattern: order.dayPattern,
    cadence: order.cadence,
    items: itemsByOrder.get(order.id) ?? [],
    deliveryMethod: order.deliveryMethod,
  }));
}
