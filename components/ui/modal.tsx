"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /**
   * False when another Modal is stacked on top of this one (e.g. Rules
   * opened from inside Register — auth-modal-context.tsx keeps the
   * base modal mounted, not unmounted, so its form state survives).
   * An inactive modal stays visible underneath but stops responding to
   * Escape/Tab itself — the overlay on top, being another `fixed
   * inset-0` layer later in the DOM, already physically covers its
   * backdrop, so clicks can't reach it either.
   */
  active?: boolean;
  /** Higher for a modal stacked on top of another (e.g. Rules over Register) — guards the stacking order even if portal DOM-append order ever changed, not just relying on later-in-body winning ties. */
  zIndex?: 70 | 80;
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
export function Modal({ onClose, children, className, active = true, zIndex = 70 }: ModalProps) {
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
    if (!active) return;
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
  }, [onClose, active]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 overflow-y-auto bg-black/50", zIndex === 80 ? "z-[80]" : "z-[70]")}
      onClick={active ? onClose : undefined}
      inert={!active}
    >
      {/* min-h-full + items-center centers short content vertically, same as before — but
          unlike a fixed items-center on the outer div, this wrapper's height grows past
          min-h-full for content taller than the viewport, so centering has no extra space
          left to push the top (and the close button) off-screen; it just sits flush against
          this padding, scrollable via the outer div. */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className={cn("relative w-full max-w-sm focus:outline-none", className)}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute top-3 right-3 z-10 cursor-pointer rounded-full border border-(--color-border) bg-(--color-bg-elevated) p-1.5 shadow-(--shadow-md) hover:bg-(--color-bg)"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
