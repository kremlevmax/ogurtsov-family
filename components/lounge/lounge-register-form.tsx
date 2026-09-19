"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { registerLoungeMemberAction, type LoungeAuthState } from "@/server/actions/lounge-auth";
import { useAuthModal } from "@/components/auth/auth-modal-context";

const initialState: LoungeAuthState = { error: null };

export interface LoungeRegisterFormProps {
  /** Where to send the new member after registration — e.g. back to /tree/add. Ignored in modal mode. */
  next?: string;
  /** "page" (default) or "modal" — see login-form.tsx's doc comment for the pattern. */
  mode?: "page" | "modal";
}

export function LoungeRegisterForm({ next, mode = "page" }: LoungeRegisterFormProps) {
  const [state, formAction, isPending] = useActionState(registerLoungeMemberAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const isModal = mode === "modal";
  const { openLogin, openRules, openPrivacy, openJoin } = useAuthModal();

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
        {isModal && (
          <Button type="button" onClick={openJoin} className="mt-2 text-base">
            Присоединиться к проекту
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
      <Ornament className="h-3 w-24 text-(--color-border)" />
      <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Добро пожаловать!</h1>
      <form action={formAction} className="flex w-full flex-col gap-3">
        {isModal ? <input type="hidden" name="modal" value="1" /> : next && <input type="hidden" name="next" value={next} />}
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
          <label htmlFor="confirmPassword" className="text-lg font-medium">
            Повторите пароль
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="text-lg"
          />
        </div>

        <label className="flex items-start gap-2 text-base text-(--color-fg-muted)">
          <input type="checkbox" name="agreedToRules" required className="mt-1 h-4 w-4" />
          <span>
            Я ознакомился(ась) и принимаю{" "}
            {isModal ? (
              <button type="button" onClick={openRules} className="underline">
                Правила сайта
              </button>
            ) : (
              <Link href="/rules" target="_blank" className="underline">
                Правила сайта
              </Link>
            )}{" "}
            и{" "}
            {isModal ? (
              <button type="button" onClick={openPrivacy} className="underline">
                Политику конфиденциальности
              </button>
            ) : (
              <Link href="/privacy" target="_blank" className="underline">
                Политику конфиденциальности
              </Link>
            )}
            .
          </span>
        </label>

        {state.error && (
          <p role="alert" className="text-lg text-(--color-danger)">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="text-base">
          {isPending ? "Регистрируем…" : "Зарегистрироваться"}
        </Button>
      </form>

      {isModal ? (
        <button type="button" onClick={openLogin} className="text-center text-lg text-(--color-fg-muted) hover:underline">
          Уже есть аккаунт? Войти
        </button>
      ) : (
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-center text-lg text-(--color-fg-muted) hover:underline"
        >
          Уже есть аккаунт? Войти
        </Link>
      )}
    </div>
  );
}
