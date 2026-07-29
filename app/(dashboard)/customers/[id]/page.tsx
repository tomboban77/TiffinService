import { notFound } from "next/navigation";
import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { getCustomer } from "../../../../lib/repo/customers";
import { listStandingOrdersForCustomer } from "../../../../lib/repo/standingOrders";
import { listAdjustmentHistoryForCustomer } from "../../../../lib/repo/adjustments";
import { listSlots } from "../../../../lib/repo/slots";
import { listPriceListItems } from "../../../../lib/repo/priceList";
import { updateCustomerDetails, addStandingOrder, addAdjustment, adjustPoints } from "./actions";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const operator = await requireOperator();
  const customer = await getCustomer(db, operator.id, params.id);
  if (!customer) notFound();

  const [orders, history, slots, priceList] = await Promise.all([
    listStandingOrdersForCustomer(db, operator.id, customer.id),
    listAdjustmentHistoryForCustomer(db, operator.id, customer.id),
    listSlots(db, operator.id),
    listPriceListItems(db, operator.id),
  ]);
  const slotById = new Map(slots.map((s) => [s.id, s]));
  const priceById = new Map(priceList.map((p) => [p.id, p]));

  const updateCustomerDetailsForThis = updateCustomerDetails.bind(null, customer.id);
  const addStandingOrderForThis = addStandingOrder.bind(null, customer.id);
  const addAdjustmentForThis = addAdjustment.bind(null, customer.id);
  const adjustPointsForThis = adjustPoints.bind(null, customer.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{customer.name}</h1>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
          {customer.billingMode === "prepaid" ? `Prepaid — ${customer.pointsBalance} pts` : "Billed (tab)"}
        </span>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Contact</h2>
        <form action={updateCustomerDetailsForThis} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            Name
            <input name="name" defaultValue={customer.name} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Phone
            <input name="phoneE164" defaultValue={customer.phoneE164} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Address
            <input name="address" defaultValue={customer.address ?? ""} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Food notes
            <input name="foodNotes" defaultValue={customer.foodNotes ?? ""} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <button type="submit" className="mt-2 self-start rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
            Save
          </button>
        </form>
      </section>

      {customer.billingMode === "prepaid" && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">Points balance</h2>
          <form action={adjustPointsForThis} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4">
            <label className="flex flex-col gap-1 text-sm">
              Delta (+/-)
              <input name="delta" type="number" required className="w-24 rounded-md border border-gray-300 px-2 py-1" />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Note (required)
              <input name="note" required className="rounded-md border border-gray-300 px-2 py-1" />
            </label>
            <button type="submit" className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white">
              Apply
            </button>
          </form>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Standing orders</h2>
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
              <div className="font-medium">
                {slotById.get(order.slotId)?.label ?? order.slotId} — {order.deliveryMethod}
                {!order.active && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
              </div>
              <div className="text-gray-600">
                {order.cadence === "batch"
                  ? `Batch drop, ${DAY_LABELS[order.dayPattern[0] ?? 0]}, covers ${order.periodDays ?? "?"} days`
                  : order.dayPattern.map((d) => DAY_LABELS[d]).join(", ")}
              </div>
              <ul className="mt-1 list-inside list-disc text-gray-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}x {priceById.get(item.priceListItemId)?.name ?? item.priceListItemId}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <form action={addStandingOrderForThis} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-sm font-medium">Add a standing order</div>
            <label className="flex flex-col gap-1 text-sm">
              Slot
              <select name="slotId" required className="rounded-md border border-gray-300 px-3 py-2">
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Cadence
              <select name="cadence" required className="rounded-md border border-gray-300 px-3 py-2">
                <option value="per_day">Per-day</option>
                <option value="batch">Batch (single drop covering a period)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Period days (for batch)
              <input name="periodDays" type="number" defaultValue={7} min={1} className="rounded-md border border-gray-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Delivery method
              <select name="deliveryMethod" required className="rounded-md border border-gray-300 px-3 py-2">
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
              </select>
            </label>
            <fieldset className="flex flex-wrap gap-3 text-sm">
              <legend className="mb-1 w-full text-gray-500">Days (or the single batch drop day)</legend>
              {DAY_LABELS.map((label, d) => (
                <label key={d} className="flex items-center gap-1">
                  <input type="checkbox" name={`day-${d}`} /> {label}
                </label>
              ))}
            </fieldset>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1 text-gray-500">Quantities</legend>
              {priceList.map((item) => (
                <label key={item.id} className="flex items-center justify-between gap-2">
                  {item.name}
                  <input name={`qty-${item.id}`} type="number" min={0} defaultValue={0} className="w-20 rounded-md border border-gray-300 px-2 py-1" />
                </label>
              ))}
            </fieldset>
            <button type="submit" className="mt-2 self-start rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
              Add standing order
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Add adjustment</h2>
        <p className="mb-2 text-xs text-gray-500">
          Set a meal type to 0 to skip it, or a number to override its quantity, for a date or a date range. This is a
          quick operator override — the WhatsApp bot will be the primary way customers request these in milestone 3.
        </p>
        <form action={addAdjustmentForThis} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1 text-sm">
              Standing order
              <select name="standingOrderId" defaultValue="" className="rounded-md border border-gray-300 px-3 py-2">
                <option value="">(any order)</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {slotById.get(o.slotId)?.label ?? o.slotId}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Date
              <input name="startDate" type="date" required className="rounded-md border border-gray-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Through (optional, for a range)
              <input name="endDate" type="date" className="rounded-md border border-gray-300 px-3 py-2" />
            </label>
          </div>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1 text-gray-500">Meal types (blank = no change, 0 = skip)</legend>
            {priceList.map((item) => (
              <label key={item.id} className="flex items-center justify-between gap-2">
                {item.name}
                <input name={`qty-${item.id}`} type="number" min={0} placeholder="—" className="w-20 rounded-md border border-gray-300 px-2 py-1" />
              </label>
            ))}
          </fieldset>
          <button type="submit" className="self-start rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white">
            Add adjustment
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Interaction history</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {history.map((a) => (
            <li key={a.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <span className="font-medium">{a.effectiveDate}</span> —{" "}
              {a.priceListItemId
                ? `${priceById.get(a.priceListItemId)?.name ?? a.priceListItemId}: ${
                    a.kind === "set_quantity" && a.quantity === 0 ? "skip" : `${a.kind} ${a.quantity ?? ""}`.trim()
                  }`
                : a.kind}
              {a.note ? ` — ${a.note}` : ""}
              {a.canceledAt ? <span className="ml-2 text-xs text-gray-400">(superseded)</span> : null}
            </li>
          ))}
          {history.length === 0 && <p className="text-gray-500">No adjustments yet.</p>}
        </ul>
      </section>
    </div>
  );
}
