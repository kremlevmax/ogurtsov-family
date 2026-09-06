"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/server/auth/require-editor";
import { validateFileMetadata, verifyMagicBytes } from "@/lib/validation/media";
import { createPresignedUploadUrl, headR2Object, readR2ObjectHeadBytes, deleteR2Object } from "@/lib/r2/objects";
import * as mediaRepo from "@/server/repositories/media";
import { toUserMessage } from "./errors";
import { uploadMediaThumbnail } from "./media";

/**
 * "Добавить документ" directly on /archive (components/media/document-
 * gallery.tsx) — a standalone document not tied to any one person, same
 * shape as server/actions/place-media.ts's place photos (no
 * `person_media` row either). Editor-only: unlike a member's own
 * person photos/docs (server/actions/member-media.ts, ownership-
 * scoped to a person they created), a site-wide unlinked document has
 * no owner to scope a member's write access to.
 *
 * Always finalizes with `treatImageAsDocument: true` — this form only
 * ever creates documents, so a picked JPG/PNG scan is never mistaken
 * for a person photo (lib/validation/media.ts).
 */

export interface PresignArchiveDocumentInput {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignArchiveDocumentState {
  ok: boolean;
  error?: string;
  pendingUploadId?: string;
  uploadUrl?: string;
}

export async function presignArchiveDocumentAction(
  input: PresignArchiveDocumentInput,
): Promise<PresignArchiveDocumentState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  const validation = validateFileMetadata(input.originalFilename, input.mimeType, input.sizeBytes);
  if (!validation.ok || !validation.extension) {
    return { ok: false, error: validation.error ?? "Файл не прошёл проверку." };
  }

  const objectKey = `media/${crypto.randomUUID()}.${validation.extension}`;

  try {
    const pendingUploadId = await mediaRepo.createPendingUpload(editor.supabase, {
      objectKey,
      expectedMimeType: input.mimeType,
      expectedSizeBytes: input.sizeBytes,
      editorId: editor.editorId,
    });
    const uploadUrl = await createPresignedUploadUrl(objectKey, input.mimeType, input.originalFilename);
    return { ok: true, pendingUploadId, uploadUrl };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось подготовить загрузку. Попробуйте ещё раз.") };
  }
}

export interface FinalizeArchiveDocumentInput {
  pendingUploadId: string;
  originalFilename: string;
  title: string;
  caption: string;
  sourceOrOwner: string | null;
  category: string | null;
  transcript: string | null;
  thumbnail: Blob | null;
  width: number | null;
  height: number | null;
}

export interface FinalizeArchiveDocumentState {
  ok: boolean;
  error?: string;
  mediaId?: string;
}

export async function finalizeArchiveDocumentAction(
  input: FinalizeArchiveDocumentInput,
): Promise<FinalizeArchiveDocumentState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  if (!input.caption.trim()) {
    return { ok: false, error: "Укажите подпись или пояснение." };
  }

  const pending = await mediaRepo.getPendingUpload(editor.supabase, input.pendingUploadId, editor.editorId);
  if (!pending) {
    return { ok: false, error: "Загрузка не найдена или истекла. Попробуйте загрузить заново." };
  }

  const head = await headR2Object(pending.objectKey);
  if (!head) {
    await mediaRepo.markPendingUploadStatus(editor.supabase, pending.id, "failed");
    return { ok: false, error: "Файл не найден в хранилище. Попробуйте загрузить заново." };
  }

  const metaValidation = validateFileMetadata(input.originalFilename, pending.expectedMimeType, head.sizeBytes, {
    treatImageAsDocument: true,
  });
  if (!metaValidation.ok || !metaValidation.extension || !metaValidation.kind) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    await mediaRepo.markPendingUploadStatus(editor.supabase, pending.id, "failed");
    return { ok: false, error: metaValidation.error ?? "Файл не прошёл проверку." };
  }

  const headBytes = await readR2ObjectHeadBytes(pending.objectKey, 16).catch(() => new Uint8Array());
  if (!verifyMagicBytes(metaValidation.extension, headBytes)) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    await mediaRepo.markPendingUploadStatus(editor.supabase, pending.id, "failed");
    return { ok: false, error: "Содержимое файла не соответствует его типу." };
  }

  try {
    const thumbnailObjectKey = await uploadMediaThumbnail(input.thumbnail);
    const mediaId = await mediaRepo.createMedia(
      editor.supabase,
      {
        kind: metaValidation.kind,
        title: input.title,
        caption: input.caption.trim(),
        sourceOrOwner: input.sourceOrOwner,
        category: input.category,
        transcript: input.transcript,
        thumbnailObjectKey,
        objectKey: pending.objectKey,
        originalFilename: input.originalFilename,
        mimeType: pending.expectedMimeType,
        extension: metaValidation.extension,
        sizeBytes: head.sizeBytes,
        width: input.width,
        height: input.height,
        unlisted: false,
      },
      editor.editorId,
    );

    await mediaRepo.markPendingUploadStatus(editor.supabase, pending.id, "completed");
    revalidatePath("/archive");

    return { ok: true, mediaId };
  } catch (error) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить файл. Попробуйте ещё раз.") };
  }
}
