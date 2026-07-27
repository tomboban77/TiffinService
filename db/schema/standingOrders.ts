import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  unique,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { deliveryMethodEnum, cadenceEnum, adjustmentKindEnum, adjustmentSourceEnum } from "./enums";
import { operators, operatorSlots, priceListItems } from "./operators";
import { customers } from "./customers";
import { messages } from "./prospectsMessages";

export const standingOrders = pgTable("standing_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull(),
  slotId: uuid("slot_id").notNull(),

  dayPattern: integer("day_pattern").array().notNull(), // weekdays 0-6; batch = single drop weekday
  cadence: cadenceEnum("cadence").notNull().default("per_day"),
  periodDays: integer("period_days"), // required when cadence = batch

  deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),
  active: boolean("active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  customerFk: foreignKey({
    columns: [t.customerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "standing_orders_customer_operator_fk",
  }),
  slotFk: foreignKey({
    columns: [t.slotId, t.operatorId],
    foreignColumns: [operatorSlots.id, operatorSlots.operatorId],
    name: "standing_orders_slot_operator_fk",
  }),
  // Daily count computation filters active standing orders per operator — hit
  // on every Today screen load.
  operatorActiveIdx: index("standing_orders_operator_active_idx").on(t.operatorId, t.active),
  customerIdx: index("standing_orders_customer_idx").on(t.customerId),
  // Referenced by composite FK from standing_order_items, adjustments.standing_order_id.
  uniqSelf: unique("standing_orders_id_operator_uniq").on(t.id, t.operatorId),
}));

export const standingOrderItems = pgTable("standing_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  standingOrderId: uuid("standing_order_id").notNull(),
  priceListItemId: uuid("price_list_item_id").notNull(),
  quantity: integer("quantity").notNull(),
}, (t) => ({
  uniqOrderItem: unique("standing_order_items_uniq").on(t.standingOrderId, t.priceListItemId),
  standingOrderFk: foreignKey({
    columns: [t.standingOrderId, t.operatorId],
    foreignColumns: [standingOrders.id, standingOrders.operatorId],
    name: "standing_order_items_order_operator_fk",
  }),
  priceListItemFk: foreignKey({
    columns: [t.priceListItemId, t.operatorId],
    foreignColumns: [priceListItems.id, priceListItems.operatorId],
    name: "standing_order_items_price_item_operator_fk",
  }),
}));

// Dated deltas on top of a standing order: skip a day, add extras, override a
// quantity for one date, or a customer-wide pause/resume/address/notes change.
// Conflicting instructions about the same date/subject resolve last-write-wins:
// the new adjustment sets supersedes_adjustment_id and the old one gets
// canceled_at, so the full history stays auditable instead of being deleted.
export const adjustments = pgTable("adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull(),
  standingOrderId: uuid("standing_order_id"), // null = applies across all of the customer's orders

  effectiveDate: date("effective_date").notNull(),
  kind: adjustmentKindEnum("kind").notNull(),
  priceListItemId: uuid("price_list_item_id"), // for extra / set_quantity
  quantity: integer("quantity"), // extra = delta added; set_quantity = new absolute qty

  // A meal-type swap is two rows (set_quantity 0 on the old item, extra on the
  // new one) written in a single transaction, sharing this id, so "cancel the
  // swap" and last-write-wins supersession treat the pair as one atomic unit —
  // never zero the old meal without the new one landing.
  adjustmentGroupId: uuid("adjustment_group_id"),

  note: text("note"),
  source: adjustmentSourceEnum("source").notNull(),
  createdByMessageId: uuid("created_by_message_id"),

  supersedesAdjustmentId: uuid("supersedes_adjustment_id"),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  customerFk: foreignKey({
    columns: [t.customerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "adjustments_customer_operator_fk",
  }),
  standingOrderFk: foreignKey({
    columns: [t.standingOrderId, t.operatorId],
    foreignColumns: [standingOrders.id, standingOrders.operatorId],
    name: "adjustments_standing_order_operator_fk",
  }),
  priceListItemFk: foreignKey({
    columns: [t.priceListItemId, t.operatorId],
    foreignColumns: [priceListItems.id, priceListItems.operatorId],
    name: "adjustments_price_item_operator_fk",
  }),
  messageFk: foreignKey({
    columns: [t.createdByMessageId, t.operatorId],
    foreignColumns: [messages.id, messages.operatorId],
    name: "adjustments_message_operator_fk",
  }),
  supersedesFk: foreignKey({
    columns: [t.supersedesAdjustmentId, t.operatorId],
    foreignColumns: [t.id, t.operatorId],
    name: "adjustments_supersedes_self_fk",
  }),
  // Count computation looks up adjustments by (operator, date) for every
  // Today screen load, and by customer for the customer detail history.
  operatorDateIdx: index("adjustments_operator_date_idx").on(t.operatorId, t.effectiveDate),
  customerIdx: index("adjustments_customer_idx").on(t.customerId),
  groupIdx: index("adjustments_group_idx").on(t.adjustmentGroupId),
  // Required as the target of the self-referencing supersedes_adjustment_id
  // composite FK above (Postgres needs a unique constraint on exactly the
  // referenced column set, not just a PK on id).
  uniqSelf: unique("adjustments_id_operator_uniq").on(t.id, t.operatorId),
}));
