"use server";

import { revalidatePath } from "next/cache";
import { requireLoungeMember } from "@/server/auth/require-lounge-member";
import { getPersonById } from "@/server/repositories/people";
import { validateFileMetadata, verifyMagicBytes } from "@/lib/validation/media";
import { createPresignedUploadUrl, headR2Object, readR2ObjectHeadBytes, deleteR2Object } from "@/lib/r2/objects";
import * as mediaRepo from "@/server/repositories/media";
import { toUserMessage } from "./errors";

/**
 * Lets a member upload and manage PHOTOS (only — not documents) for a
 * person they created themselves, on /tree/add and /tree/edit/[id]
 * (owner's request: contributors should be able to add a photo of
 * their relative, not just names/dates). Mirrors the editor's own
 * presign/finalize/link pipeline (server/actions/media.ts) but gated
 * by requireLoungeMember() + an explicit ownership check on every call
 * (RLS — 0015_member_person_photos.sql — is the real gate; this check
 * only turns a blocked write into a clear message instead of a raw
 * Postgres error).
 */

const NOT_LOGGED_IN_ERROR = "Нужно войти, чтобы загрузить фото.";
const NOT_OWN_PERSON_ERROR = "Вы можете управлять фотографиями только у людей, которых добавили сами.";

async function requireOwnPerson(personId: string) {
  const member = await requireLoungeMember();
  const person = await getPersonById(member.supabase, personId);
  if (!person || person.createdBy !== member.userId) return null;
  return member;
}

export interface PresignPersonPhotoInput {
  personId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignPersonPhotoState {
  ok: boolean;
  error?: string;
  pendingUploadId?: string;
  uploadUrl?: string;
}

export async function presignPersonPhotoAction(input: PresignPersonPhotoInput): Promise<PresignPersonPhotoState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>> | null;
  try {
    member = await requireOwnPerson(input.personId);
  } catch {
    return { ok: false, error: NOT_LOGGED_IN_ERROR };
  }
  if (!member) return { ok: false, error: NOT_OWN_PERSON_ERROR };

  const validation = validateFileMetadata(input.originalFilename, input.mimeType, input.sizeBytes);
  if (!validation.ok || !validation.extension) {
    return { ok: false, error: validation.error ?? "Файл не прошёл проверку." };
  }
  if (validation.kind !== "photo") {
    return { ok: false, error: "Сюда можно загружать только фотографии." };
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

export interface FinalizePersonPhotoInput {
  personId: string;
  pendingUploadId: string;
  originalFilename: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

export interface FinalizePersonPhotoState {
  ok: boolean;
  error?: string;
  mediaId?: string;
}

export async function finalizePersonPhotoAction(input: FinalizePersonPhotoInput): Promise<FinalizePersonPhotoState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>> | null;
  try {
    member = await requireOwnPerson(input.personId);
  } catch {
    return { ok: false, error: NOT_LOGGED_IN_ERROR };
  }
  if (!member) return { ok: false, error: NOT_OWN_PERSON_ERROR };

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
    return { ok: false, error: metaValidation.kind && metaValidation.kind !== "photo"
      ? "Сюда можно загружать только фотографии."
      : (metaValidation.error ?? "Файл не прошёл проверку.") };
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
        kind: "photo",
        title: input.originalFilename,
        caption: input.caption,
        sourceOrOwner: null,
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
    await mediaRepo.linkMediaToPerson(member.supabase, input.personId, mediaId);

    // The first photo for this person becomes the profile portrait
    // automatically — without this, an uploaded photo would never show
    // as the tree node's portrait (CLAUDE.md 3.6) unless the member
    // also knew to click "сделать главным" separately.
    const currentPhotos = await mediaRepo.listMediaForPerson(member.supabase, input.personId);
    const hasProfileAlready = currentPhotos.some((item) => item.isProfile && item.id !== mediaId);
    if (!hasProfileAlready) {
      await mediaRepo.setProfilePhoto(member.supabase, input.personId, mediaId);
    }

    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "completed");

    revalidatePath(`/people/${input.personId}`);
    revalidatePath(`/tree/edit/${input.personId}`);
    revalidatePath("/tree");
    revalidatePath("/gallery");

    return { ok: true, mediaId };
  } catch (error) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить фото. Попробуйте ещё раз.") };
  }
}

export interface MemberMediaActionState {
  ok: boolean;
  error?: string;
}

export async function togglePersonPhotoProfileAction(
  personId: string,
  mediaId: string,
  makeProfile: boolean,
): Promise<MemberMediaActionState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>> | null;
  try {
    member = await requireOwnPerson(personId);
  } catch {
    return { ok: false, error: NOT_LOGGED_IN_ERROR };
  }
  if (!member) return { ok: false, error: NOT_OWN_PERSON_ERROR };

  try {
    if (makeProfile) await mediaRepo.setProfilePhoto(member.supabase, personId, mediaId);
    else await mediaRepo.unsetProfilePhoto(member.supabase, personId, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/tree/edit/${personId}`);
    revalidatePath("/tree");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось изменить фото профиля.") };
  }
}

export async function removePersonPhotoAction(personId: string, mediaId: string): Promise<MemberMediaActionState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>> | null;
  try {
    member = await requireOwnPerson(personId);
  } catch {
    return { ok: false, error: NOT_LOGGED_IN_ERROR };
  }
  if (!member) return { ok: false, error: NOT_OWN_PERSON_ERROR };

  try {
    await mediaRepo.unlinkMediaFromPerson(member.supabase, personId, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/tree/edit/${personId}`);
    revalidatePath("/tree");
    revalidatePath("/gallery");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось удалить фото.") };
  }
}
