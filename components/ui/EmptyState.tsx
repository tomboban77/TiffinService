import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center">
      {/* accent-500 measured 2.06:1 on white, below the 3:1 AA floor for a meaningful icon; accent-600 clears it (~3.1-3.2:1). */}
      <Icon className="h-8 w-8 text-accent-600" aria-hidden="true" />
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
