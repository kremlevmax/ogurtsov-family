"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInLoungeMemberAction, type LoungeAuthState } from "@/server/actions/lounge-auth";

const initialState: LoungeAuthState = { error: null };

export interface LoungeLoginFormProps {
  /** Where to send the member after a successful sign-in — e.g. back to /tree/add. */
  next?: string;
}

export function LoungeLoginForm({ next }: LoungeLoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInLoungeMemberAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Пароль
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}
