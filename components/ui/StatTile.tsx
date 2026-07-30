export function StatTile({ value, label }: { value: number | string; label: string }) {
  // role="group" + aria-label ties the numeral and its label together as one
  // unit for assistive tech (rather than two adjacent, disconnected text
  // nodes) — and doubles as a stable selector hook that doesn't couple to
  // Tailwind class names the way a raw CSS selector would.
  return (
    <div role="group" aria-label={`${value} ${label}`} className="rounded-control bg-accent-50 px-4 py-3">
      <div className="text-stat text-ink tabular-nums" aria-hidden="true">
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-ink-muted" aria-hidden="true">
        {label}
      </div>
    </div>
  );
}
