import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
  unique,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { broadcastRecipientStatusEnum, disputeStatusEnum } from "./enums";
import { operators, priceListItems } from "./operators";
import { customers } from "./customers";
import { deliveryLedger } from "./delivery";
import { messages } from "./prospectsMessages";

export const menus = pgTable("menus", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  status: text("status").notNull().default("draft"), // 'draft' | 'sent'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Referenced by composite FK from menu_day_items, broadcasts.menu_id.
  uniqSelf: unique("menus_id_operator_uniq").on(t.id, t.operatorId),
}));

export const menuDayItems = pgTable("menu_day_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  menuId: uuid("menu_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6
  priceListItemId: uuid("price_list_item_id").notNull(),
}, (t) => ({
  menuFk: foreignKey({
    columns: [t.menuId, t.operatorId],
    foreignColumns: [menus.id, menus.operatorId],
    name: "menu_day_items_menu_operator_fk",
  }),
  priceListItemFk: foreignKey({
    columns: [t.priceListItemId, t.operatorId],
    foreignColumns: [priceListItems.id, priceListItems.operatorId],
    name: "menu_day_items_price_item_operator_fk",
  }),
}));

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  menuId: uuid("menu_id"), // null for ad-hoc broadcasts
  messageTemplate: text("message_template").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  menuFk: foreignKey({
    columns: [t.menuId, t.operatorId],
    foreignColumns: [menus.id, menus.operatorId],
    name: "broadcasts_menu_operator_fk",
  }),
  // Referenced by composite FK from broadcast_recipients, closures.broadcast_id.
  uniqSelf: unique("broadcasts_id_operator_uniq").on(t.id, t.operatorId),
}));

export const broadcastRecipients = pgTable("broadcast_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  broadcastId: uuid("broadcast_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  whatsappMessageId: text("whatsapp_message_id"),
  status: broadcastRecipientStatusEnum("status").notNull().default("queued"),
  failReason: text("fail_reason"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqRecipient: uniqueIndex("broadcast_recipients_uniq").on(t.broadcastId, t.customerId),
  broadcastFk: foreignKey({
    columns: [t.broadcastId, t.operatorId],
    foreignColumns: [broadcasts.id, broadcasts.operatorId],
    name: "broadcast_recipients_broadcast_operator_fk",
  }),
  customerFk: foreignKey({
    columns: [t.customerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "broadcast_recipients_customer_operator_fk",
  }),
}));

export const closures = pgTable("closures", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  reason: text("reason"),
  broadcastId: uuid("broadcast_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqOperatorDate: uniqueIndex("closures_operator_date_uniq").on(t.operatorId, t.date),
  broadcastFk: foreignKey({
    columns: [t.broadcastId, t.operatorId],
    foreignColumns: [broadcasts.id, broadcasts.operatorId],
    name: "closures_broadcast_operator_fk",
  }),
}));

// A dispute's status mirrors the owner's one-tap resolution; the outcome is
// also written back onto the triggering message's resolution_type/note (see
// prospectsMessages.ts) so the customer's interaction history shows both the
// complaint and how it was closed in one place.
export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull(),
  deliveryLedgerId: uuid("delivery_ledger_id"),
  messageId: uuid("message_id"),
  status: disputeStatusEnum("status").notNull().default("open"),
  // Set when status = 'credited'. This is what makes the credit concretely
  // computable: it nets against sumBillableCents() in the billing cycle
  // covering resolved_at, so a credit granted after a prior cycle already
  // froze lands in the *next* cycle's new_charges_cents, never mutates the
  // frozen one. See lib/billing/settlement.ts.
  creditCents: integer("credit_cents"),
  resolutionNote: text("resolution_note"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  customerFk: foreignKey({
    columns: [t.customerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "disputes_customer_operator_fk",
  }),
  deliveryLedgerFk: foreignKey({
    columns: [t.deliveryLedgerId, t.operatorId],
    foreignColumns: [deliveryLedger.id, deliveryLedger.operatorId],
    name: "disputes_ledger_operator_fk",
  }),
  messageFk: foreignKey({
    columns: [t.messageId, t.operatorId],
    foreignColumns: [messages.id, messages.operatorId],
    name: "disputes_message_operator_fk",
  }),
}));

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
