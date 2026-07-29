export function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-control bg-accent-50 px-4 py-3">
      <div className="text-stat text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink-muted">{label}</div>
    </div>
  );
}
