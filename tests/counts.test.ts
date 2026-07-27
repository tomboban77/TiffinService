import { describe, expect, it } from "vitest";
import { computeDailyCounts, type AdjustmentFixture, type StandingOrderFixture } from "../lib/billing/counts";
import { weekdayInTimezone } from "../lib/time";

const LUNCH = "slot-lunch";
const NON_VEG = "item-non-veg";
const VEG = "item-veg";

function baseOrder(overrides: Partial<StandingOrderFixture> = {}): StandingOrderFixture {
  return {
    id: "order-1",
    customerId: "cust-1",
    slotId: LUNCH,
    active: true,
    dayPattern: [1, 2, 3, 4, 5], // Mon-Fri
    cadence: "per_day",
    items: [{ priceListItemId: NON_VEG, quantity: 2 }],
    ...overrides,
  };
}

describe("computeDailyCounts", () => {
  it("sums standing order quantities for a day the pattern includes", () => {
    const totals = computeDailyCounts({
      date: "2026-07-20", // Monday
      slotId: LUNCH,
      standingOrders: [baseOrder()],
      adjustments: [],
      closureDates: [],
      weekday: 1,
    });
    expect(totals).toEqual({ [NON_VEG]: 2 });
  });

  it("excludes a standing order on a day its pattern does not include", () => {
    const totals = computeDailyCounts({
      date: "2026-07-25", // Saturday
      slotId: LUNCH,
      standingOrders: [baseOrder()],
      adjustments: [],
      closureDates: [],
      weekday: 6,
    });
    expect(totals).toEqual({});
  });

  it("zeroes a customer's contribution for a skip adjustment", () => {
    const adj: AdjustmentFixture = {
      customerId: "cust-1",
      standingOrderId: "order-1",
      effectiveDate: "2026-07-22",
      kind: "skip",
    };
    const totals = computeDailyCounts({
      date: "2026-07-22", // Wednesday
      slotId: LUNCH,
      standingOrders: [baseOrder()],
      adjustments: [adj],
      closureDates: [],
      weekday: 3,
    });
    expect(totals).toEqual({});
  });

  it("ignores a canceled (superseded) skip", () => {
    const adj: AdjustmentFixture = {
      customerId: "cust-1",
      standingOrderId: "order-1",
      effectiveDate: "2026-07-22",
      kind: "skip",
      canceledAt: "2026-07-21T10:00:00Z",
    };
    const totals = computeDailyCounts({
      date: "2026-07-22",
      slotId: LUNCH,
      standingOrders: [baseOrder()],
      adjustments: [adj],
      closureDates: [],
      weekday: 3,
    });
    expect(totals).toEqual({ [NON_VEG]: 2 });
  });

  it("adds an extra on top of the standing order default", () => {
    const adj: AdjustmentFixture = {
      customerId: "cust-1",
      standingOrderId: "order-1",
      effectiveDate: "2026-07-20",
      kind: "extra",
      priceListItemId: NON_VEG,
      quantity: 1,
    };
    const totals = computeDailyCounts({
      date: "2026-07-20",
      slotId: LUNCH,
      standingOrders: [baseOrder()],
      adjustments: [adj],
      closureDates: [],
      weekday: 1,
    });
    expect(totals).toEqual({ [NON_VEG]: 3 });
  });

  it("a meal-type swap (two linked adjustments) zeroes the old item and adds the new one", () => {
    // Modeled as two rows sharing an adjustmentGroupId (not asserted here,
    // just verifying the count math resolves them correctly together).
    const setOld: AdjustmentFixture = {
      customerId: "cust-1",
      standingOrderId: "order-1",
      effectiveDate: "2026-07-20",
      kind: "set_quantity",
      priceListItemId: NON_VEG,
      quantity: 0,
    };
    const addNew: AdjustmentFixture = {
      customerId: "cust-1",
      standingOrderId: "order-1",
      effectiveDate: "2026-07-20",
      kind: "extra",
      priceListItemId: VEG,
      quantity: 2,
    };
    const totals = computeDailyCounts({
      date: "2026-07-20",
      slotId: LUNCH,
      standingOrders: [baseOrder()],
      adjustments: [setOld, addNew],
      closureDates: [],
      weekday: 1,
    });
    expect(totals).toEqual({ [VEG]: 2 });
  });

  it("a set_quantity override on one customer never leaks into another customer's total", () => {
    const orderA = baseOrder({ id: "order-a", customerId: "cust-a" });
    const orderB = baseOrder({ id: "order-b", customerId: "cust-b" });
    const overrideA: AdjustmentFixture = {
      customerId: "cust-a",
      standingOrderId: "order-a",
      effectiveDate: "2026-07-20",
      kind: "set_quantity",
      priceListItemId: NON_VEG,
      quantity: 5,
    };
    const totals = computeDailyCounts({
      date: "2026-07-20",
      slotId: LUNCH,
      standingOrders: [orderA, orderB],
      adjustments: [overrideA],
      closureDates: [],
      weekday: 1,
    });
    // cust-a overridden to 5, cust-b stays at its default of 2 -> total 7, not 10.
    expect(totals).toEqual({ [NON_VEG]: 7 });
  });

  it("a closure zeroes every count regardless of standing orders", () => {
    const totals = computeDailyCounts({
      date: "2026-07-27",
      slotId: LUNCH,
      standingOrders: [baseOrder()],
      adjustments: [],
      closureDates: ["2026-07-27"],
      weekday: 1,
    });
    expect(totals).toEqual({});
  });

  it("aggregates a batch order's full-period quantity on its single drop day", () => {
    const batchOrder = baseOrder({
      id: "order-batch",
      customerId: "cust-batch",
      cadence: "batch",
      dayPattern: [0], // Sunday drop
      items: [{ priceListItemId: NON_VEG, quantity: 7 }], // whole week, dropped once
    });
    const totals = computeDailyCounts({
      date: "2026-07-26", // Sunday
      slotId: LUNCH,
      standingOrders: [batchOrder],
      adjustments: [],
      closureDates: [],
      weekday: 0,
    });
    expect(totals).toEqual({ [NON_VEG]: 7 });
  });
});

describe("weekdayInTimezone", () => {
  it("resolves the weekday in the operator's timezone, not the server's", () => {
    // 2026-07-20 is a Monday in America/Toronto.
    expect(weekdayInTimezone("2026-07-20", "America/Toronto")).toBe(1);
    // Same calendar date is still Monday in a far-ahead timezone.
    expect(weekdayInTimezone("2026-07-20", "Asia/Kolkata")).toBe(1);
  });

  it("handles a DST transition date without shifting the calendar day", () => {
    // 2026-03-08 is the spring-forward DST transition in America/Toronto (a Sunday).
    expect(weekdayInTimezone("2026-03-08", "America/Toronto")).toBe(0);
  });
});
