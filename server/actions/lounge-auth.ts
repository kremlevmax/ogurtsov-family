"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loungeRegisterSchema } from "@/lib/validation/lounge";
import { safeNextPath } from "@/lib/utils/safe-next-path";

export interface LoungeAuthState {
  error: string | null;
  /** `checkSpam` — only the "confirm your email" branch needs the spam-folder reminder (LoungeRegisterForm renders "спам" in bold there); the instant-login branch below never sets it. */
  info?: { heading: string; lines: string[]; checkSpam?: boolean } | null;
}

/**
 * Turns a GoTrue (Supabase Auth) error code into a Russian message that
 * says why signup actually failed, instead of one generic "не удалось,
 * попробуйте ещё раз" for every case (owner's request — the previous
 * catch-all made even a plain "email already registered" or a rejected
 * weak password look like an unexplained failure). Codes are GoTrue's
 * own (https://supabase.com/docs/guides/auth/debugging/error-codes);
 * an unrecognized one still gets a specific-enough fallback rather than
 * a raw/technical message.
 */
function toRegistrationErrorMessage(code: string | undefined): string {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "Этот email уже зарегистрирован. Попробуйте войти или восстановить доступ.";
    case "weak_password":
      return "Пароль слишком простой для Supabase. Используйте не менее 8 символов, желательно с цифрами.";
    case "email_address_invalid":
    case "validation_failed":
      return "Такой email не получится использовать — проверьте, нет ли опечатки.";
    case "email_address_not_authorized":
      return "Этот email не может зарегистрироваться на сайте. Напишите владельцу сайта.";
    case "signup_disabled":
      return "Регистрация сейчас отключена на сервере. Напишите владельцу сайта.";
    case "over_email_send_rate_limit":
      return "Слишком много попыток за короткое время. Подождите несколько минут и попробуйте снова.";
    case "over_request_rate_limit":
      return "Слишком много попыток. Подождите немного и попробуйте снова.";
    default:
      return "Не удалось создать аккаунт — сервер входа ответил ошибкой. Попробуйте ещё раз или напишите владельцу сайта.";
  }
}

/**
 * Registration for "Семейная гостиная" — a deliberate, owner-approved
 * departure from CLAUDE.md's "no public registration" MVP default
 * (docs/DECISIONS.md). Open to anyone, no invite code (removed
 * 2026-09-18 per owner decision, docs/DECISIONS.md) — a new member
 * starts as a plain "Гость": can post in the lounge right away, but has
 * no tree-editing rights until they separately request and an editor
 * grants "подтверждение родства" (server/actions/tree-access-request.ts).
 */
export async function registerLoungeMemberAction(
  _prevState: LoungeAuthState,
  formData: FormData,
): Promise<LoungeAuthState> {
  const parsed = loungeRegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    agreedToRules: formData.get("agreedToRules") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Read by handle_new_lounge_member() (0023_tree_access_self_service.sql)
    // to create the lounge_profiles row. Tree access is granted later,
    // never at signup.
    options: {
      data: {
        lounge_first_name: parsed.data.firstName,
        lounge_last_name: parsed.data.lastName,
      },
    },
  });

  if (error) {
    console.error(error);
    return { error: toRegistrationErrorMessage(error.code) };
  }

  // Supabase's anti-enumeration behavior: re-signing up an email that
  // already has an account returns no error at all (to avoid revealing
  // which emails are registered) — just a user object with an empty
  // identities array instead of a new identity, and no session.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Этот email уже зарегистрирован. Попробуйте войти или восстановить доступ." };
  }

  if (!data.session) {
    return {
      error: null,
      info: {
        heading: "Подтвердите email",
        lines: ["Проверьте почту и подтвердите email, затем войдите."],
        checkSpam: true,
      },
    };
  }

  // Modal mode (components/auth/auth-modal-context.tsx): stay put
  // instead of redirecting — same reasoning as signInAction. Reachable
  // only if Supabase's email confirmation requirement is off; normally
  // the branch above already returned.
  if (formData.get("modal") === "1") {
    return { error: null, info: { heading: "Добро пожаловать!", lines: ["Вы зарегистрированы и вошли."] } };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOutLoungeMemberAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
