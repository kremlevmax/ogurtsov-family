"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Generic modal shell for auth/legal popups (RegistrationProject v1.0:
 * every registration screen "открывается во всплывающем модальном окне
 * поверх текущей страницы"). Same focus-trap/Escape/portal pattern as
 * components/media/photo-lightbox.tsx, but a light card on a dim
 * backdrop instead of a full-bleed dark viewer, and closable by
 * clicking the backdrop (the lightbox doesn't allow that, since a
 * misclick there is more costly mid-gallery).
 */
export function Modal({ onClose, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previouslyFocusedRef.current instanceof HTMLElement) previouslyFocusedRef.current.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={cn("relative my-8 w-full max-w-sm focus:outline-none", className)}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute -top-3 -right-3 z-10 cursor-pointer rounded-full border border-(--color-border) bg-(--color-bg-elevated) p-1.5 shadow-(--shadow-md) hover:bg-(--color-bg)"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
