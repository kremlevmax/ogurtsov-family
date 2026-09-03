"use server";

import { requireLoungeMember } from "@/server/auth/require-lounge-member";
import { validateFileMetadata, verifyMagicBytes } from "@/lib/validation/media";
import { createPresignedUploadUrl, headR2Object, readR2ObjectHeadBytes, deleteR2Object } from "@/lib/r2/objects";
import * as mediaRepo from "@/server/repositories/media";
import { toUserMessage } from "./errors";

/**
 * The lounge's own presign/finalize pair — same validation/R2 pipeline
 * as the editor media flow (server/actions/media.ts), just gated by
 * `requireLoungeMember()` instead of `requireEditor()` and without a
 * person to link the file to (0010_lounge_attachments.sql widened
 * media/pending_uploads' FKs to allow this). One optional image per
 * message, matching the source design's single "＋ Добавить фото или
 * файл" button.
 */

export interface PresignLoungeAttachmentInput {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignLoungeAttachmentState {
  ok: boolean;
  error?: string;
  pendingUploadId?: string;
  objectKey?: string;
  uploadUrl?: string;
}

export async function presignLoungeAttachmentAction(
  input: PresignLoungeAttachmentInput,
): Promise<PresignLoungeAttachmentState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти в гостиную, чтобы прикрепить файл." };
  }

  const validation = validateFileMetadata(input.originalFilename, input.mimeType, input.sizeBytes);
  if (!validation.ok || !validation.extension) {
    return { ok: false, error: validation.error ?? "Файл не прошёл проверку." };
  }

  const objectKey = `lounge/${crypto.randomUUID()}.${validation.extension}`;

  try {
    const pendingUploadId = await mediaRepo.createPendingUpload(member.supabase, {
      objectKey,
      expectedMimeType: input.mimeType,
      expectedSizeBytes: input.sizeBytes,
      editorId: member.userId,
    });

    const uploadUrl = await createPresignedUploadUrl(objectKey, input.mimeType, input.originalFilename);

    return { ok: true, pendingUploadId, objectKey, uploadUrl };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось подготовить загрузку. Попробуйте ещё раз.") };
  }
}

export interface FinalizeLoungeAttachmentInput {
  pendingUploadId: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
}

export interface FinalizeLoungeAttachmentState {
  ok: boolean;
  error?: string;
  mediaId?: string;
}

/** Step 2, after the browser's direct PUT to R2 succeeds — re-validates against the real uploaded bytes (CLAUDE.md 5.4). */
export async function finalizeLoungeAttachmentAction(
  input: FinalizeLoungeAttachmentInput,
): Promise<FinalizeLoungeAttachmentState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: "Нужно войти в гостиную, чтобы прикрепить файл." };
  }

  const pending = await mediaRepo.getPendingUpload(member.supabase, input.pendingUploadId, member.userId);
  if (!pending) {
    return { ok: false, error: "Загрузка не найдена или истекла. Попробуйте загрузить заново." };
  }

  const head = await headR2Object(pending.objectKey);
  if (!head) {
    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "failed");
    return { ok: false, error: "Файл не найден в хранилище. Попробуйте загрузить заново." };
  }

  const metaValidation = validateFileMetadata(input.originalFilename, pending.expectedMimeType, head.sizeBytes);
  if (!metaValidation.ok || !metaValidation.extension || !metaValidation.kind) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "failed");
    return { ok: false, error: metaValidation.error ?? "Файл не прошёл проверку." };
  }

  const headBytes = await readR2ObjectHeadBytes(pending.objectKey, 16).catch(() => new Uint8Array());
  if (!verifyMagicBytes(metaValidation.extension, headBytes)) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "failed");
    return { ok: false, error: "Содержимое файла не соответствует его типу." };
  }

  try {
    const mediaId = await mediaRepo.createMedia(
      member.supabase,
      {
        kind: metaValidation.kind,
        title: input.originalFilename,
        caption: null,
        sourceOrOwner: null,
        objectKey: pending.objectKey,
        originalFilename: input.originalFilename,
        mimeType: pending.expectedMimeType,
        extension: metaValidation.extension,
        sizeBytes: head.sizeBytes,
        width: input.width,
        height: input.height,
        unlisted: true,
      },
      member.userId,
    );
    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "completed");

    return { ok: true, mediaId };
  } catch (error) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить файл. Попробуйте ещё раз.") };
  }
}
