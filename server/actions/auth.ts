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
