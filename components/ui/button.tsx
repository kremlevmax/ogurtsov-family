import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-(--color-accent) text-(--color-accent-fg) hover:opacity-90",
  secondary:
    "bg-(--color-bg-elevated) text-(--color-fg) border border-(--color-border) hover:bg-(--color-bg)",
  ghost: "text-(--color-fg) hover:bg-(--color-bg-elevated)",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "text-label inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
});
