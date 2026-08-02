import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <div className="mt-1.5 text-sm text-ink-muted">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
