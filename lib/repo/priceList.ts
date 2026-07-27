import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { priceListItems } from "../../db/schema";

export async function listPriceListItems(db: Db, operatorId: string) {
  return db
    .select()
    .from(priceListItems)
    .where(eq(priceListItems.operatorId, operatorId))
    .orderBy(priceListItems.sortOrder);
}

export interface UpsertPriceListItemInput {
  id?: string;
  name: string;
  priceCents: number;
  sortOrder?: number;
}

export async function upsertPriceListItem(db: Db, operatorId: string, input: UpsertPriceListItemInput) {
  if (input.id) {
    const rows = await db
      .update(priceListItems)
      .set({ name: input.name, priceCents: input.priceCents, sortOrder: input.sortOrder })
      .where(and(eq(priceListItems.id, input.id), eq(priceListItems.operatorId, operatorId)))
      .returning();
    return rows[0]!;
  }
  const rows = await db
    .insert(priceListItems)
    .values({ operatorId, name: input.name, priceCents: input.priceCents, sortOrder: input.sortOrder ?? 0 })
    .returning();
  return rows[0]!;
}

export async function setPriceListItemActive(db: Db, operatorId: string, itemId: string, active: boolean) {
  await db
    .update(priceListItems)
    .set({ active })
    .where(and(eq(priceListItems.id, itemId), eq(priceListItems.operatorId, operatorId)));
}
