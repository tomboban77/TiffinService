import { LogOut } from "lucide-react";
import { requireOperator } from "../../lib/auth";
import { signOut } from "../login/actions";
import { KettleMark, SubmitButton } from "../../components/ui";
import { DashboardNav } from "./DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const operator = await requireOperator();

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700">
              <KettleMark className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="font-serif text-base font-semibold text-ink">Kettle</div>
              <div className="text-xs text-ink-subtle">{operator.businessName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <DashboardNav />
            <form action={signOut}>
              <SubmitButton variant="ghost" size="sm" aria-label="Sign out">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
