"use client";

import { useActionState, useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);

  if (state.info) {
    return (
      <p role="status" className="text-lg text-(--color-fg)">
        {state.info}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1">
        <label htmlFor="firstName" className="text-lg font-medium">
          Имя
        </label>
        <Input
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          maxLength={80}
          className="text-lg"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="lastName" className="text-lg font-medium">
          Фамилия
        </label>
        <Input
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          required
          maxLength={80}
          className="text-lg"
        />
      </div>
      <p className="-mt-2 text-base text-(--color-fg-muted)">Имя и фамилия видны всем в гостиной.</p>

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
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
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

      <div className="flex flex-col gap-1">
        <label htmlFor="inviteCode" className="text-lg font-medium">
          Код приглашения
        </label>
        <Input id="inviteCode" name="inviteCode" type="text" autoComplete="off" required className="text-lg" />
      </div>

      {state.error && (
        <p role="alert" className="text-lg text-(--color-danger)">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="text-base">
        {isPending ? "Регистрируем…" : "Зарегистрироваться"}
      </Button>
    </form>
  );
}
