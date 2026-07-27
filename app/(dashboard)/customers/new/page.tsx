import { db } from "../../../../db/client";
import { requireOperator } from "../../../../lib/auth";
import { listPrepaidPlans } from "../../../../lib/repo/prepaidPlans";
import { createCustomerAction } from "./actions";

export default async function NewCustomerPage() {
  const operator = await requireOperator();
  const plans = await listPrepaidPlans(db, operator.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Add customer</h1>
      <form action={createCustomerAction} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input name="name" required className="rounded-md border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone (E.164, e.g. +14165551234)
          <input name="phoneE164" required pattern="\+[1-9]\d{6,14}" className="rounded-md border border-gray-300 px-3 py-2" />
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
