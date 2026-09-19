"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { requestPasswordResetAction, type RequestPasswordResetState } from "@/server/actions/auth";
import { useAuthModal } from "@/components/auth/auth-modal-context";

const initialState: RequestPasswordResetState = { info: null, error: null };

export interface ForgotPasswordFormProps {
  /** "page" (default) or "modal" — see login-form.tsx's doc comment for the pattern. */
  mode?: "page" | "modal";
}

export function ForgotPasswordForm({ mode = "page" }: ForgotPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);
  const isModal = mode === "modal";
  const { openLogin } = useAuthModal();

  if (state.info) {
    return (
      <div
        role="status"
        className="flex w-full max-w-sm flex-col gap-2 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-lg text-(--color-fg) shadow-(--shadow-md)"
      >
        <p className="font-heading text-center text-2xl font-bold">Восстановление пароля</p>
        <p className="text-center">{state.info}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Восстановление пароля</h1>
        <p className="text-center text-lg text-(--color-fg-muted)">
          Введите адрес электронной почты, указанный при регистрации. На этот адрес будут отправлены инструкции по
          восстановлению доступа.
        </p>
        <form action={formAction} className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-lg font-medium">
              Email
            </label>
            <Input id="email" name="email" type="email" autoComplete="email" required className="text-lg" />
          </div>

          {state.error && (
            <p role="alert" className="text-lg text-(--color-danger)">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="text-base">
            {isPending ? "Отправляем…" : "Отправить"}
          </Button>
        </form>
      </div>
      {isModal ? (
        <button type="button" onClick={openLogin} className="text-center text-lg text-(--color-fg-muted) hover:underline">
          Вспомнили пароль? Войти
        </button>
      ) : (
        <Link href="/login" className="text-center text-lg text-(--color-fg-muted) hover:underline">
          Вспомнили пароль? Войти
        </Link>
      )}
    </>
  );
}
