"use server";

import { revalidatePath } from "next/cache";
import { loungeMessageSchema } from "@/lib/validation/lounge";
import { requireLoungeMember } from "@/server/auth/require-lounge-member";
import * as loungeRepo from "@/server/repositories/lounge";
import { toUserMessage } from "./errors";

export interface LoungeMessageActionState {
  ok: boolean;
  error?: string;
}

export async function createLoungeMessageAction(
  _prevState: LoungeMessageActionState,
  formData: FormData,
): Promise<LoungeMessageActionState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти в гостиную, чтобы опубликовать сообщение." };
  }

  const imageMediaIdRaw = formData.get("imageMediaId");
  const parsed = loungeMessageSchema.safeParse({
    topic: formData.get("topic"),
    body: formData.get("body"),
    imageMediaId: typeof imageMediaIdRaw === "string" && imageMediaIdRaw !== "" ? imageMediaIdRaw : null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  }

  try {
    await loungeRepo.createLoungeMessage(member.supabase, {
      authorId: member.userId,
      topic: parsed.data.topic,
      body: parsed.data.body,
      imageMediaId: parsed.data.imageMediaId ?? null,
    });
    revalidatePath("/lounge");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось опубликовать сообщение. Попробуйте ещё раз.") };
  }
}

export interface DeleteLoungeMessageState {
  ok: boolean;
  error?: string;
}

/** Author-of-own or editor — enforced by RLS (0007_add_lounge.sql), not just this check. */
export async function deleteLoungeMessageAction(messageId: string): Promise<DeleteLoungeMessageState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти, чтобы удалить сообщение." };
  }

  try {
    await loungeRepo.softDeleteLoungeMessage(member.supabase, messageId);
    revalidatePath("/lounge");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось удалить сообщение.") };
  }
}
