"use server";

import { revalidatePath } from "next/cache";
import { relationshipInputSchema } from "@/lib/validation/person";
import { requireLoungeMember } from "@/server/auth/require-lounge-member";
import * as relationshipsRepo from "@/server/repositories/relationships";
import { toUserMessage } from "./errors";

export interface RelationshipActionState {
  ok: boolean;
  error?: string;
}

/** Any registered member for a relationship touching a person they created — see people.ts's doc comment and 0008_add_tree_contributions.sql. */
export async function createRelationshipAction(input: unknown): Promise<RelationshipActionState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти, чтобы добавить связь." };
  }

  const parsed = relationshipInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }

  try {
    await relationshipsRepo.createRelationship(member.supabase, parsed.data, member.userId);
    revalidatePath("/tree");
    revalidatePath(`/people/${parsed.data.fromPersonId}`);
    revalidatePath(`/people/${parsed.data.toPersonId}`);
    revalidatePath(`/edit/people/${parsed.data.fromPersonId}`);
    revalidatePath(`/edit/people/${parsed.data.toPersonId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserMessage(error, "Не удалось сохранить связь. Связать можно только людей, которых вы добавили."),
    };
  }
}

export async function deleteRelationshipAction(
  relationshipId: string,
  relatedPersonIds: [string, string],
): Promise<RelationshipActionState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти, чтобы удалить связь." };
  }

  try {
    await relationshipsRepo.softDeleteRelationship(member.supabase, relationshipId);
    revalidatePath("/tree");
    for (const id of relatedPersonIds) {
      revalidatePath(`/people/${id}`);
      revalidatePath(`/edit/people/${id}`);
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toUserMessage(error, "Не удалось удалить связь. Удалять можно только связи людей, которых вы добавили."),
    };
  }
}
