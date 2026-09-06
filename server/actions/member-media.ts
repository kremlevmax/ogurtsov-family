"use server";

import { revalidatePath } from "next/cache";
import { requireLoungeMember } from "@/server/auth/require-lounge-member";
import { getPersonById } from "@/server/repositories/people";
import { validateFileMetadata, verifyMagicBytes } from "@/lib/validation/media";
import { createPresignedUploadUrl, headR2Object, readR2ObjectHeadBytes, deleteR2Object } from "@/lib/r2/objects";
import * as mediaRepo from "@/server/repositories/media";
import { toUserMessage } from "./errors";
import { uploadMediaThumbnail } from "./media";

/**
 * Lets a member upload and manage PHOTOS and DOCUMENTS (only those two
 * kinds — not audio/video/archives) for a person they created
 * themselves, on /tree/add and /tree/edit/[id] (owner's request:
 * contributors should be able to add a photo or an archival document
 * of their relative, not just names/dates). Mirrors the editor's own
 * presign/finalize/link pipeline (server/actions/media.ts) but gated
 * by requireLoungeMember() + an explicit ownership check on every call
 * (RLS — 0015_member_person_photos.sql — is the real gate; this check
 * only turns a blocked write into a clear message instead of a raw
 * Postgres error). RLS itself doesn't restrict by media kind — this
 * file is the only place "photo or document, nothing else" is
 * enforced, same as CLAUDE.md 13's "server checks, not just UI"
 * principle applied the other direction (narrower than RLS allows).
 *
 * A photo/document created here is never `unlisted` — it shows on the
 * person's own card AND, respectively, in the public /gallery or
 * /archive list (owner's request; those pages already just list every
 * non-unlisted photo/document site-wide, editor-uploaded or not).
 */

const NOT_LOGGED_IN_ERROR = "Нужно войти, чтобы загрузить файл.";
const NOT_OWN_PERSON_ERROR = "Вы можете управлять файлами только у людей, которых добавили сами.";
const WRONG_KIND_ERROR = "Сюда можно загружать только фотографии и документы.";

async function requireOwnPerson(personId: string) {
  const member = await requireLoungeMember();
  const person = await getPersonById(member.supabase, personId);
  if (!person || person.createdBy !== member.userId) return null;
  return member;
}

export interface PresignPersonMediaInput {
  personId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignPersonMediaState {
  ok: boolean;
  error?: string;
  pendingUploadId?: string;
  uploadUrl?: string;
}

export async function presignPersonMediaAction(input: PresignPersonMediaInput): Promise<PresignPersonMediaState> {
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
  if (validation.kind !== "photo" && validation.kind !== "document") {
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

export interface FinalizePersonMediaInput {
  personId: string;
  pendingUploadId: string;
  originalFilename: string;
  caption: string | null;
  category: string | null;
  transcript: string | null;
  /** Client-rendered first-page PNG (lib/utils/upload.ts's generatePdfThumbnail) — null for non-PDFs or if rendering failed. */
  thumbnail: Blob | null;
  /** "This image is a scanned document, not a photo of a person" — see lib/validation/media.ts's ValidateFileMetadataOptions. Always true from the DocumentBlock form (components/forms/person-media-upload.tsx): that block IS the document uploader, so any image picked there is a scan by definition. */
  treatImageAsDocument: boolean;
  width: number | null;
  height: number | null;
}

export interface FinalizePersonMediaState {
  ok: boolean;
  error?: string;
  mediaId?: string;
}

export async function finalizePersonMediaAction(input: FinalizePersonMediaInput): Promise<FinalizePersonMediaState> {
  let member: Awaited<ReturnType<typeof requireLoungeMember>> | null;
  try {
    member = await requireOwnPerson(input.personId);
  } catch {
    return { ok: false, error: NOT_LOGGED_IN_ERROR };
  }
  if (!member) return { ok: false, error: NOT_OWN_PERSON_ERROR };

  if (!input.caption?.trim()) {
    return { ok: false, error: "Укажите подпись или пояснение." };
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

  const metaValidation = validateFileMetadata(input.originalFilename, pending.expectedMimeType, head.sizeBytes, {
    treatImageAsDocument: input.treatImageAsDocument,
  });
  if (
    !metaValidation.ok ||
    !metaValidation.extension ||
    (metaValidation.kind !== "photo" && metaValidation.kind !== "document")
  ) {
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

  try {
    const thumbnailObjectKey = await uploadMediaThumbnail(input.thumbnail);
    const mediaId = await mediaRepo.createMedia(
      member.supabase,
      {
        kind: metaValidation.kind,
        title: input.originalFilename,
        caption: input.caption,
        sourceOrOwner: null,
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
      member.userId,
    );
    await mediaRepo.linkMediaToPerson(member.supabase, input.personId, mediaId);

    // The first PHOTO for this person becomes the profile portrait
    // automatically — without this, an uploaded photo would never show
    // as the tree node's portrait (CLAUDE.md 3.6) unless the member
    // also knew to click "сделать главным" separately. Documents never
    // participate in this.
    if (metaValidation.kind === "photo") {
      const currentPhotos = await mediaRepo.listMediaForPerson(member.supabase, input.personId);
      const hasProfileAlready = currentPhotos.some((item) => item.isProfile && item.id !== mediaId);
      if (!hasProfileAlready) {
        await mediaRepo.setProfilePhoto(member.supabase, input.personId, mediaId);
      }
    }

    await mediaRepo.markPendingUploadStatus(member.supabase, pending.id, "completed");

    revalidatePath(`/people/${input.personId}`);
    revalidatePath(`/tree/edit/${input.personId}`);
    revalidatePath("/tree");
    revalidatePath(metaValidation.kind === "photo" ? "/gallery" : "/archive");

    return { ok: true, mediaId };
  } catch (error) {
    await deleteR2Object(pending.objectKey).catch(() => {});
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить файл. Попробуйте ещё раз.") };
  }
}

export interface MemberMediaActionState {
  ok: boolean;
  error?: string;
}

/** Photo-only — documents have no "profile portrait" concept. */
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

/** Unlinks a photo or document from the member's own person — works for either kind. */
export async function removePersonMediaAction(personId: string, mediaId: string): Promise<MemberMediaActionState> {
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
    revalidatePath("/archive");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось удалить файл.") };
  }
}
