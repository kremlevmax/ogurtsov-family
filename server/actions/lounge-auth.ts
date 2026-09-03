"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loungeRegisterSchema, loungeSignInSchema } from "@/lib/validation/lounge";

export interface LoungeAuthState {
  error: string | null;
  info?: string | null;
}

/**
 * Only ever redirect to a same-site path (never an absolute/external
 * URL from an untrusted "next" param). Falls back to the homepage —
 * not /lounge — when there's no explicit "next" (owner's request: a
 * plain login/registration from the header should land on the main
 * title page; /tree/add's own redirect still passes its own "next" and
 * returns there as before).
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

/**
 * Registration for "Семейная гостиная" — a deliberate, owner-approved
 * departure from CLAUDE.md's "no public registration" MVP default
 * (docs/DECISIONS.md). Gated by a shared invite code that lives only in
 * a server-only env var (LOUNGE_INVITE_CODE, .env.example) — never sent
 * to the client, never stored in the database.
 */
export async function registerLoungeMemberAction(
  _prevState: LoungeAuthState,
  formData: FormData,
): Promise<LoungeAuthState> {
  const parsed = loungeRegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    inviteCode: formData.get("inviteCode"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }

  const expectedCode = process.env.LOUNGE_INVITE_CODE;
  if (!expectedCode || parsed.data.inviteCode !== expectedCode) {
    return { error: "Неверный код приглашения." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Read by handle_new_lounge_member() (0009_lounge_member_names.sql)
    // to create the lounge_profiles row.
    options: { data: { lounge_first_name: parsed.data.firstName, lounge_last_name: parsed.data.lastName } },
  });

  if (error) {
    console.error(error);
    if (error.code === "user_already_exists") {
      return { error: "Такой email уже зарегистрирован. Попробуйте войти." };
    }
    return { error: "Не удалось зарегистрироваться. Попробуйте ещё раз." };
  }

  if (!data.session) {
    return { error: null, info: "Проверьте почту и подтвердите email, затем войдите." };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signInLoungeMemberAction(
  _prevState: LoungeAuthState,
  formData: FormData,
): Promise<LoungeAuthState> {
  const parsed = loungeSignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Проверьте правильность email и пароля" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Неверный email или пароль" };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOutLoungeMemberAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
