import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  time,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { subscriptionStatusEnum } from "./enums";

// Root of tenancy. Every other table is scoped to an operator, either
// directly (operator_id column) or transitively through a composite FK that
// pins a child's operator_id to match its parent's — see customers.ts and
// onward for the (id, operator_id) unique constraints that make that
// enforceable by Postgres rather than by application discipline.
export const operators = pgTable("operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").notNull(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  timezone: text("timezone").notNull(),
  botLanguage: text("bot_language").notNull().default("en"),

  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  whatsappConnectedAt: timestamp("whatsapp_connected_at", { withTimezone: true }),

  billingFrequency: text("billing_frequency"),
  billingDayOfWeek: integer("billing_day_of_week"),
  billingDayOfMonth: integer("billing_day_of_month"),
  gracePeriodDays: integer("grace_period_days").notNull().default(1),

  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trialing"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqAuthUser: uniqueIndex("operators_auth_user_uniq").on(t.authUserId),
}));

export const operatorSlots = pgTable("operator_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  cutoffTime: time("cutoff_time").notNull().default("20:00:00"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
}, (t) => ({
  // Case-insensitive: "dinner" and "Dinner" are the same slot key to a double-click or a
  // typo'd re-add, and a milestone-3 WhatsApp parser needs one unambiguous match target.
  uniqOperatorKey: uniqueIndex("operator_slots_operator_key_uniq").on(t.operatorId, sql`lower(${t.key})`),
  // Referenced by composite FK from standing_orders, delivery_ledger, route_stops, count_locks.
  uniqSelf: unique("operator_slots_id_operator_uniq").on(t.id, t.operatorId),
}));

export const priceListItems = pgTable("price_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Case-insensitive per operator: two "Protein" meal types would corrupt count grouping
  // and give the milestone-3 WhatsApp parser an ambiguous match target.
  uniqOperatorName: uniqueIndex("price_list_items_operator_name_uniq").on(t.operatorId, sql`lower(${t.name})`),
  // Referenced by composite FK from standing_order_items, adjustments, delivery_ledger, menu_day_items.
  uniqSelf: unique("price_list_items_id_operator_uniq").on(t.id, t.operatorId),
}));

export const prepaidPlans = pgTable("prepaid_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pointsPerRenewal: integer("points_per_renewal").notNull(),
  priceCents: integer("price_cents").notNull(),
  rolloverEnabled: boolean("rollover_enabled").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Case-insensitive per operator, same reasoning as price_list_items above.
  uniqOperatorName: uniqueIndex("prepaid_plans_operator_name_uniq").on(t.operatorId, sql`lower(${t.name})`),
  // Referenced by composite FK from customers.
  uniqSelf: unique("prepaid_plans_id_operator_uniq").on(t.id, t.operatorId),
}));
