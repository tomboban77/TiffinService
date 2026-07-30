import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { db } from "../../../db/client";
import { requireOperator } from "../../../lib/auth";
import { listCustomers } from "../../../lib/repo/customers";
import { Badge, EmptyState, Input, LinkButton, PageHeader } from "../../../components/ui";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const operator = await requireOperator();
  const all = await listCustomers(db, operator.id);
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const filtered = q ? all.filter((c) => c.name.toLowerCase().includes(q) || c.phoneE164.includes(q)) : all;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader
        title="Customers"
        action={
          <LinkButton href="/customers/new" size="sm">
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add
          </LinkButton>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start building standing orders, cook counts, and routes."
          action={
            <LinkButton href="/customers/new">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add a customer
            </LinkButton>
          }
        />
      ) : (
        <>
          <form>
            <Input label="Search" name="q" defaultValue={searchParams.q ?? ""} placeholder="Search name or phone" />
          </form>

          <ul className="flex flex-col gap-2">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 shadow-soft transition-colors hover:border-accent-300"
                >
                  <div>
                    <div className="font-medium text-ink">{c.name}</div>
                    <div className="text-sm text-ink-muted">{c.phoneE164}</div>
                  </div>
                  <Badge>{c.billingMode === "prepaid" ? `${c.pointsBalance} pts` : "Tab"}</Badge>
                </Link>
              </li>
            ))}
            {filtered.length === 0 && <p className="text-sm text-ink-muted">No matches for &ldquo;{searchParams.q}&rdquo;.</p>}
          </ul>
        </>
      )}
    </div>
  );
}
