export type AdjustmentKind =
  | "skip"
  | "pause"
  | "resume"
  | "extra"
  | "set_quantity"
  | "address_change"
  | "food_notes_change"
  | "other";

export interface StandingOrderItemFixture {
  priceListItemId: string;
  quantity: number;
}

export interface StandingOrderFixture {
  id: string;
  customerId: string;
  slotId: string;
  active: boolean;
  /** Weekdays 0-6 (Sun-Sat). For cadence "batch" this is the single drop weekday. */
  dayPattern: number[];
  cadence: "per_day" | "batch";
  items: StandingOrderItemFixture[];
  /** Unused by count computation itself; carried through so route-stop generation doesn't need a second query. */
  deliveryMethod?: "delivery" | "pickup";
}

export interface AdjustmentFixture {
  customerId: string;
  /** null = applies across all of the customer's standing orders in this slot (e.g. a full pause). */
  standingOrderId?: string | null;
  /** 'YYYY-MM-DD' service date (or batch drop date) this adjustment applies to. */
  effectiveDate: string;
  kind: AdjustmentKind;
  priceListItemId?: string | null;
  quantity?: number | null;
  /** Set when superseded by a later last-write-wins adjustment; excluded from computation. */
  canceledAt?: string | null;
}

export interface ComputeDailyCountsInput {
  /** 'YYYY-MM-DD' service date. */
  date: string;
  slotId: string;
  standingOrders: StandingOrderFixture[];
  adjustments: AdjustmentFixture[];
  closureDates: string[];
  /** Weekday (0-6) for `date` as observed in the operator's timezone — see lib/time.ts. */
  weekday: number;
}

/**
 * Resolves a single standing order's effective item quantities for one date,
 * applying only the adjustments relevant to that order/customer/date. Returns
 * null if the order isn't active for that date at all (wrong weekday, or
 * skipped/paused) so callers can distinguish "not scheduled today" from "an
 * override reduced everything to zero."
 *
 * This is the one place skip/pause/extra/set_quantity resolution happens —
 * both computeDailyCounts (aggregate, for the Today screen's cook counts)
 * and the route-stop mark-delivered flow (per customer, to write the correct
 * delivery_ledger line items) call this rather than re-deriving it.
 */
export function resolveStandingOrderForDate(
  order: StandingOrderFixture,
  adjustments: AdjustmentFixture[],
  date: string,
  weekday: number,
): Record<string, number> | null {
  if (!order.active || !order.dayPattern.includes(weekday)) return null;

  const relevant = adjustments.filter(
    (a) =>
      !a.canceledAt &&
      a.effectiveDate === date &&
      a.customerId === order.customerId &&
      (a.standingOrderId == null || a.standingOrderId === order.id),
  );

  if (relevant.some((a) => a.kind === "skip" || a.kind === "pause")) return null;

  const perItem: Record<string, number> = {};
  for (const item of order.items) perItem[item.priceListItemId] = item.quantity;

  for (const a of relevant) {
    if (a.kind === "set_quantity" && a.priceListItemId && a.quantity != null) {
      perItem[a.priceListItemId] = a.quantity;
    }
  }
  for (const a of relevant) {
    if (a.kind === "extra" && a.priceListItemId && a.quantity != null) {
      perItem[a.priceListItemId] = (perItem[a.priceListItemId] ?? 0) + a.quantity;
    }
  }

  for (const key of Object.keys(perItem)) {
    if (perItem[key] !== undefined && perItem[key] <= 0) delete perItem[key];
  }

  return perItem;
}

/**
 * Standing-order defaults, minus skips/pauses, plus extras, with set_quantity
 * overrides applied per customer before aggregating across customers —
 * so one customer's override never leaks into another's totals. A closure
 * date zeroes everything for the operator regardless of standing orders.
 */
export function computeDailyCounts(input: ComputeDailyCountsInput): Record<string, number> {
  const { date, slotId, standingOrders, adjustments, closureDates, weekday } = input;
  const totals: Record<string, number> = {};

  if (closureDates.includes(date)) return totals;

  for (const order of standingOrders) {
    if (order.slotId !== slotId) continue;
    const perItem = resolveStandingOrderForDate(order, adjustments, date, weekday);
    if (!perItem) continue;

    for (const [priceListItemId, qty] of Object.entries(perItem)) {
      totals[priceListItemId] = (totals[priceListItemId] ?? 0) + qty;
    }
  }

  return totals;
}
