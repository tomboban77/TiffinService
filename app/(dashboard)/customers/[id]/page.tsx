import { notFound } from "next/navigation";
import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { getCustomer } from "../../../../lib/repo/customers";
import { listStandingOrdersForCustomer } from "../../../../lib/repo/standingOrders";
import { listAdjustmentHistoryForCustomer } from "../../../../lib/repo/adjustments";
import { listSlots } from "../../../../lib/repo/slots";
import { listPriceListItems } from "../../../../lib/repo/priceList";
import { updateCustomerDetails, addStandingOrder, addAdjustment, adjustPoints } from "./actions";
import { Badge, Card, Checkbox, Input, PageHeader, Select, SubmitButton } from "../../../../components/ui";
import { CadenceFields } from "./CadenceFields";

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
      <PageHeader
        title={customer.name}
        description={
          <Badge>{customer.billingMode === "prepaid" ? `Prepaid — ${customer.pointsBalance} pts` : "Billed (tab)"}</Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-700">Contact</h2>
            <Card>
              <form action={updateCustomerDetailsForThis} className="flex flex-col gap-4">
                <Input label="Name" name="name" defaultValue={customer.name} />
                <Input label="Phone number" name="phoneE164" defaultValue={customer.phoneE164} />
                <Input label="Address" name="address" defaultValue={customer.address ?? ""} />
                <Input label="Food notes" name="foodNotes" defaultValue={customer.foodNotes ?? ""} />
                <SubmitButton className="self-start">Save</SubmitButton>
              </form>
            </Card>
          </section>

          {customer.billingMode === "prepaid" && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-700">Points balance</h2>
              <Card>
                <form key={customer.pointsBalance} action={adjustPointsForThis} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="w-28">
                    <Input label="Delta (+/-)" name="delta" type="number" required />
                  </div>
                  <div className="flex-1">
                    <Input label="Note (required)" name="note" required />
                  </div>
                  <SubmitButton>Apply</SubmitButton>
                </form>
              </Card>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-700">Interaction history</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {history.map((a) => (
                <li key={a.id} className="rounded-card border border-line bg-surface p-3">
                  <span className="font-medium text-ink">{a.effectiveDate}</span>{" "}
                  <span className="text-ink-muted">
                    —{" "}
                    {a.priceListItemId
                      ? `${priceById.get(a.priceListItemId)?.name ?? a.priceListItemId}: ${
                          a.kind === "set_quantity" && a.quantity === 0 ? "skip" : `${a.kind} ${a.quantity ?? ""}`.trim()
                        }`
                      : a.kind}
                    {a.note ? ` — ${a.note}` : ""}
                  </span>
                  {a.canceledAt ? <span className="ml-2 text-xs text-ink-subtle">(superseded)</span> : null}
                </li>
              ))}
              {history.length === 0 && <p className="text-ink-muted">No adjustments yet.</p>}
            </ul>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-700">Standing orders</h2>
            <div className="flex flex-col gap-3">
              {orders.map((order) => (
                <Card key={order.id}>
                  <div className="flex items-center gap-2 font-serif text-base font-semibold text-ink">
                    {slotById.get(order.slotId)?.label ?? order.slotId} — {order.deliveryMethod}
                    {!order.active && <Badge>inactive</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-ink-muted">
                    {order.cadence === "batch"
                      ? `Batch drop, ${DAY_LABELS[order.dayPattern[0] ?? 0]}, covers ${order.periodDays ?? "?"} days`
                      : order.dayPattern.map((d) => DAY_LABELS[d]).join(", ")}
                  </div>
                  <ul className="mt-2 list-inside list-disc text-sm text-ink-muted">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity}x {priceById.get(item.priceListItemId)?.name ?? item.priceListItemId}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}

              <Card key={orders.length}>
                <form action={addStandingOrderForThis} className="flex flex-col gap-4">
                  <div className="text-sm font-semibold text-ink">Add a standing order</div>
                  <Select label="Slot" name="slotId" required defaultValue="">
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                  <CadenceFields />
                  <Select label="Delivery method" name="deliveryMethod" required defaultValue="delivery">
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Pickup</option>
                  </Select>
                  <fieldset className="flex flex-col gap-2 text-sm">
                    <legend className="mb-1 font-medium text-ink">Days (or the single batch drop day)</legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {DAY_LABELS.map((label, d) => (
                        <Checkbox key={d} label={label} name={`day-${d}`} />
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="flex flex-col gap-2 text-sm">
                    <legend className="mb-1 font-medium text-ink">Quantities</legend>
                    {priceList.map((item) => (
                      <label key={item.id} className="flex items-center justify-between gap-2">
                        {item.name}
                        <input
                          name={`qty-${item.id}`}
                          type="number"
                          min={0}
                          defaultValue={0}
                          className="w-20 min-h-[44px] rounded-control border border-line-strong px-2 py-1 text-ink focus:outline-none focus:ring-2 focus:ring-accent-500"
                        />
                      </label>
                    ))}
                  </fieldset>
                  <SubmitButton className="self-start">Add standing order</SubmitButton>
                </form>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-700">Add adjustment</h2>
            <p className="mb-2 text-xs text-ink-muted">
              Set a meal type to 0 to skip it, or a number to override its quantity, for a date or a date range. This is a
              quick operator override — the WhatsApp bot will be the primary way customers request these in milestone 3.
            </p>
            <Card key={history.length}>
              <form action={addAdjustmentForThis} className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select label="Standing order" name="standingOrderId" defaultValue="">
                    <option value="">(any order)</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {slotById.get(o.slotId)?.label ?? o.slotId}
                      </option>
                    ))}
                  </Select>
                  <Input label="Date" name="startDate" type="date" required />
                  <Input label="Through (optional, for a range)" name="endDate" type="date" />
                </div>
                <fieldset className="flex flex-col gap-2 text-sm">
                  <legend className="mb-1 font-medium text-ink">Meal types (blank = no change, 0 = skip)</legend>
                  {priceList.map((item) => (
                    <label key={item.id} className="flex items-center justify-between gap-2">
                      {item.name}
                      <input
                        name={`qty-${item.id}`}
                        type="number"
                        min={0}
                        placeholder="—"
                        className="w-20 min-h-[44px] rounded-control border border-line-strong px-2 py-1 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </label>
                  ))}
                </fieldset>
                <SubmitButton className="self-start">Add adjustment</SubmitButton>
              </form>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
