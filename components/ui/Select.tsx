import type { SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function Select({ label, error, id, className = "", children, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <label htmlFor={selectId} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <select
        id={selectId}
        aria-invalid={!!error}
        className={`min-h-[44px] rounded-control border bg-surface px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent-500 ${
          error ? "border-danger-600" : "border-line"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs font-medium text-danger-600">{error}</span>}
    </label>
  );
}
