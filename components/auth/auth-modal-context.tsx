"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AuthModalHost } from "@/components/auth/auth-modal-host";

export type AuthModalView = "login" | "register" | "forgot-password" | "join" | "rules" | "privacy";

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
 * links "stack" one level deep (`returnTo`) — closing them returns to
 * the register modal instead of closing everything, matching "не
 * закрывая форму регистрации" (RegistrationProject v1.0, Documents/02).
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [view, setView] = useState<AuthModalView | null>(null);
  const [, setReturnTo] = useState<AuthModalView | null>(null);

  const open = useCallback((next: AuthModalView) => {
    setReturnTo(null);
    setView(next);
  }, []);
  const openNested = useCallback(
    (next: AuthModalView) => {
      setReturnTo((current) => current ?? view);
      setView(next);
    },
    [view],
  );
  const close = useCallback(() => {
    setView(null);
    setReturnTo(null);
  }, []);
  const dismiss = useCallback(() => {
    setReturnTo((currentReturnTo) => {
      setView(currentReturnTo ?? null);
      return null;
    });
  }, []);

  const value: AuthModalContextValue = {
    openLogin: () => open("login"),
    openRegister: () => open("register"),
    openForgotPassword: () => open("forgot-password"),
    openJoin: () => open("join"),
    openRules: () => openNested("rules"),
    openPrivacy: () => openNested("privacy"),
    close,
  };

  function handleLoginSuccess() {
    close();
    router.refresh();
  }

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModalHost view={view} onDismiss={dismiss} onLoginSuccess={handleLoginSuccess} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
