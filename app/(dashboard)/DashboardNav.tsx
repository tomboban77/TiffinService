"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Settings as SettingsIcon, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: top nav, inline with the header */}
      <nav className="hidden gap-1 sm:flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={`flex items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
              isActive(pathname, href) ? "bg-accent-50 text-accent-700" : "text-ink-muted hover:bg-paper hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile: fixed bottom tab bar, thumb reach, safe-area aware */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
              isActive(pathname, href) ? "text-accent-700" : "text-ink-muted"
            }`}
          >
            {isActive(pathname, href) && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent-600" />}
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
