"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { signInAction, type SignInState } from "@/server/actions/auth";
import { useAuthModal } from "@/components/auth/auth-modal-context";

const initialState: SignInState = { error: null };

export interface LoginFormProps {
  /** Where to send the viewer after a successful sign-in — e.g. back to /tree/add or /lounge. Falls back to /edit (editors) or the homepage (server/actions/auth.ts). Ignored in modal mode. */
  next?: string;
  /** "page" (default): a normal page, submitting redirects on success. "modal": no redirect — calls onSuccess so the host can close the modal and refresh (RegistrationProject v1.0, Documents/03). */
  mode?: "page" | "modal";
  onSuccess?: () => void;
}

/**
 * AuthModalProvider (components/auth/auth-modal-context.tsx) wraps the
 * whole site from the root layout, so useAuthModal() is always safe to
 * call here — even when this form renders on the plain /login page,
 * not inside an open modal. `mode` picks whether its "Забыли
 * пароль?"/"Нет учётной записи?" links open the sibling modals or
 * navigate to their standalone pages.
 */
export function LoginForm({ next, mode = "page", onSuccess }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  // Controlled so a failed login (wrong password) doesn't also wipe the
  // email the visitor already typed — React resets every uncontrolled
  // field in a <form action={...}> once the action settles, error or
  // not (docs/DECISIONS.md, lounge-register-form.tsx fix).
  const [email, setEmail] = useState("");
  const isModal = mode === "modal";
  const { openForgotPassword, openRegister } = useAuthModal();

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
      <Ornament className="h-3 w-24 text-(--color-border)" />
      <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Вход на сайт</h1>
      <form action={formAction} className="flex w-full flex-col gap-3">
        {isModal ? <input type="hidden" name="modal" value="1" /> : next && <input type="hidden" name="next" value={next} />}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-lg font-medium">
            Электронная почта
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="text-lg"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-lg font-medium">
            Пароль
          </label>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="text-lg"
          />
          <label className="mt-1 flex items-center gap-2 text-base text-(--color-fg-muted)">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="h-4 w-4"
            />
            Показать пароль
          </label>
        </div>

        {state.error && (
          <p role="alert" className="text-lg text-(--color-danger)">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="text-base">
          {isPending ? "Входим…" : "Войти"}
        </Button>
      </form>

      {isModal ? (
        <button type="button" onClick={openForgotPassword} className="text-center text-lg text-(--color-fg-muted) hover:underline">
          Забыли пароль?
        </button>
      ) : (
        <Link href="/forgot-password" className="text-center text-lg text-(--color-fg-muted) hover:underline">
          Забыли пароль?
        </Link>
      )}
      {isModal ? (
        <button type="button" onClick={openRegister} className="text-center text-lg text-(--color-fg-muted) hover:underline">
          Нет учётной записи? Зарегистрироваться
        </button>
      ) : (
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="text-center text-lg text-(--color-fg-muted) hover:underline"
        >
          Нет учётной записи? Зарегистрироваться
        </Link>
      )}
    </div>
  );
}
