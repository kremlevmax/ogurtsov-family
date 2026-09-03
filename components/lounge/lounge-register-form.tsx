"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerLoungeMemberAction, type LoungeAuthState } from "@/server/actions/lounge-auth";

const initialState: LoungeAuthState = { error: null };

export interface LoungeRegisterFormProps {
  /** Where to send the new member after registration — e.g. back to /tree/add. */
  next?: string;
}

export function LoungeRegisterForm({ next }: LoungeRegisterFormProps) {
  const [state, formAction, isPending] = useActionState(registerLoungeMemberAction, initialState);

  if (state.info) {
    return (
      <p role="status" className="text-sm text-(--color-fg)">
        {state.info}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="firstName" className="text-sm font-medium">
          Имя
        </label>
        <Input id="firstName" name="firstName" type="text" autoComplete="given-name" required maxLength={80} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="lastName" className="text-sm font-medium">
          Фамилия
        </label>
        <Input id="lastName" name="lastName" type="text" autoComplete="family-name" required maxLength={80} />
      </div>
      <p className="-mt-2 text-xs text-(--color-fg-muted)">Имя и фамилия видны всем в гостиной.</p>

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
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="inviteCode" className="text-sm font-medium">
          Код приглашения
        </label>
        <Input id="inviteCode" name="inviteCode" type="text" autoComplete="off" required />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Регистрируем…" : "Зарегистрироваться"}
      </Button>
    </form>
  );
}
