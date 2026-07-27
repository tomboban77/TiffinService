import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/types";
import { customers } from "../../db/schema";

export async function listCustomers(db: Db, operatorId: string) {
  return db.select().from(customers).where(eq(customers.operatorId, operatorId)).orderBy(customers.name);
}

export async function getCustomer(db: Db, operatorId: string, customerId: string) {
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.operatorId, operatorId)))
    .limit(1);
  return rows[0] ?? null;
}

export interface CreateCustomerInput {
  name: string;
  phoneE164: string;
  address?: string | null;
  foodNotes?: string | null;
  billingMode: "prepaid" | "billed_arrears";
  prepaidPlanId?: string | null;
  pointsBalance?: number;
}

export async function createCustomer(db: Db, operatorId: string, input: CreateCustomerInput) {
  const rows = await db
    .insert(customers)
    .values({ operatorId, pointsBalance: 0, ...input })
    .returning();
  return rows[0]!;
}

export interface UpdateCustomerInput {
  name?: string;
  phoneE164?: string;
  address?: string | null;
  foodNotes?: string | null;
  billingMode?: "prepaid" | "billed_arrears";
  prepaidPlanId?: string | null;
  active?: boolean;
  routeSortOrder?: number;
}

export async function updateCustomer(db: Db, operatorId: string, customerId: string, patch: UpdateCustomerInput) {
  const rows = await db
    .update(customers)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(customers.id, customerId), eq(customers.operatorId, operatorId)))
    .returning();
  return rows[0]!;
}
