import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input
        id={inputId}
        aria-invalid={!!error}
        className={`min-h-[44px] rounded-control border px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-500 ${
          error ? "border-danger-600" : "border-line"
        } ${className}`}
        {...props}
      />
      {hint && !error && <span className="text-xs text-ink-muted">{hint}</span>}
      {error && <span className="text-xs font-medium text-danger-600">{error}</span>}
    </label>
  );
}
