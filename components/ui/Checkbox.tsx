import type { InputHTMLAttributes } from "react";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, id, className = "", ...props }: CheckboxProps) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        id={inputId}
        type="checkbox"
        className={`h-5 w-5 shrink-0 rounded border-line text-accent-600 focus:ring-2 focus:ring-accent-500 ${className}`}
        {...props}
      />
      {label}
    </label>
  );
}
