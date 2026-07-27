import { pgEnum } from "drizzle-orm/pg-core";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "lapsed",
  "canceled",
]);

export const billingModeEnum = pgEnum("billing_mode", ["prepaid", "billed_arrears"]);

export const deliveryMethodEnum = pgEnum("delivery_method", ["delivery", "pickup"]);

export const cadenceEnum = pgEnum("cadence", ["per_day", "batch"]);

export const adjustmentKindEnum = pgEnum("adjustment_kind", [
  "skip",
  "pause",
  "resume",
  "extra",
  "set_quantity",
  "address_change",
  "food_notes_change",
  "other",
]);

export const adjustmentSourceEnum = pgEnum("adjustment_source", ["bot", "operator"]);

// Every delivery attempt is logged. Whether a status counts toward billing/points
// is decided in exactly one place — see lib/billing/billableStatuses.ts — never
// re-derived ad hoc in a query.
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "delivered",
  "failed_charged",
  "failed_not_charged",
]);

export const routeStopStatusEnum = pgEnum("route_stop_status", [
  "pending",
  "delivered",
  "not_delivered",
]);

export const billingCycleItemStatusEnum = pgEnum("billing_cycle_item_status", [
  "unpaid",
  "partial",
  "paid",
]);

export const settlementMethodEnum = pgEnum("settlement_method", ["e_transfer", "cash", "other"]);

export const pointTxnTypeEnum = pgEnum("point_txn_type", [
  "credit_renewal",
  "debit_delivery",
  "manual_adjust",
  "expiry",
]);

export const prospectStatusEnum = pgEnum("prospect_status", [
  "new",
  "trial_offered",
  "converted",
  "dismissed",
]);

export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "voice",
  "image",
  "template",
  "button",
  "unsupported",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "received",
  "sent",
  "delivered",
  "read",
  "failed",
]);

export const broadcastRecipientStatusEnum = pgEnum("broadcast_recipient_status", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
]);

// resolutionType mirrors the dispute view's three one-tap outcomes, plus a
// plain "dismissed" for non-dispute flags (complaints, special requests) that
// the owner handled in their own WhatsApp app with no ledger action needed.
export const flagResolutionTypeEnum = pgEnum("flag_resolution_type", [
  "credited",
  "resent",
  "resolved_other",
  "dismissed",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "credited",
  "resent",
  "resolved_other",
]);
