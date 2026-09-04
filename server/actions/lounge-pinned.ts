"use server";

import { revalidatePath } from "next/cache";
import { loungePinnedMessageSchema } from "@/lib/validation/lounge";
import { requireEditor } from "@/server/auth/require-editor";
import * as loungeRepo from "@/server/repositories/lounge";
import { toUserMessage } from "./errors";

export interface LoungePinnedMessageActionState {
  ok: boolean;
  error?: string;
}

/** Create or edit the pinned banner — editor-only (checked here AND by RLS, CLAUDE.md 13). */
export async function setLoungePinnedMessageAction(body: string): Promise<LoungePinnedMessageActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  const parsed = loungePinnedMessageSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте текст." };
  }

  try {
    // Empty (after trim) is treated the same as deleteLoungePinnedMessageAction
    // below — a singleton row, so "save a blank banner" and "clear it" are
    // the same operation.
    await loungeRepo.setLoungePinnedMessage(editor.supabase, parsed.data.body || null, editor.editorId);
    revalidatePath("/lounge");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить закреплённое сообщение.") };
  }
}

/** Clears the banner (sets body back to null) — editor-only, same as setLoungePinnedMessageAction. */
export async function deleteLoungePinnedMessageAction(): Promise<LoungePinnedMessageActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await loungeRepo.setLoungePinnedMessage(editor.supabase, null, editor.editorId);
    revalidatePath("/lounge");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось удалить закреплённое сообщение.") };
  }
}
