import { describe, expect, it } from "vitest";
import {
  carryForwardBalance,
  generateBillingCycleItem,
  statusForPayment,
  sumBillableCents,
  type DeliveryLedgerLineFixture,
} from "../lib/billing/settlement";

describe("sumBillableCents", () => {
  it("counts delivered and failed_charged, excludes failed_not_charged", () => {
    const lines: DeliveryLedgerLineFixture[] = [
      { quantity: 2, unitPriceCents: 1000, status: "delivered" }, // 2000
      { quantity: 1, unitPriceCents: 1200, status: "failed_charged" }, // 1200
      { quantity: 3, unitPriceCents: 1400, status: "failed_not_charged" }, // excluded
    ];
    expect(sumBillableCents(lines)).toBe(3200);
  });

  it("is zero when every line for a closure day is absent", () => {
    expect(sumBillableCents([])).toBe(0);
  });
});

describe("generateBillingCycleItem", () => {
  it("sums a first cycle with no prior balance", () => {
    const result = generateBillingCycleItem({
      previousBalanceCents: 0,
      ledgerLines: [{ quantity: 2, unitPriceCents: 1400, status: "delivered" }],
    });
    expect(result).toEqual({ previousBalanceCents: 0, newChargesCents: 2800, totalDueCents: 2800 });
  });

  it("carries a prior shortfall into the new total due", () => {
    const result = generateBillingCycleItem({
      previousBalanceCents: 1200, // unpaid from last cycle
      ledgerLines: [{ quantity: 1, unitPriceCents: 1000, status: "delivered" }],
    });
    expect(result).toEqual({ previousBalanceCents: 1200, newChargesCents: 1000, totalDueCents: 2200 });
  });

  it("a dispute credit resolved within the period nets against this cycle's new charges", () => {
    const result = generateBillingCycleItem({
      previousBalanceCents: 0,
      ledgerLines: [{ quantity: 2, unitPriceCents: 1400, status: "failed_charged" }], // 2800
      resolvedCredits: [{ creditCents: 2800 }],
    });
    expect(result.newChargesCents).toBe(0);
    expect(result.totalDueCents).toBe(0);
  });

  it("a credit resolved AFTER a cycle already froze lands in the next cycle, not the frozen one", () => {
    // Cycle 1 (Fri): Ahmed's Thursday delivery was failed_charged, no dispute yet. Cycle freezes at 2800.
    const cycle1 = generateBillingCycleItem({
      previousBalanceCents: 0,
      ledgerLines: [{ quantity: 2, unitPriceCents: 1400, status: "failed_charged" }],
    });
    expect(cycle1.totalDueCents).toBe(2800);

    // Ahmed pays the full frozen amount; nothing carries forward from cycle 1 itself.
    const cycle1CarryForward = carryForwardBalance({ totalDueCents: cycle1.totalDueCents, amountPaidCents: 2800 });
    expect(cycle1CarryForward).toBe(0);

    // Saturday: Ahmed disputes it, owner credits it. This must appear in
    // cycle 2 (next week), never mutate cycle1's frozen totalDueCents of 2800.
    const cycle2 = generateBillingCycleItem({
      previousBalanceCents: cycle1CarryForward, // 0 — cycle 1 was paid in full
      ledgerLines: [{ quantity: 2, unitPriceCents: 1000, status: "delivered" }], // this week's new veg deliveries: 2000
      resolvedCredits: [{ creditCents: 2800 }], // the credit for last week's failed_charged meal
    });
    expect(cycle1.totalDueCents).toBe(2800); // cycle 1 unchanged
    expect(cycle2.newChargesCents).toBe(2000 - 2800); // -800: credit exceeds this week's new charges
    expect(cycle2.totalDueCents).toBe(-800);
  });
});

describe("statusForPayment", () => {
  it("is unpaid when nothing has been paid and something is due", () => {
    expect(statusForPayment(2800, 0)).toBe("unpaid");
  });

  it("is partial when a partial payment (operator-edited amount) is recorded", () => {
    expect(statusForPayment(2800, 1200)).toBe("partial");
  });

  it("is paid once the paid amount meets or exceeds the total due", () => {
    expect(statusForPayment(2800, 2800)).toBe("paid");
    expect(statusForPayment(2800, 3000)).toBe("paid"); // overpayment still counts as paid
  });

  it("a zero-or-negative total due (pure credit) is paid even with nothing paid", () => {
    expect(statusForPayment(-800, 0)).toBe("paid");
  });
});

describe("carryForwardBalance", () => {
  it("carries the unpaid shortfall forward as next cycle's previous balance", () => {
    expect(carryForwardBalance({ totalDueCents: 2800, amountPaidCents: 1600 })).toBe(1200);
  });

  it("carries a negative balance (credit) forward when overpaid", () => {
    expect(carryForwardBalance({ totalDueCents: 2000, amountPaidCents: 2500 })).toBe(-500);
  });

  it("is zero when paid in full", () => {
    expect(carryForwardBalance({ totalDueCents: 2800, amountPaidCents: 2800 })).toBe(0);
  });
});
