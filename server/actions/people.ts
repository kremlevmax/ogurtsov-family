"use server";

import { revalidatePath } from "next/cache";
import { personFormSchema, type PersonFormInput } from "@/lib/validation/person";
import { requireEditor } from "@/server/auth/require-editor";
import { requireLoungeMember } from "@/server/auth/require-lounge-member";
import * as peopleRepo from "@/server/repositories/people";
import { toUserMessage } from "./errors";

export interface PersonActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof PersonFormInput, string[]>>;
  personId?: string;
}

/**
 * Any registered site member can add a person and edit/delete the ones
 * they added — not just the two editors (owner's explicit decision,
 * docs/DECISIONS.md). `requireLoungeMember()` only confirms there's a
 * registered account; RLS on `people` (0008_add_tree_contributions.sql)
 * is what actually restricts edit/delete to a member's own rows, same
 * as CLAUDE.md 13's "never just one gate" for every other write path
 * here.
 */
export async function createPersonAction(input: unknown): Promise<PersonActionState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти, чтобы добавить человека." };
  }

  const parsed = personFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const personId = await peopleRepo.createPerson(member.supabase, parsed.data, member.userId);
    revalidatePath("/tree");
    revalidatePath(`/people/${personId}`);
    revalidatePath("/edit");
    return { ok: true, personId };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить человека. Попробуйте ещё раз.") };
  }
}

export async function updatePersonAction(personId: string, input: unknown): Promise<PersonActionState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти, чтобы изменить человека." };
  }

  const parsed = personFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await peopleRepo.updatePerson(member.supabase, personId, parsed.data, member.userId);
    revalidatePath("/tree");
    revalidatePath(`/people/${personId}`);
    return { ok: true, personId };
  } catch (error) {
    return {
      ok: false,
      error: toUserMessage(error, "Не удалось сохранить изменения. Изменять можно только добавленных вами людей."),
    };
  }
}

export interface DeletePersonState {
  ok: boolean;
  error?: string;
}

export async function softDeletePersonAction(personId: string): Promise<DeletePersonState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти, чтобы удалить человека." };
  }

  try {
    await peopleRepo.softDeletePerson(member.supabase, personId, member.userId);
    revalidatePath("/tree");
    revalidatePath(`/people/${personId}`);
    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserMessage(error, "Не удалось удалить человека. Удалять можно только добавленных вами людей."),
    };
  }
}

export async function restorePersonAction(personId: string): Promise<DeletePersonState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await peopleRepo.restorePerson(editor.supabase, personId);
    revalidatePath("/tree");
    revalidatePath(`/people/${personId}`);
    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось восстановить человека. Попробуйте ещё раз.") };
  }
}
