"use server";

import { revalidatePath } from "next/cache";
import { requireLoungeMember } from "@/server/auth/require-lounge-member";
import { validateFileMetadata, verifyMagicBytes } from "@/lib/validation/media";
import { createPresignedUploadUrl, headR2Object, readR2ObjectHeadBytes, deleteR2Object } from "@/lib/r2/objects";
import * as mediaRepo from "@/server/repositories/media";
import { toUserMessage } from "./errors";

/**
 * "Места нашей истории" upload (ogurtsovy_pages_handoff_v2, owner's
 * request) — any registered member, PHOTOS only, never linked to a
 * person via `person_media`. That absence of a person link is exactly
 * what makes a photo show up in the Places tab instead of People
 * (lib/media/split-photos.ts) — no new RLS needed, `media_member_insert`
 * (0010_lounge_attachments.sql) already lets any lounge member insert
 * their own `media` row regardless of what it's "for". Mirrors the
 * presign/finalize shape of server/actions/member-media.ts, simplified:
 * no person ownership check, no profile-photo logic, and it accepts a
 * "Примерный год" free-text field (media.date_text) the person-photo
 * flow doesn't have a field for.
 */

const NOT_LOGGED_IN_ERROR = "Нужно войти, чтобы добавить фотографию места.";
const WRONG_KIND_ERROR = "Сюда можно загружать только фотографии.";

export interface PresignPlacePhotoInput {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignPlacePhotoState {
  ok: boolean;
  error?: string;
  pendingUploadId?: string;
  uploadUrl?: string;
}

export async function presignPlacePhotoAction(input: PresignPlacePhotoInput): Promise<PresignPlacePhotoState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: NOT_LOGGED_IN_ERROR };
  }

  const validation = validateFileMetadata(input.originalFilename, input.mimeType, input.sizeBytes);
  if (!validation.ok || !validation.extension) {
    return { ok: false, error: validation.error ?? "Файл не прошёл проверку." };
  }
  if (validation.kind !== "photo") {
    return { ok: false, error: WRONG_KIND_ERROR };
  }

  const objectKey = `media/${crypto.randomUUID()}.${validation.extension}`;

  try {
    const pendingUploadId = await mediaRepo.createPendingUpload(member.supabase, {
      objectKey,
      expectedMimeType: input.mimeType,
      expectedSizeBytes: input.sizeBytes,
      editorId: member.userId,
    });
    const uploadUrl = await createPresignedUploadUrl(objectKey, input.mimeType, input.originalFilename);
    return { ok: true, pendingUploadId, uploadUrl };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось подготовить загрузку. Попробуйте ещё раз.") };
  }
}

export interface FinalizePlacePhotoInput {
  pendingUploadId: string;
  originalFilename: string;
  caption: string | null;
  approxYear: string | null;
  width: number | null;
  height: number | null;
}

export interface FinalizePlacePhotoState {
  ok: boolean;
  error?: string;
  mediaId?: string;
}

export async function finalizePlacePhotoAction(input: FinalizePlacePhotoInput): Promise<FinalizePlacePhotoState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch {
    return { ok: false, error: NOT_LOGGED_IN_ERROR };
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
  if (!metaValidation.ok || !metaValidation.extension || metaValidation.kind !== "photo") {
    await deleteR2Object(pending.objectKey).catch(() => {});
    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "failed");
    return {
      ok: false,
      error: metaValidation.ok ? WRONG_KIND_ERROR : (metaValidation.error ?? "Файл не прошёл проверку."),
    };
  }

  const headBytes = await readR2ObjectHeadBytes(pending.objectKey, 16).catch(() => new Uint8Array());
  if (!verifyMagicBytes(metaValidation.extension, headBytes)) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "failed");
    return { ok: false, error: "Содержимое файла не соответствует его типу." };
  }

  const caption = input.caption?.trim() || null;

  try {
    const mediaId = await mediaRepo.createMedia(
      member.supabase,
      {
        kind: "photo",
        title: caption ?? input.originalFilename,
        caption,
        sourceOrOwner: null,
        dateText: input.approxYear?.trim() || null,
        objectKey: pending.objectKey,
        originalFilename: input.originalFilename,
        mimeType: pending.expectedMimeType,
        extension: metaValidation.extension,
        sizeBytes: head.sizeBytes,
        width: input.width,
        height: input.height,
        unlisted: false,
      },
      member.userId,
    );
    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "completed");

    revalidatePath("/gallery");

    return { ok: true, mediaId };
  } catch (error) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить фотографию. Попробуйте ещё раз.") };
  }
}
