"use server";

import { revalidatePath } from "next/cache";
import { personFormSchema, type PersonFormInput } from "@/lib/validation/person";
import { requireEditor } from "@/server/auth/require-editor";
import * as peopleRepo from "@/server/repositories/people";
import { toUserMessage } from "./errors";

export interface PersonActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof PersonFormInput, string[]>>;
  personId?: string;
}

export async function createPersonAction(input: unknown): Promise<PersonActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  const parsed = personFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const personId = await peopleRepo.createPerson(editor.supabase, parsed.data, editor.editorId);
    revalidatePath("/");
    revalidatePath(`/people/${personId}`);
    revalidatePath("/edit");
    return { ok: true, personId };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить человека. Попробуйте ещё раз.") };
  }
}

export async function updatePersonAction(personId: string, input: unknown): Promise<PersonActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  const parsed = personFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await peopleRepo.updatePerson(editor.supabase, personId, parsed.data, editor.editorId);
    revalidatePath("/");
    revalidatePath(`/people/${personId}`);
    return { ok: true, personId };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить изменения. Попробуйте ещё раз.") };
  }
}

export interface DeletePersonState {
  ok: boolean;
  error?: string;
}

export async function softDeletePersonAction(personId: string): Promise<DeletePersonState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await peopleRepo.softDeletePerson(editor.supabase, personId);
    revalidatePath("/");
    revalidatePath(`/people/${personId}`);
    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось удалить человека. Попробуйте ещё раз.") };
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
    revalidatePath("/");
    revalidatePath(`/people/${personId}`);
    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось восстановить человека. Попробуйте ещё раз.") };
  }
}
