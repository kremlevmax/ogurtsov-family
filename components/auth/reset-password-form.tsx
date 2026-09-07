"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * The reset link's GoTrue redirect either carries a recovery code (which
 * createSupabaseBrowserClient() exchanges for a session automatically on
 * init, firing the PASSWORD_RECOVERY auth event — same client instance
 * as components/layout/header.tsx's useIsLoggedIn, so no race between
 * the two) or, if the link was already used/expired, an error in the
 * query string instead. Past this timeout with neither, the link is
 * treated as dead — mirrors server/auth/require-editor.ts's
 * EDITOR_SESSION_TIMEOUT_MS pattern (don't spin forever).
 */
const RECOVERY_WAIT_TIMEOUT_MS = 6000;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error_description") || searchParams.get("error");

  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (linkError) return;

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    const timeout = setTimeout(() => setTimedOut(true), RECOVERY_WAIT_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [linkError]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Минимум 8 символов");
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError("Не удалось изменить пароль. Возможно, ссылка устарела — запросите новую.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-center text-lg text-(--color-fg)">
        Пароль изменён.{" "}
        <Link href="/login" className="underline">
          Войти
        </Link>
      </p>
    );
  }

  if (linkError || timedOut) {
    return (
      <p className="text-center text-lg text-(--color-fg)">
        Ссылка недействительна или устарела.{" "}
        <Link href="/forgot-password" className="underline">
          Запросить новую
        </Link>
      </p>
    );
  }

  if (!ready) {
    return <p className="text-center text-lg text-(--color-fg-muted)">Проверяем ссылку восстановления…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-lg font-medium">
          Новый пароль
        </label>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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

      {error && (
        <p role="alert" className="text-lg text-(--color-danger)">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="text-base">
        {isSubmitting ? "Сохраняем…" : "Сохранить новый пароль"}
      </Button>
    </form>
  );
}
