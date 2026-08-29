"use server";

import { revalidatePath } from "next/cache";
import { relationshipInputSchema } from "@/lib/validation/person";
import { requireEditor } from "@/server/auth/require-editor";
import * as relationshipsRepo from "@/server/repositories/relationships";
import { toUserMessage } from "./errors";

export interface RelationshipActionState {
  ok: boolean;
  error?: string;
}

export async function createRelationshipAction(input: unknown): Promise<RelationshipActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  const parsed = relationshipInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }

  try {
    await relationshipsRepo.createRelationship(editor.supabase, parsed.data, editor.editorId);
    revalidatePath("/tree");
    revalidatePath(`/people/${parsed.data.fromPersonId}`);
    revalidatePath(`/people/${parsed.data.toPersonId}`);
    revalidatePath(`/edit/people/${parsed.data.fromPersonId}`);
    revalidatePath(`/edit/people/${parsed.data.toPersonId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить связь. Попробуйте ещё раз.") };
  }
}

export async function deleteRelationshipAction(
  relationshipId: string,
  relatedPersonIds: [string, string],
): Promise<RelationshipActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await relationshipsRepo.softDeleteRelationship(editor.supabase, relationshipId);
    revalidatePath("/tree");
    for (const id of relatedPersonIds) {
      revalidatePath(`/people/${id}`);
      revalidatePath(`/edit/people/${id}`);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось удалить связь. Попробуйте ещё раз.") };
  }
}
