import { describe, expect, it } from "vitest";
import { applyManualAdjustment, applyRenewal, burnPoints, pointsToBurn } from "../lib/billing/points";

describe("pointsToBurn", () => {
  it("burns one point per billable meal (delivered + failed_charged), not failed_not_charged", () => {
    const burned = pointsToBurn([
      { quantity: 1, status: "delivered" },
      { quantity: 2, status: "failed_charged" },
      { quantity: 3, status: "failed_not_charged" },
    ]);
    expect(burned).toBe(3); // 1 + 2, the failed_not_charged 3 is excluded
  });

  it("a skip burns nothing because no ledger line exists for it", () => {
    expect(pointsToBurn([])).toBe(0);
  });
});

describe("applyRenewal", () => {
  it("rollover plans add the new points on top of the existing balance", () => {
    const balance = applyRenewal(4, { pointsPerRenewal: 10, rolloverEnabled: true });
    expect(balance).toBe(14);
  });

  it("expire-at-cycle-end plans discard any unused balance before crediting the renewal", () => {
    const balance = applyRenewal(4, { pointsPerRenewal: 10, rolloverEnabled: false });
    expect(balance).toBe(10); // the 4 leftover points are gone, not carried
  });

  it("expiry with zero leftover behaves the same as rollover", () => {
    expect(applyRenewal(0, { pointsPerRenewal: 5, rolloverEnabled: false })).toBe(5);
  });
});

describe("burnPoints / applyManualAdjustment", () => {
  it("burnPoints decrements by the delivered quantity", () => {
    expect(burnPoints(10, 2)).toBe(8);
  });

  it("burnPoints can take a balance negative when it burns more than remains (surfaced as a low/negative balance, not clamped silently)", () => {
    expect(burnPoints(1, 2)).toBe(-1);
  });

  it("applyManualAdjustment supports the +/- escape hatch in either direction", () => {
    expect(applyManualAdjustment(10, -3)).toBe(7);
    expect(applyManualAdjustment(10, 5)).toBe(15);
  });
});
