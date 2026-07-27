import { pgTable, uuid, text, boolean, integer, timestamp, unique, uniqueIndex, foreignKey } from "drizzle-orm/pg-core";
import { billingModeEnum } from "./enums";
import { operators, prepaidPlans } from "./operators";

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phoneE164: text("phone_e164").notNull(),
  address: text("address"),
  foodNotes: text("food_notes"),

  billingMode: billingModeEnum("billing_mode").notNull(),
  prepaidPlanId: uuid("prepaid_plan_id"),
  // Cached for fast reads; the only source of truth is point_transactions
  // (see db/schema/billing.ts) — every mutation of this column must happen
  // in the same transaction as the ledger row that justifies it.
  pointsBalance: integer("points_balance").notNull().default(0),

  routeSortOrder: integer("route_sort_order").notNull().default(0),

  optedOutAt: timestamp("opted_out_at", { withTimezone: true }),

  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqOperatorPhone: uniqueIndex("customers_operator_phone_uniq").on(t.operatorId, t.phoneE164),
  // prepaid_plan_id is nullable (only set when billing_mode = prepaid); composite
  // FK with MATCH SIMPLE means a NULL plan skips the check, but a set plan must
  // belong to the same operator as the customer.
  prepaidPlanFk: foreignKey({
    columns: [t.prepaidPlanId, t.operatorId],
    foreignColumns: [prepaidPlans.id, prepaidPlans.operatorId],
    name: "customers_prepaid_plan_operator_fk",
  }),
  // Referenced by composite FK from standing_orders, adjustments, route_stops,
  // delivery_ledger, billing_cycle_items, settlements, point_transactions,
  // messages, disputes, broadcast_recipients, prospects.converted_customer_id.
  uniqSelf: unique("customers_id_operator_uniq").on(t.id, t.operatorId),
}));
