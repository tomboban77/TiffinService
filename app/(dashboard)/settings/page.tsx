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
import { Badge, Banner, Card, Checkbox, ConfirmSubmitButton, Input, PageHeader, SubmitButton, TimezoneField } from "../../../components/ui";
import { SlotLabelField } from "./SlotLabelField";
import { BillingFrequencyFields } from "./BillingFrequencyFields";

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string } }) {
  const operator = await requireOperator();
  const [slots, priceList, prepaidPlans] = await Promise.all([
    listSlots(db, operator.id),
    listPriceListItems(db, operator.id),
    listPrepaidPlans(db, operator.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader title="Settings" />
      {searchParams.error && <Banner variant="error">{searchParams.error}</Banner>}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-muted">Business basics</h2>
        <Card>
          <form action={updateBusinessBasics} className="flex flex-col gap-4">
            <Input label="Business name" name="businessName" defaultValue={operator.businessName} />
            <Input label="Your name" name="ownerName" defaultValue={operator.ownerName} />
            <TimezoneField defaultValue={operator.timezone} />
            <Input label="Bot reply language (fallback)" name="botLanguage" defaultValue={operator.botLanguage} />
            <SubmitButton className="self-start">Save</SubmitButton>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-muted">Billing day</h2>
        <Card>
          <form action={updateBillingConfig} className="flex flex-col gap-4">
            <BillingFrequencyFields defaultFrequency={operator.billingFrequency ?? ""} defaultDayOfWeek={operator.billingDayOfWeek} />
            <Input label="Grace period (days)" name="gracePeriodDays" type="number" min={0} defaultValue={operator.gracePeriodDays} />
            <SubmitButton className="self-start">Save</SubmitButton>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-muted">Slots</h2>
        <Card className="flex flex-col gap-3">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-ink">
                {slot.label} — cutoff {slot.cutoffTime}
                {!slot.active && <Badge>inactive</Badge>}
              </span>
              <form action={toggleSlotActive.bind(null, slot.id, !slot.active)}>
                {slot.active ? (
                  <ConfirmSubmitButton
                    variant="ghost"
                    size="sm"
                    confirmMessage={`Deactivate the "${slot.label}" slot? It will stop appearing on Today until reactivated.`}
                  >
                    Deactivate
                  </ConfirmSubmitButton>
                ) : (
                  <SubmitButton variant="ghost" size="sm">
                    Activate
                  </SubmitButton>
                )}
              </form>
            </div>
          ))}
          <form key={slots.length} action={addOrUpdateSlot} className="mt-2 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <SlotLabelField />
            </div>
            <div className="w-full sm:w-40">
              <Input label="Cutoff time" name="cutoffTime" type="time" defaultValue="20:00" required />
            </div>
            <SubmitButton>Add</SubmitButton>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-muted">Price list</h2>
        <Card className="flex flex-col gap-3">
          {priceList.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-ink">
                {item.name} — ${(item.priceCents / 100).toFixed(2)}
                {!item.active && <Badge>inactive</Badge>}
              </span>
              <form action={togglePriceListItemActive.bind(null, item.id, !item.active)}>
                {item.active ? (
                  <ConfirmSubmitButton
                    variant="ghost"
                    size="sm"
                    confirmMessage={`Deactivate "${item.name}"? It will stop appearing in counts and forms until reactivated.`}
                  >
                    Deactivate
                  </ConfirmSubmitButton>
                ) : (
                  <SubmitButton variant="ghost" size="sm">
                    Activate
                  </SubmitButton>
                )}
              </form>
            </div>
          ))}
          <form key={priceList.length} action={addOrUpdatePriceListItem} className="mt-2 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input label="Meal type" name="name" placeholder="Meal type" required />
            </div>
            <div className="w-full sm:w-40">
              <Input label="Price ($ per meal)" name="priceDollars" type="number" step="0.01" min="0" placeholder="Price" required />
            </div>
            <SubmitButton>Add</SubmitButton>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-muted">Prepaid plans</h2>
        <Card className="flex flex-col gap-3">
          {prepaidPlans.map((plan) => (
            <div key={plan.id} className="text-sm text-ink">
              {plan.name} — {plan.pointsPerRenewal} pts / ${(plan.priceCents / 100).toFixed(2)} —{" "}
              {plan.rolloverEnabled ? "rollover" : "expires at cycle end"}
            </div>
          ))}
          <form key={prepaidPlans.length} action={addPrepaidPlan} className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
            <Input label="Plan name" name="name" required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Points" name="pointsPerRenewal" type="number" min="1" required />
              <Input label="Price ($)" name="priceDollars" type="number" step="0.01" min="0" required />
            </div>
            <Checkbox label="Rollover (unused points carry to the next renewal)" name="rolloverEnabled" defaultChecked />
            <SubmitButton className="self-start">Add</SubmitButton>
          </form>
        </Card>
      </section>
    </div>
  );
}
