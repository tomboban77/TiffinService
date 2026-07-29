import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { listSlots } from "../../../lib/repo/slots";
import { listPriceListItems } from "../../../lib/repo/priceList";
import { listPrepaidPlans } from "../../../lib/repo/prepaidPlans";
import {
  updateBusinessBasics,
  updateBillingConfig,
  addOrUpdateSlot,
  toggleSlotActive,
  addOrUpdatePriceListItem,
  togglePriceListItemActive,
  addPrepaidPlan,
} from "./actions";

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string } }) {
  const operator = await requireOperator();
  const [slots, priceList, prepaidPlans] = await Promise.all([
    listSlots(db, operator.id),
    listPriceListItems(db, operator.id),
    listPrepaidPlans(db, operator.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {searchParams.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{searchParams.error}</div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Business basics</h2>
        <form action={updateBusinessBasics} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            Business name
            <input name="businessName" defaultValue={operator.businessName} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Your name
            <input name="ownerName" defaultValue={operator.ownerName} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Timezone (IANA)
            <input name="timezone" defaultValue={operator.timezone} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Bot reply language (fallback)
            <input name="botLanguage" defaultValue={operator.botLanguage} className="rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <button type="submit" className="mt-2 self-start rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
            Save
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Billing day</h2>
        <form action={updateBillingConfig} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            Frequency
            <select name="billingFrequency" defaultValue={operator.billingFrequency ?? ""} className="rounded-md border border-gray-300 px-3 py-2">
              <option value="">Not billed (prepaid only)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Day of week (0=Sun .. 6=Sat, for weekly/biweekly)
            <input
              name="billingDayOfWeek"
              type="number"
              min={0}
              max={6}
              defaultValue={operator.billingDayOfWeek ?? ""}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Grace period (days)
            <input
              name="gracePeriodDays"
              type="number"
              min={0}
              defaultValue={operator.gracePeriodDays}
              className="rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <button type="submit" className="mt-2 self-start rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
            Save
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Slots</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between text-sm">
              <span>
                {slot.label} — cutoff {slot.cutoffTime} {!slot.active && <em className="text-gray-400">(inactive)</em>}
              </span>
              <form action={toggleSlotActive.bind(null, slot.id, !slot.active)}>
                <button className="text-xs text-gray-500 underline">{slot.active ? "Deactivate" : "Activate"}</button>
              </form>
            </div>
          ))}
          <form key={slots.length} action={addOrUpdateSlot} className="mt-2 flex gap-2">
            <input name="key" placeholder="key (e.g. dinner)" required className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm" />
            <input name="label" placeholder="Label" required className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm" />
            <input name="cutoffTime" type="time" defaultValue="20:00" required className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
            <button type="submit" className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white">
              Add
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Price list</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
          {priceList.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>
                {item.name} — ${(item.priceCents / 100).toFixed(2)} {!item.active && <em className="text-gray-400">(inactive)</em>}
              </span>
              <form action={togglePriceListItemActive.bind(null, item.id, !item.active)}>
                <button className="text-xs text-gray-500 underline">{item.active ? "Deactivate" : "Activate"}</button>
              </form>
            </div>
          ))}
          <form key={priceList.length} action={addOrUpdatePriceListItem} className="mt-2 flex gap-2">
            <input name="name" placeholder="Meal type" required className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm" />
            <input
              name="priceDollars"
              type="number"
              step="0.01"
              min="0"
              placeholder="Price"
              required
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white">
              Add
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Prepaid plans</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4">
          {prepaidPlans.map((plan) => (
            <div key={plan.id} className="text-sm">
              {plan.name} — {plan.pointsPerRenewal} pts / ${(plan.priceCents / 100).toFixed(2)} —{" "}
              {plan.rolloverEnabled ? "rollover" : "expires at cycle end"}
            </div>
          ))}
          <form key={prepaidPlans.length} action={addPrepaidPlan} className="mt-2 flex flex-wrap items-center gap-2">
            <input name="name" placeholder="Plan name" required className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm" />
            <input name="pointsPerRenewal" type="number" min="1" placeholder="Points" required className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm" />
            <input name="priceDollars" type="number" step="0.01" min="0" placeholder="Price" required className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm" />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="rolloverEnabled" defaultChecked /> Rollover
            </label>
            <button type="submit" className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white">
              Add
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
