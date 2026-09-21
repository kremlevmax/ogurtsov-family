"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthModalHost } from "@/components/auth/auth-modal-host";

export type AuthModalBaseView = "login" | "register" | "forgot-password" | "join";
export type AuthModalOverlayView = "rules" | "privacy";

interface AuthModalContextValue {
  openLogin: () => void;
  openRegister: () => void;
  openForgotPassword: () => void;
  openJoin: () => void;
  openRules: () => void;
  openPrivacy: () => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

/**
 * RegistrationProject v1.0: every registration/login/password/relation
 * screen "открывается во всплывающем модальном окне поверх текущей
 * страницы... переход на отдельную страницу не используется". This
 * provider wraps the whole site (app/layout.tsx), so any client
 * component anywhere — Header, homepage CTA, lounge gates, the plain
 * /login and /register pages' own forms — can call useAuthModal()
 * without special-casing "is a provider even mounted here". The
 * standalone pages (/login, /register, /forgot-password, /join,
 * /rules, /privacy) still exist unchanged — for direct links (emails,
 * search engines for /rules and /privacy) and as a fallback wherever a
 * trigger hasn't been converted to open the modal.
 *
 * The actual modal markup lives in auth-modal-host.tsx, a separate
 * file, purely to avoid a circular import: the host needs to import
 * LoginForm/LoungeRegisterForm/etc., and those forms need to import
 * useAuthModal from *this* file.
 *
 * `rules`/`privacy` opened from inside the register modal's checkbox
 * links are a genuinely separate `overlay` slot, not a swap of the
 * same `base` state — swapping the view used to unmount the register
 * form while Rules was open and remount a blank one on return, wiping
 * whatever the visitor had already typed. Keeping `base` untouched and
 * stacking `overlay` on top (AuthModalHost renders it after, so it
 * paints over the base modal — Modal's own `active` prop suspends the
 * base modal's Escape/Tab handling while something sits on top of it)
 * means the base form never unmounts.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [base, setBase] = useState<AuthModalBaseView | null>(null);
  const [overlay, setOverlay] = useState<AuthModalOverlayView | null>(null);

  const open = useCallback((next: AuthModalBaseView) => {
    setBase(next);
    setOverlay(null);
  }, []);
  const close = useCallback(() => {
    setBase(null);
    setOverlay(null);
  }, []);
  const dismissOverlay = useCallback(() => setOverlay(null), []);

  const value: AuthModalContextValue = {
    openLogin: () => open("login"),
    openRegister: () => open("register"),
    openForgotPassword: () => open("forgot-password"),
    openJoin: () => open("join"),
    openRules: () => setOverlay("rules"),
    openPrivacy: () => setOverlay("privacy"),
    close,
  };

  function handleLoginSuccess() {
    close();
    router.refresh();
  }

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModalHost
        base={base}
        overlay={overlay}
        onDismissBase={close}
        onDismissOverlay={dismissOverlay}
        onLoginSuccess={handleLoginSuccess}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
