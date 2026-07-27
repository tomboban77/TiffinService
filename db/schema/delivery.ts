import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  doublePrecision,
  unique,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { deliveryStatusEnum, routeStopStatusEnum, deliveryMethodEnum } from "./enums";
import { operators, operatorSlots, priceListItems } from "./operators";
import { customers } from "./customers";

export const routeStops = pgTable("route_stops", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull(),
  slotId: uuid("slot_id").notNull(),
  date: date("date").notNull(),
  deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),
  sortOrder: integer("sort_order").notNull(),

  status: routeStopStatusEnum("status").notNull().default("pending"),
  chargeOnFail: boolean("charge_on_fail"),
  note: text("note"),

  markedBy: text("marked_by"), // driver name from the share link, or null (operator)
  markedAt: timestamp("marked_at", { withTimezone: true }),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  photoUrl: text("photo_url"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqStop: uniqueIndex("route_stops_operator_customer_slot_date_uniq").on(
    t.operatorId, t.customerId, t.slotId, t.date,
  ),
  customerFk: foreignKey({
    columns: [t.customerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "route_stops_customer_operator_fk",
  }),
  slotFk: foreignKey({
    columns: [t.slotId, t.operatorId],
    foreignColumns: [operatorSlots.id, operatorSlots.operatorId],
    name: "route_stops_slot_operator_fk",
  }),
  // Today screen's route view loads by (operator, date).
  operatorDateIdx: index("route_stops_operator_date_idx").on(t.operatorId, t.date),
  // Referenced by composite FK from delivery_ledger.route_stop_id.
  uniqSelf: unique("route_stops_id_operator_uniq").on(t.id, t.operatorId),
}));

export const routeShares = pgTable("route_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  driverName: text("driver_name").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqToken: uniqueIndex("route_shares_token_uniq").on(t.token),
  operatorDateIdx: index("route_shares_operator_date_idx").on(t.operatorId, t.date),
}));

// Every delivery attempt is recorded, billable or not — this is the audit
// trail and the dispute view's evidence, not just a billing feed. Which
// statuses count toward money/points is decided centrally in
// lib/billing/billableStatuses.ts, never re-listed per query site.
export const deliveryLedger = pgTable("delivery_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull(),
  routeStopId: uuid("route_stop_id"), // null for manual/off-route entries
  date: date("date").notNull(),
  slotId: uuid("slot_id").notNull(),
  priceListItemId: uuid("price_list_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(), // captured at delivery time
  status: deliveryStatusEnum("status").notNull(),
  note: text("note"), // required by app logic when status != 'delivered'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // A retried "mark delivered" job must never double-write the same line.
  uniqLine: uniqueIndex("delivery_ledger_stop_item_uniq").on(t.routeStopId, t.priceListItemId),
  customerFk: foreignKey({
    columns: [t.customerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "delivery_ledger_customer_operator_fk",
  }),
  routeStopFk: foreignKey({
    columns: [t.routeStopId, t.operatorId],
    foreignColumns: [routeStops.id, routeStops.operatorId],
    name: "delivery_ledger_route_stop_operator_fk",
  }),
  slotFk: foreignKey({
    columns: [t.slotId, t.operatorId],
    foreignColumns: [operatorSlots.id, operatorSlots.operatorId],
    name: "delivery_ledger_slot_operator_fk",
  }),
  priceListItemFk: foreignKey({
    columns: [t.priceListItemId, t.operatorId],
    foreignColumns: [priceListItems.id, priceListItems.operatorId],
    name: "delivery_ledger_price_item_operator_fk",
  }),
  // Settlement and count jobs sum ledger lines by (operator, date, customer).
  operatorDateIdx: index("delivery_ledger_operator_date_idx").on(t.operatorId, t.date),
  customerDateIdx: index("delivery_ledger_customer_date_idx").on(t.customerId, t.date),
  // Referenced by composite FK from point_transactions, disputes.
  uniqSelf: unique("delivery_ledger_id_operator_uniq").on(t.id, t.operatorId),
}));
