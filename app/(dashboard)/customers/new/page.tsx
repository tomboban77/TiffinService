import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { listPrepaidPlans } from "../../../../lib/repo/prepaidPlans";
import { createCustomerAction } from "./actions";
import { Banner, Card, Input, PageHeader, Select, SubmitButton } from "../../../../components/ui";

export default async function NewCustomerPage({ searchParams }: { searchParams: { error?: string } }) {
  const operator = await requireOperator();
  const plans = await listPrepaidPlans(db, operator.id);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <PageHeader title="Add customer" />
      {searchParams.error && <Banner variant="error">{searchParams.error}</Banner>}

      <Card>
        <form action={createCustomerAction} className="flex flex-col gap-4">
          <Input label="Name" name="name" required />
          <Input label="Phone number" name="phoneE164" required hint="Any format — assumed Canadian if no country code" />
          <Input label="Address" name="address" />
          <Input label="Food notes" name="foodNotes" placeholder="less spicy, no onion" />
          <Select label="Billing" name="billingMode" defaultValue="billed_arrears">
            <option value="billed_arrears">Billed (tab)</option>
            <option value="prepaid">Prepaid</option>
          </Select>
          <Select label="Prepaid plan" name="prepaidPlanId" defaultValue="" hint="Only used when billing is Prepaid">
            <option value="">—</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <SubmitButton className="mt-1">Save</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
