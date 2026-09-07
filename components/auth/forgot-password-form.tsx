"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { requestPasswordResetAction, type RequestPasswordResetState } from "@/server/actions/auth";

const initialState: RequestPasswordResetState = { info: null, error: null };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  if (state.info) {
    return (
      <p
        role="status"
        className="w-full max-w-sm rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center text-lg text-(--color-fg) shadow-(--shadow-md)"
      >
        {state.info}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
      <Ornament className="h-3 w-24 text-(--color-border)" />
      <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Восстановление пароля</h1>
      <p className="text-center text-lg text-(--color-fg-muted)">
        Укажите email, указанный при регистрации — пришлём ссылку для сброса пароля.
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
          {isPending ? "Отправляем…" : "Отправить ссылку для восстановления"}
        </Button>
      </form>
    </div>
  );
}
