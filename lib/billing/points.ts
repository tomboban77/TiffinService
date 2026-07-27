import { isBillableDeliveryStatus, type DeliveryStatus } from "./billableStatuses";

export interface DeliveryLineForPoints {
  quantity: number;
  status: DeliveryStatus;
}

/** Skips burn nothing because no ledger line exists for a skipped day at all. */
export function pointsToBurn(lines: DeliveryLineForPoints[]): number {
  return lines.filter((l) => isBillableDeliveryStatus(l.status)).reduce((sum, l) => sum + l.quantity, 0);
}

export interface PrepaidPlanFixture {
  pointsPerRenewal: number;
  rolloverEnabled: boolean;
}

/** Rollover keeps the existing balance; expire-at-cycle-end plans reset unused points to zero first. */
export function applyRenewal(currentBalance: number, plan: PrepaidPlanFixture): number {
  const carried = plan.rolloverEnabled ? currentBalance : 0;
  return carried + plan.pointsPerRenewal;
}

export function burnPoints(currentBalance: number, quantity: number): number {
  return currentBalance - quantity;
}

/** The manual +/- escape hatch; a required note is enforced at the write site, not here. */
export function applyManualAdjustment(currentBalance: number, delta: number): number {
  return currentBalance + delta;
}
