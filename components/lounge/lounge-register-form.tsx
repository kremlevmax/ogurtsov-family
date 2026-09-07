"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { registerLoungeMemberAction, type LoungeAuthState } from "@/server/actions/lounge-auth";

const initialState: LoungeAuthState = { error: null };

export interface LoungeRegisterFormProps {
  /** Where to send the new member after registration — e.g. back to /tree/add. */
  next?: string;
}

export function LoungeRegisterForm({ next }: LoungeRegisterFormProps) {
  const [state, formAction, isPending] = useActionState(registerLoungeMemberAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [noInviteCode, setNoInviteCode] = useState(false);

  if (state.info) {
    return (
      <div
        role="status"
        className="flex w-full max-w-sm flex-col gap-2 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-lg text-(--color-fg) shadow-(--shadow-md)"
      >
        <p className="font-heading text-center text-2xl font-bold">{state.info.heading}</p>
        {state.info.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
      <Ornament className="h-3 w-24 text-(--color-border)" />
      <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Регистрация в гостиной</h1>
      <p className="text-center text-lg text-(--color-fg-muted)">Код приглашения можно узнать у владельца сайта.</p>
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

        <label className="flex items-center gap-2 text-base text-(--color-fg-muted)">
          <input
            type="checkbox"
            name="noInviteCode"
            checked={noInviteCode}
            onChange={(event) => setNoInviteCode(event.target.checked)}
            className="h-4 w-4"
          />
          У меня нет кода приглашения
        </label>

        {noInviteCode ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="relationNote" className="text-lg font-medium">
              Как вы связаны с родом Огурцовых?
            </label>
            <textarea
              id="relationNote"
              name="relationNote"
              required
              minLength={20}
              maxLength={2000}
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-lg text-(--color-fg) placeholder:text-(--color-fg-muted) focus-visible:outline-none"
              placeholder="Например: я внук(а) такого-то, ищу родственников со стороны..."
            />
            <p className="text-base text-(--color-fg-muted)">
              Вы сразу сможете писать в гостиной. Добавление людей в дерево откроется после проверки редактором.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="inviteCode" className="text-lg font-medium">
              Код приглашения
            </label>
            <Input id="inviteCode" name="inviteCode" type="text" autoComplete="off" required className="text-lg" />
          </div>
        )}

        {state.error && (
          <p role="alert" className="text-lg text-(--color-danger)">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="text-base">
          {isPending ? "Регистрируем…" : "Зарегистрироваться"}
        </Button>
      </form>
    </div>
  );
}
