import type { ReactNode } from "react";

export type BadgeVariant = "pending" | "delivered" | "failed" | "paused" | "neutral";

const variants: Record<BadgeVariant, string> = {
  pending: "bg-brass-50 text-ink-muted",
  delivered: "bg-success-100 text-success-700",
  failed: "bg-danger-100 text-danger-700",
  paused: "bg-accent-100 text-accent-700",
  neutral: "bg-brass-50 text-ink-muted",
};

export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant]}`}>{children}</span>;
}
