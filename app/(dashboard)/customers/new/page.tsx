import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { listPrepaidPlans } from "../../../../lib/repo/prepaidPlans";
import { createCustomerAction } from "./actions";

export default async function NewCustomerPage({ searchParams }: { searchParams: { error?: string } }) {
  const operator = await requireOperator();
  const plans = await listPrepaidPlans(db, operator.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Add customer</h1>
      {searchParams.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{searchParams.error}</div>
      )}
      <form action={createCustomerAction} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input name="name" required className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone (any format — assumed Canadian if no country code)
          <input name="phoneE164" required className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Address
          <input name="address" className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Food notes
          <input name="foodNotes" placeholder="less spicy, no onion" className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Billing
          <select name="billingMode" className="rounded-md border border-gray-300 px-3 py-2">
            <option value="billed_arrears">Billed (tab)</option>
            <option value="prepaid">Prepaid</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prepaid plan (if prepaid)
          <select name="prepaidPlanId" className="rounded-md border border-gray-300 px-3 py-2">
            <option value="">—</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="mt-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">
          Save
        </button>
      </form>
    </div>
  );
}
