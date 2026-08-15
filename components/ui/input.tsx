import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 text-sm text-(--color-fg) placeholder:text-(--color-fg-muted) focus-visible:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);
