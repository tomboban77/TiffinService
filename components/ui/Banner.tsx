import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

export type BannerVariant = "success" | "error" | "info";

const styles: Record<BannerVariant, { wrap: string; icon: ReactNode }> = {
  success: { wrap: "border-success-100 bg-success-50 text-success-700", icon: <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> },
  error: { wrap: "border-danger-100 bg-danger-50 text-danger-700", icon: <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" /> },
  info: { wrap: "border-accent-100 bg-accent-50 text-accent-700", icon: <Info className="h-5 w-5 shrink-0" aria-hidden="true" /> },
};

/** Server-safe inline feedback — no silent saves. Driven by `?success=`/`?error=` query params, so it clears on the next navigation. */
export function Banner({ variant, children }: { variant: BannerVariant; children: ReactNode }) {
  const s = styles[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-control border p-3 text-sm font-medium shadow-soft ${s.wrap}`}>
      {s.icon}
      <div>{children}</div>
    </div>
  );
}
