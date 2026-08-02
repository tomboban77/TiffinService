export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "default" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white shadow-soft hover:bg-ink/90 active:bg-ink/80",
  secondary: "border border-line-strong bg-surface text-ink shadow-soft hover:bg-paper active:bg-accent-50",
  destructive: "bg-danger-600 text-white hover:bg-danger-700 active:bg-red-800",
  ghost: "text-ink-muted hover:bg-accent-50 hover:text-ink",
};

// Every size clears the 44px touch-target minimum — "sm" trims horizontal
// padding and font size for dense inline rows, never the tappable height.
const sizes: Record<ButtonSize, string> = {
  default: "min-h-[44px] px-4 text-sm",
  sm: "min-h-[44px] px-3 text-xs",
};

export function buttonClassName(variant: ButtonVariant = "primary", size: ButtonSize = "default", className = "") {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}
