"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/safe-next-path";

const credentialsSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export interface SignInState {
  error: string | null;
}

/**
 * One unified sign-in for the whole site (owner's request, 2026-09-04:
 * a single /login for both the two editors and lounge members — there
 * was never a real reason for two near-identical
 * `signInWithPassword` calls behind two different forms/URLs, since
 * it's the same Supabase Auth session either way; only what a signed-in
 * user is *allowed to do* differs, and that's already enforced
 * server-side per action, not by which login page they used).
 *
 * With no explicit "next" (a plain header/nav login), an editor lands
 * on `/edit`, matching the old editor-only login's behavior; anyone
 * else lands on the homepage, matching the old lounge login's
 * behavior. An explicit "next" (e.g. "войдите, чтобы ответить" from
 * the lounge, or `/tree/add`) always wins over that default.
 */
export async function signInAction(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Проверьте правильность email и пароля" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Неверный email или пароль" };
  }

  const next = formData.get("next");
  if (typeof next === "string" && next !== "") {
    redirect(safeNextPath(next));
  }

  const { data: editor } = await supabase.from("editors").select("user_id").eq("user_id", data.user.id).maybeSingle();
  redirect(editor ? "/edit" : "/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const emailOnlySchema = z.object({ email: z.email("Введите корректный email") });

export interface RequestPasswordResetState {
  info: string | null;
  error: string | null;
}

/**
 * Always returns the same neutral message regardless of whether the
 * email is actually registered — otherwise this form would let anyone
 * check which emails have an account (same anti-enumeration posture as
 * the duplicate-registration check in server/actions/lounge-auth.ts).
 * The reset link Supabase emails lands on /reset-password
 * (components/auth/reset-password-form.tsx), which listens for the
 * PASSWORD_RECOVERY auth event and lets the visitor set a new password
 * directly — no separate server round-trip needed for that step.
 */
export async function requestPasswordResetAction(
  _prevState: RequestPasswordResetState,
  formData: FormData,
): Promise<RequestPasswordResetState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  const info = "Если такой email зарегистрирован, на него отправлено письмо со ссылкой для восстановления пароля.";

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Введите email", info: null };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/reset-password`,
  });
  if (error) console.error(error);

  return { error: null, info };
}
