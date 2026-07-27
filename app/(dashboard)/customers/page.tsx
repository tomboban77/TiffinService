import Link from "next/link";
import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { listCustomers } from "../../../lib/repo/customers";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const operator = await requireOperator();
  const all = await listCustomers(db, operator.id);
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q) || c.phoneE164.includes(q)) : all;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Customers</h1>
        <Link href="/customers/new" className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white">
          Add
        </Link>
      </div>

      <form className="flex">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search name or phone"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </form>

      <ul className="flex flex-col gap-2">
        {filtered.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">{c.phoneE164}</div>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                {c.billingMode === "prepaid" ? `${c.pointsBalance} pts` : "Tab"}
              </span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && <p className="text-sm text-gray-500">No customers yet.</p>}
      </ul>
    </div>
  );
}
