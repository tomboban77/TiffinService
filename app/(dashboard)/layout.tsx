import Link from "next/link";
import { requireOperator } from "../../lib/auth";
import { signOut } from "../login/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const operator = await requireOperator();

  return (
    <div className="min-h-screen pb-16">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="text-sm font-medium">{operator.businessName}</span>
        <form action={signOut}>
          <button className="text-sm text-gray-500 underline">Sign out</button>
        </form>
      </header>

      <main className="px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white">
        {[
          { href: "/today", label: "Today" },
          { href: "/customers", label: "Customers" },
          { href: "/settings", label: "Settings" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex-1 py-3 text-center text-sm font-medium text-gray-700">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
