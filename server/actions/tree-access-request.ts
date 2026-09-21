"use server";

import { NotLoungeMemberError, requireLoungeMember } from "@/server/auth/require-lounge-member";
import { treeAccessRequestSchema, treeAccessAdditionalInfoSchema } from "@/lib/validation/lounge";
import {
  attachMediaToTreeAccessRequest,
  getOwnTreeAccessState,
  submitTreeAccessRequest,
  submitTreeAccessAdditionalInfo,
} from "@/server/repositories/lounge-tree-access";
import { sendTreeAccessRequestNotification, sendTreeAccessInfoProvidedNotification } from "@/lib/email/send-notification";

export interface TreeAccessRequestState {
  error: string | null;
  success: boolean;
}

export interface TreeAccessSummary {
  signedIn: boolean;
  hasTreeAccess: boolean;
  status: "granted" | "pending" | "rejected" | "needs_info" | "none";
  adminNote: string | null;
}

/** Lets the "Подтверждение родства" modal (components/auth/auth-modal-context.tsx) render the right view without a page load — the standalone /join page does the same check server-side; this is its client-callable equivalent. */
export async function getTreeAccessSummaryAction(): Promise<TreeAccessSummary> {
  let member;
  try {
    member = await requireLoungeMember();
  } catch {
    return { signedIn: false, hasTreeAccess: false, status: "none", adminNote: null };
  }
  const { status, adminNote } = await getOwnTreeAccessState(member.supabase, member.userId);
  return { signedIn: true, hasTreeAccess: member.hasTreeAccess, status, adminNote };
}

/**
 * "Подтверждение родства" — a signed-in member asks an editor for the
 * right to add people to the tree. Separate from registration
 * (docs/DECISIONS.md, owner decision 2026-09-18): a member reaches this
 * from "Присоединиться к проекту" whenever they choose, not only right
 * after signing up.
 */
export async function requestTreeAccessAction(
  _prevState: TreeAccessRequestState,
  formData: FormData,
): Promise<TreeAccessRequestState> {
  let member;
  try {
    member = await requireLoungeMember();
  } catch (err) {
    if (err instanceof NotLoungeMemberError) return { error: "Нужно войти в гостиную.", success: false };
    throw err;
  }

  const parsed = treeAccessRequestSchema.safeParse({
    ancestorRef: formData.get("ancestorRef") ?? "",
    aboutSelf: formData.get("aboutSelf") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы.", success: false };
  }

  const { status } = await getOwnTreeAccessState(member.supabase, member.userId);
  if (status === "granted") {
    return { error: "У вас уже есть доступ к добавлению людей в дерево.", success: false };
  }
  if (status === "pending" || status === "needs_info") {
    return { error: "Ваша заявка уже отправлена и ожидает рассмотрения.", success: false };
  }

  const {
    data: { user },
  } = await member.supabase.auth.getUser();
  if (!user?.email) return { error: "Не удалось определить ваш email.", success: false };

  const relationNote = [
    parsed.data.ancestorRef && `От какого человека ведёт происхождение: ${parsed.data.ancestorRef}`,
    parsed.data.aboutSelf && `О себе: ${parsed.data.aboutSelf}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  await submitTreeAccessRequest(member.supabase, {
    userId: member.userId,
    email: user.email,
    relationNote,
    isResubmit: status === "rejected",
  });

  // Files were already uploaded/finalized as their own `media` rows
  // before this submit (presignLoungeAttachmentAction/
  // finalizeLoungeAttachmentAction, same as a lounge message's photo) —
  // this just records which ones belong to this request.
  const mediaIds = formData.getAll("mediaIds").filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const mediaId of mediaIds) {
    try {
      await attachMediaToTreeAccessRequest(member.supabase, member.userId, mediaId);
    } catch (attachError) {
      console.error(attachError);
    }
  }

  const [firstName, ...lastNameParts] = member.displayName.split(" ");
  try {
    await sendTreeAccessRequestNotification({
      firstName: firstName ?? "",
      lastName: lastNameParts.join(" "),
      email: user.email,
      relationNote: relationNote || "(участник не оставил дополнительных сведений)",
    });
  } catch (notifyError) {
    console.error(notifyError);
  }

  return { error: null, success: true };
}

/**
 * Member's reply to an editor's "Запросить дополнительные сведения"
 * (server/actions/tree-access.ts) — the flow the owner asked for,
 * 2026-09-20: the member answers from their own "Подтверждение
 * родства" panel (not by replying to the email directly), optionally
 * attaching files the same way as the original request, and the
 * request goes back to 'pending' for the editor to re-review.
 */
export async function submitAdditionalInfoAction(
  _prevState: TreeAccessRequestState,
  formData: FormData,
): Promise<TreeAccessRequestState> {
  let member;
  try {
    member = await requireLoungeMember();
  } catch (err) {
    if (err instanceof NotLoungeMemberError) return { error: "Нужно войти в гостиную.", success: false };
    throw err;
  }

  const parsed = treeAccessAdditionalInfoSchema.safeParse({ reply: formData.get("reply") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поле ответа.", success: false };
  }

  const { status } = await getOwnTreeAccessState(member.supabase, member.userId);
  if (status !== "needs_info") {
    return { error: "Сейчас нет открытого запроса на уточнение.", success: false };
  }

  await submitTreeAccessAdditionalInfo(member.supabase, member.userId, parsed.data.reply);

  const mediaIds = formData.getAll("mediaIds").filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const mediaId of mediaIds) {
    try {
      await attachMediaToTreeAccessRequest(member.supabase, member.userId, mediaId);
    } catch (attachError) {
      console.error(attachError);
    }
  }

  const [firstName, ...lastNameParts] = member.displayName.split(" ");
  try {
    await sendTreeAccessInfoProvidedNotification({
      firstName: firstName ?? "",
      lastName: lastNameParts.join(" "),
      reply: parsed.data.reply,
    });
  } catch (notifyError) {
    console.error(notifyError);
  }

  return { error: null, success: true };
}
