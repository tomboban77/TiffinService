"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./buttonStyles";
import type { ButtonHTMLAttributes } from "react";

export interface ConfirmSubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shown in a native confirm() before the form is allowed to submit. */
  confirmMessage: string;
}

/** A submit button for destructive actions (deactivate, close a day) — confirms before submitting, then shows a pending spinner. */
export function ConfirmSubmitButton({
  variant = "destructive",
  size = "default",
  className = "",
  confirmMessage,
  children,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClassName(variant, size, className)}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
