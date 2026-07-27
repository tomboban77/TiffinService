import Link from "next/link";
import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { listSlots } from "../../../lib/repo/slots";
import { listPriceListItems } from "../../../lib/repo/priceList";
import { listActiveStandingOrderFixtures } from "../../../lib/repo/standingOrders";
import { listAdjustmentsForDate } from "../../../lib/repo/adjustments";
import { listClosureDates } from "../../../lib/repo/closures";
import { ensureRouteStopsForDate, listRouteStopsForDate } from "../../../lib/repo/routeStops";
import { computeDailyCounts } from "../../../lib/billing/counts";
import { todayInTimezone, addDays, weekdayInTimezone } from "../../../lib/time";
import { markDeliveredAction, markNotDeliveredAction, closeDayAction } from "./actions";

export default async function TodayPage({ searchParams }: { searchParams: { date?: string } }) {
  const operator = await requireOperator();
  const date = searchParams.date ?? todayInTimezone(operator.timezone);
  const weekday = weekdayInTimezone(date, operator.timezone);

  const [slots, priceList, closureDates] = await Promise.all([
    listSlots(db, operator.id),
    listPriceListItems(db, operator.id),
    listClosureDates(db, operator.id),
  ]);
  const isClosed = closureDates.includes(date);
  const priceById = new Map(priceList.map((p) => [p.id, p]));

  if (!isClosed) {
    await ensureRouteStopsForDate(db, operator.id, date, operator.timezone);
  }

  const [orders, adjustments, stops] = await Promise.all([
    listActiveStandingOrderFixtures(db, operator.id),
    listAdjustmentsForDate(db, operator.id, date),
    listRouteStopsForDate(db, operator.id, date),
  ]);

  const closeDayForThis = closeDayAction.bind(null, date);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href={`/today?date=${addDays(date, -1)}`} className="text-sm text-gray-500">
          ← Prev
        </Link>
        <h1 className="text-lg font-semibold">{date}</h1>
        <Link href={`/today?date=${addDays(date, 1)}`} className="text-sm text-gray-500">
          Next →
        </Link>
      </div>

      {isClosed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Closed — no counts, no route, nothing burns today.
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-500">Cook counts</h2>
            {slots
              .filter((s) => s.active)
              .map((slot) => {
                const counts = computeDailyCounts({
                  date,
                  slotId: slot.id,
                  standingOrders: orders,
                  adjustments,
                  closureDates,
                  weekday,
                });
                const entries = Object.entries(counts);
                return (
                  <div key={slot.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-2 text-sm font-medium">{slot.label}</div>
                    {entries.length === 0 ? (
                      <p className="text-sm text-gray-500">Nothing scheduled.</p>
                    ) : (
                      <ul className="flex flex-col gap-1 text-sm">
                        {entries.map(([itemId, qty]) => (
                          <li key={itemId} className="flex justify-between">
                            <span>{priceById.get(itemId)?.name ?? itemId}</span>
                            <span className="font-medium">{qty}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Delivery route</h2>
            <StopList
              stops={stops.filter((s) => s.deliveryMethod === "delivery")}
              slotLabel={(slotId) => slots.find((s) => s.id === slotId)?.label ?? slotId}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Pickup list</h2>
            <StopList
              stops={stops.filter((s) => s.deliveryMethod === "pickup")}
              slotLabel={(slotId) => slots.find((s) => s.id === slotId)?.label ?? slotId}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">Closure</h2>
            <form action={closeDayForThis} className="flex gap-2 rounded-lg border border-gray-200 bg-white p-4">
              <input name="reason" placeholder="Reason (optional)" className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm" />
              <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-sm">
                Close this day
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

function StopList({
  stops,
  slotLabel,
}: {
  stops: Awaited<ReturnType<typeof listRouteStopsForDate>>;
  slotLabel: (slotId: string) => string;
}) {
  if (stops.length === 0) return <p className="text-sm text-gray-500">Nothing here today.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {stops.map((stop) => (
        <li key={stop.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{stop.customerName}</div>
              <div className="text-xs text-gray-500">
                {slotLabel(stop.slotId)} {stop.customerAddress ? `— ${stop.customerAddress}` : ""}
              </div>
              {stop.customerFoodNotes && <div className="text-xs text-gray-500">Notes: {stop.customerFoodNotes}</div>}
            </div>
            <StatusBadge status={stop.status} />
          </div>

          {stop.status === "pending" && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <form action={markDeliveredAction.bind(null, stop.id)}>
                <button className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white">Delivered</button>
              </form>
              <details className="text-xs">
                <summary className="cursor-pointer rounded-md border border-gray-300 px-3 py-1">Not delivered</summary>
                <form action={markNotDeliveredAction.bind(null, stop.id)} className="mt-2 flex flex-col gap-2">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" name="chargeOnFail" /> Charge anyway
                  </label>
                  <input name="note" placeholder="Note (required)" required className="rounded-md border border-gray-300 px-2 py-1" />
                  <button type="submit" className="self-start rounded-md border border-gray-300 px-3 py-1">
                    Confirm
                  </button>
                </form>
              </details>
            </div>
          )}
          {stop.status === "not_delivered" && stop.note && <div className="mt-1 text-xs text-gray-500">Note: {stop.note}</div>}
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "delivered" ? "bg-green-100 text-green-700" : status === "not_delivered" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2 py-1 text-xs ${color}`}>{status}</span>;
}
