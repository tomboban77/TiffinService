import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  numeric,
  unique,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  prospectStatusEnum,
  messageDirectionEnum,
  messageTypeEnum,
  messageStatusEnum,
  flagResolutionTypeEnum,
} from "./enums";
import { operators } from "./operators";
import { customers } from "./customers";

export const prospects = pgTable("prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  phoneE164: text("phone_e164").notNull(),
  name: text("name"),
  status: prospectStatusEnum("status").notNull().default("new"),
  convertedCustomerId: uuid("converted_customer_id"),
  firstContactAt: timestamp("first_contact_at", { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqOperatorPhone: uniqueIndex("prospects_operator_phone_uniq").on(t.operatorId, t.phoneE164),
  convertedCustomerFk: foreignKey({
    columns: [t.convertedCustomerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "prospects_converted_customer_operator_fk",
  }),
  // Referenced by composite FK from messages.prospect_id.
  uniqSelf: unique("prospects_id_operator_uniq").on(t.id, t.operatorId),
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id"),
  prospectId: uuid("prospect_id"),

  whatsappMessageId: text("whatsapp_message_id"),
  direction: messageDirectionEnum("direction").notNull(),
  type: messageTypeEnum("type").notNull(),

  rawPayload: jsonb("raw_payload"),
  text: text("text"),
  transcript: text("transcript"),
  languageDetected: text("language_detected"),
  intent: text("intent"),
  confidence: numeric("confidence"),

  status: messageStatusEnum("status").notNull().default("received"),
  failReason: text("fail_reason"),

  // "Needs you" flag. Resolution fields let the dispute view's three one-tap
  // outcomes (credit / resend / resolved-otherwise) — plus a plain "dismissed"
  // for non-dispute flags — record what happened, so the customer's
  // interaction history can show it and repeat patterns are visible.
  needsAttention: boolean("needs_attention").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionType: flagResolutionTypeEnum("resolution_type"),
  resolutionNote: text("resolution_note"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Dedupes inbound webhook retries. Partial (WHERE NOT NULL) so multiple
  // outbound rows without a Meta id yet don't collide.
  uniqWaMessageId: uniqueIndex("messages_wa_id_uniq")
    .on(t.whatsappMessageId)
    .where(sql`${t.whatsappMessageId} is not null`),
  customerFk: foreignKey({
    columns: [t.customerId, t.operatorId],
    foreignColumns: [customers.id, customers.operatorId],
    name: "messages_customer_operator_fk",
  }),
  prospectFk: foreignKey({
    columns: [t.prospectId, t.operatorId],
    foreignColumns: [prospects.id, prospects.operatorId],
    name: "messages_prospect_operator_fk",
  }),
  // Fast lookup for the Today screen's "needs you" badge: distinct
  // customers/prospects with an unresolved flagged message.
  needsAttentionIdx: index("messages_needs_attention_idx")
    .on(t.operatorId, t.customerId)
    .where(sql`${t.needsAttention} = true`),
  // Referenced by composite FK from adjustments.created_by_message_id, disputes.message_id.
  uniqSelf: unique("messages_id_operator_uniq").on(t.id, t.operatorId),
}));

// Meta delivers message status callbacks (sent/delivered/read/failed)
// separately from the message itself and retries them independently —
// dedupe on (whatsapp_message_id, status), not on the message id alone.
export const messageStatusEvents = pgTable("message_status_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  whatsappMessageId: text("whatsapp_message_id").notNull(),
  status: messageStatusEnum("status").notNull(),
  rawPayload: jsonb("raw_payload"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqEvent: uniqueIndex("message_status_events_uniq").on(t.whatsappMessageId, t.status),
}));
