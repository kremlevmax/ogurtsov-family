"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/server/auth/require-editor";
import { validateFileMetadata, verifyMagicBytes } from "@/lib/validation/media";
import { createPresignedUploadUrl, headR2Object, readR2ObjectHeadBytes, deleteR2Object } from "@/lib/r2/objects";
import * as mediaRepo from "@/server/repositories/media";
import { toUserMessage } from "./errors";

export interface PresignUploadInput {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignUploadState {
  ok: boolean;
  error?: string;
  pendingUploadId?: string;
  objectKey?: string;
  uploadUrl?: string;
}

/** Step 1 of 2: validate metadata, reserve an object key, and issue a short-lived presigned PUT URL. */
export async function presignUploadAction(input: PresignUploadInput): Promise<PresignUploadState> {
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

    return { ok: true, pendingUploadId, objectKey, uploadUrl };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось подготовить загрузку. Попробуйте ещё раз.") };
  }
}

export interface FinalizeUploadInput {
  pendingUploadId: string;
  originalFilename: string;
  title: string;
  caption: string | null;
  sourceOrOwner: string | null;
  personId: string;
  width: number | null;
  height: number | null;
}

export interface FinalizeUploadState {
  ok: boolean;
  error?: string;
  mediaId?: string;
}

/**
 * Step 2 of 2, called after the browser's direct PUT to R2 succeeds.
 * Re-validates against the actual uploaded object (HEAD for size/type,
 * a ranged GET for a magic-byte check) before creating the `media` row
 * — CLAUDE.md 5.4: never trust the client-reported metadata alone.
 */
export async function finalizeUploadAction(input: FinalizeUploadInput): Promise<FinalizeUploadState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
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

  const metaValidation = validateFileMetadata(input.originalFilename, pending.expectedMimeType, head.sizeBytes);
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
    const mediaId = await mediaRepo.createMedia(
      editor.supabase,
      {
        kind: metaValidation.kind,
        title: input.title,
        caption: input.caption,
        sourceOrOwner: input.sourceOrOwner,
        objectKey: pending.objectKey,
        originalFilename: input.originalFilename,
        mimeType: pending.expectedMimeType,
        extension: metaValidation.extension,
        sizeBytes: head.sizeBytes,
        width: input.width,
        height: input.height,
      },
      editor.editorId,
    );

    await mediaRepo.linkMediaToPerson(editor.supabase, input.personId, mediaId);
    await mediaRepo.markPendingUploadStatus(editor.supabase, pending.id, "completed");

    revalidatePath(`/people/${input.personId}`);
    revalidatePath(`/edit/people/${input.personId}`);
    revalidatePath("/");

    return { ok: true, mediaId };
  } catch (error) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить файл. Попробуйте ещё раз.") };
  }
}

export interface MediaActionState {
  ok: boolean;
  error?: string;
}

export async function deleteMediaAction(mediaId: string, personId: string): Promise<MediaActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await mediaRepo.softDeleteMedia(editor.supabase, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/edit/people/${personId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось удалить файл. Попробуйте ещё раз.") };
  }
}

export async function setProfilePhotoAction(personId: string, mediaId: string): Promise<MediaActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await mediaRepo.setProfilePhoto(editor.supabase, personId, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/edit/people/${personId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось назначить фото профиля. Попробуйте ещё раз.") };
  }
}

export async function unsetProfilePhotoAction(personId: string, mediaId: string): Promise<MediaActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await mediaRepo.unsetProfilePhoto(editor.supabase, personId, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/edit/people/${personId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось убрать фото профиля. Попробуйте ещё раз.") };
  }
}

export async function unlinkMediaAction(personId: string, mediaId: string): Promise<MediaActionState> {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch {
    return { ok: false, error: "Нужно войти как редактор." };
  }

  try {
    await mediaRepo.unlinkMediaFromPerson(editor.supabase, personId, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/edit/people/${personId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось отвязать файл. Попробуйте ещё раз.") };
  }
}
