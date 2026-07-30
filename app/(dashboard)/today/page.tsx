import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, PackageCheck, Users } from "lucide-react";
import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { listSlots } from "../../../lib/repo/slots";
import { listPriceListItems } from "../../../lib/repo/priceList";
import { listActiveStandingOrderFixtures } from "../../../lib/repo/standingOrders";
import { listAdjustmentsForDate } from "../../../lib/repo/adjustments";
import { listClosureDates } from "../../../lib/repo/closures";
import { listCustomers } from "../../../lib/repo/customers";
import { ensureRouteStopsForDate, listRouteStopsForDate } from "../../../lib/repo/routeStops";
import { computeDailyCounts } from "../../../lib/billing/counts";
import { todayInTimezone, addDays, weekdayInTimezone, formatDateLabel } from "../../../lib/time";
import { markDeliveredAction, markNotDeliveredAction, closeDayAction } from "./actions";
import { Badge, type BadgeVariant, Banner, Card, Checkbox, ConfirmSubmitButton, EmptyState, Input, LinkButton, StatTile, SubmitButton } from "../../../components/ui";

export default async function TodayPage({ searchParams }: { searchParams: { date?: string; error?: string } }) {
  const operator = await requireOperator();
  const date = searchParams.date ?? todayInTimezone(operator.timezone);
  const weekday = weekdayInTimezone(date, operator.timezone);

  const [slots, priceList, closureDates, customers] = await Promise.all([
    listSlots(db, operator.id),
    listPriceListItems(db, operator.id),
    listClosureDates(db, operator.id),
    listCustomers(db, operator.id),
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
  const deliveryStops = stops.filter((s) => s.deliveryMethod === "delivery");
  const pickupStops = stops.filter((s) => s.deliveryMethod === "pickup");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/today?date=${addDays(date, -1)}`}
          aria-label="Previous day"
          className="flex h-11 w-11 items-center justify-center rounded-control text-ink-muted hover:bg-stone-100 hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="text-lg font-bold text-ink">{formatDateLabel(date, operator.timezone)}</h1>
        <Link
          href={`/today?date=${addDays(date, 1)}`}
          aria-label="Next day"
          className="flex h-11 w-11 items-center justify-center rounded-control text-ink-muted hover:bg-stone-100 hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>

      {searchParams.error && <Banner variant="error">{searchParams.error}</Banner>}

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer and their standing order to start seeing cook counts and today's route here."
          action={<LinkButton href="/customers/new">Add a customer</LinkButton>}
        />
      ) : isClosed ? (
        <Banner variant="info">Closed — no counts, no route, nothing burns today.</Banner>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-ink-muted">Cook counts</h2>
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
                    <Card key={slot.id}>
                      <div className="mb-3 text-base font-semibold text-ink">{slot.label}</div>
                      {entries.length === 0 ? (
                        <p className="text-sm text-ink-muted">Nothing scheduled.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {entries.map(([itemId, qty]) => (
                            <StatTile key={itemId} value={qty} label={priceById.get(itemId)?.name ?? itemId} />
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink-muted">Closure</h2>
              <Card>
                <form action={closeDayForThis} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Input label="Reason (optional)" name="reason" placeholder="Reason (optional)" />
                  </div>
                  <ConfirmSubmitButton
                    variant="secondary"
                    confirmMessage={`Close ${formatDateLabel(date, operator.timezone)}? No counts and no route will be generated for this day.`}
                  >
                    Close this day
                  </ConfirmSubmitButton>
                </form>
              </Card>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink-muted">Delivery route</h2>
              {deliveryStops.length === 0 ? (
                <EmptyStopState icon={MapPin} text="No deliveries on the route today." />
              ) : (
                <StopList stops={deliveryStops} slotLabel={(slotId) => slots.find((s) => s.id === slotId)?.label ?? slotId} date={date} />
              )}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink-muted">Pickup list</h2>
              {pickupStops.length === 0 ? (
                <EmptyStopState icon={PackageCheck} text="No pickups today." />
              ) : (
                <StopList stops={pickupStops} slotLabel={(slotId) => slots.find((s) => s.id === slotId)?.label ?? slotId} date={date} />
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyStopState({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-card border border-dashed border-line bg-surface px-4 py-6 text-sm text-ink-muted">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </div>
  );
}

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  pending: "pending",
  delivered: "delivered",
  not_delivered: "failed",
};

function StopList({
  stops,
  slotLabel,
  date,
}: {
  stops: Awaited<ReturnType<typeof listRouteStopsForDate>>;
  slotLabel: (slotId: string) => string;
  date: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {stops.map((stop) => (
        <li key={stop.id}>
          <Card>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-medium text-ink">{stop.customerName}</div>
                <div className="text-sm text-ink-muted">
                  {slotLabel(stop.slotId)} {stop.customerAddress ? `— ${stop.customerAddress}` : ""}
                </div>
                {stop.customerFoodNotes && <div className="text-sm text-ink-muted">Notes: {stop.customerFoodNotes}</div>}
              </div>
              <Badge variant={STATUS_BADGE_VARIANT[stop.status] ?? "neutral"}>{stop.status}</Badge>
            </div>

            {stop.status === "pending" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <form action={markDeliveredAction.bind(null, stop.id, date)}>
                  <SubmitButton className="w-full">Delivered</SubmitButton>
                </form>
                <details className="open:col-span-2 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-control border border-line-strong px-4 text-sm font-semibold text-ink">
                    Not delivered
                  </summary>
                  <form action={markNotDeliveredAction.bind(null, stop.id, date)} className="col-span-2 mt-2 flex flex-col gap-3">
                    <Checkbox label="Charge anyway" name="chargeOnFail" />
                    <Input label="Note" name="note" placeholder="Note (required)" required />
                    <SubmitButton variant="secondary">Confirm</SubmitButton>
                  </form>
                </details>
              </div>
            )}
            {stop.status === "not_delivered" && stop.note && <div className="mt-2 text-sm text-ink-muted">Note: {stop.note}</div>}
          </Card>
        </li>
      ))}
    </ul>
  );
}
