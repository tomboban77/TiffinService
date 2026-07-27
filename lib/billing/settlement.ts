import { isBillableDeliveryStatus, type DeliveryStatus } from "./billableStatuses";

export interface DeliveryLedgerLineFixture {
  quantity: number;
  unitPriceCents: number;
  status: DeliveryStatus;
}

export function sumBillableCents(lines: DeliveryLedgerLineFixture[]): number {
  return lines
    .filter((l) => isBillableDeliveryStatus(l.status))
    .reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
}

export interface DisputeCreditFixture {
  creditCents: number;
}

export interface GenerateBillingCycleItemInput {
  /** Carried from the prior cycle's carryForwardBalance — shortfall (or credit, negative) forward. */
  previousBalanceCents: number;
  /** This period's delivery_ledger lines for the customer. */
  ledgerLines: DeliveryLedgerLineFixture[];
  /**
   * Dispute credits resolved within this period. A credit granted after a
   * prior cycle already froze belongs here, in the cycle covering its
   * resolution date — never applied retroactively to the frozen cycle.
   */
  resolvedCredits?: DisputeCreditFixture[];
}

export interface BillingCycleItemResult {
  previousBalanceCents: number;
  newChargesCents: number;
  totalDueCents: number;
}

/**
 * Computes one billing_cycle_items row. Once generated, this result is
 * frozen (see 0002_billing_cycle_immutability.sql) — later events always
 * flow into the next call of this function for the following cycle.
 */
export function generateBillingCycleItem(input: GenerateBillingCycleItemInput): BillingCycleItemResult {
  const gross = sumBillableCents(input.ledgerLines);
  const credits = (input.resolvedCredits ?? []).reduce((sum, c) => sum + c.creditCents, 0);
  const newChargesCents = gross - credits;
  return {
    previousBalanceCents: input.previousBalanceCents,
    newChargesCents,
    totalDueCents: input.previousBalanceCents + newChargesCents,
  };
}

export type BillingCycleItemStatus = "unpaid" | "partial" | "paid";

export function statusForPayment(totalDueCents: number, amountPaidCents: number): BillingCycleItemStatus {
  if (amountPaidCents <= 0) return totalDueCents <= 0 ? "paid" : "unpaid";
  if (amountPaidCents >= totalDueCents) return "paid";
  return "partial";
}

/**
 * What the next cycle's previous_balance_cents must be: whatever this cycle
 * left unpaid (or, if negative, overpaid credit). "Mark paid" amount is
 * operator-editable and need not equal total_due_cents — this is the one
 * place that shortfall (or overpayment) is carried, never reconciled inside
 * the frozen cycle itself.
 */
export function carryForwardBalance(item: { totalDueCents: number; amountPaidCents: number }): number {
  return item.totalDueCents - item.amountPaidCents;
}
