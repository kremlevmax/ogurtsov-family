"use client";

import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useIsLoggedIn } from "@/lib/hooks/use-is-logged-in";

/**
 * "🌿 Присоединиться к проекту" (RegistrationProject v1.0, Documents/05):
 * opens the registration modal for a new visitor, or straight to
 * "Подтверждение родства" for someone already signed in — either way,
 * no navigation away from the homepage.
 */
export function JoinProjectButton() {
  const isLoggedIn = useIsLoggedIn();
  const { openRegister, openJoin } = useAuthModal();

  return (
    <button
      type="button"
      onClick={isLoggedIn ? openJoin : openRegister}
      className="font-label inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-(--color-accent) px-6 text-[16px] font-bold tracking-[0.065px] text-(--color-accent-fg) uppercase transition-opacity hover:opacity-90"
    >
      Присоединиться к проекту
    </button>
  );
}
