"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./buttonStyles";
import type { ButtonHTMLAttributes } from "react";

export interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pendingLabel?: string;
}

/** A submit button that shows a spinner while its parent <form>'s action is in flight — no silent saves. */
export function SubmitButton({ variant = "primary", size = "default", className = "", children, pendingLabel, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClassName(variant, size, className)} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
