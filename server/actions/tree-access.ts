"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/server/auth/require-editor";
import * as treeAccessRepo from "@/server/repositories/lounge-tree-access";
import { sendTreeAccessGrantedEmail } from "@/lib/email/send-notification";
import { toUserMessage } from "./errors";

export interface TreeAccessActionState {
  ok: boolean;
  error?: string;
}

/** Grants tree-editing access and emails the member — editor-only (checked here AND by RLS, CLAUDE.md 13). */
export async function approveTreeAccessAction(userId: string): Promise<TreeAccessActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await treeAccessRepo.approveTreeAccess(editor.supabase, userId, editor.editorId);

    const contact = await treeAccessRepo.getTreeAccessContact(editor.supabase, userId);
    if (contact) {
      try {
        await sendTreeAccessGrantedEmail(contact.email, contact.firstName);
      } catch (notifyError) {
        console.error(notifyError);
      }
    }

    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось одобрить заявку.") };
  }
}

/** Rejects the request — no email is sent (owner's explicit choice), editor-only. */
export async function rejectTreeAccessAction(userId: string): Promise<TreeAccessActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await treeAccessRepo.rejectTreeAccess(editor.supabase, userId, editor.editorId);
    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось отклонить заявку.") };
  }
}
