"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInAction, type SignInState } from "@/server/actions/auth";

const initialState: SignInState = { error: null };

export interface LoginFormProps {
  /** Where to send the viewer after a successful sign-in — e.g. back to /tree/add or /lounge. Falls back to /edit (editors) or the homepage (server/actions/auth.ts). */
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-lg font-medium">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="text-lg" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-lg font-medium">
          Пароль
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="text-lg" />
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
  );
}
