"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/server/auth/require-editor";
import * as treeAccessRepo from "@/server/repositories/lounge-tree-access";
import { treeAccessMoreInfoRequestSchema } from "@/lib/validation/lounge";
import {
  sendTreeAccessGrantedEmail,
  sendTreeAccessMoreInfoRequestedEmail,
  sendTreeAccessRejectedEmail,
} from "@/lib/email/send-notification";
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
        await sendTreeAccessGrantedEmail(contact.email);
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

/** Rejects the request and emails the member (owner decision, 2026-09-20) — editor-only. */
export async function rejectTreeAccessAction(userId: string): Promise<TreeAccessActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    const contact = await treeAccessRepo.getTreeAccessContact(editor.supabase, userId);
    await treeAccessRepo.rejectTreeAccess(editor.supabase, userId, editor.editorId);

    if (contact) {
      try {
        await sendTreeAccessRejectedEmail(contact.email);
      } catch (notifyError) {
        console.error(notifyError);
      }
    }

    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось отклонить заявку.") };
  }
}

/** "Запросить дополнительные сведения" (owner decision, 2026-09-20) — parks the request in 'needs_info' and emails the member the editor's question, editor-only. */
export async function requestTreeAccessMoreInfoAction(userId: string, message: string): Promise<TreeAccessActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  const parsed = treeAccessMoreInfoRequestSchema.safeParse({ message });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте текст сообщения." };
  }

  try {
    const contact = await treeAccessRepo.getTreeAccessContact(editor.supabase, userId);
    await treeAccessRepo.requestTreeAccessMoreInfo(editor.supabase, userId, editor.editorId, parsed.data.message);

    if (contact) {
      try {
        await sendTreeAccessMoreInfoRequestedEmail({
          email: contact.email,
          message: parsed.data.message,
        });
      } catch (notifyError) {
        console.error(notifyError);
      }
    }

    revalidatePath("/edit");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось отправить запрос уточнения.") };
  }
}
