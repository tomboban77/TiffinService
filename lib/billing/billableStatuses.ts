export type DeliveryStatus = "delivered" | "failed_charged" | "failed_not_charged";

/**
 * The single, canonical definition of "counts toward money or points."
 * Settlement math, points burn, and reporting all import this rather than
 * re-listing statuses at each call site — see the milestone-1 guardrail
 * that a failed-not-charged delivery must still be written to the ledger
 * (for the audit trail / dispute view) but excluded from every billing sum.
 */
export const BILLABLE_DELIVERY_STATUSES: readonly DeliveryStatus[] = ["delivered", "failed_charged"];

export function isBillableDeliveryStatus(status: DeliveryStatus): boolean {
  return (BILLABLE_DELIVERY_STATUSES as readonly string[]).includes(status);
}
