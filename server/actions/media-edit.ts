"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import * as mediaRepo from "@/server/repositories/media";
import { toUserMessage } from "./errors";

type Client = SupabaseClient<Database>;

/**
 * Whoever uploaded a photo/document — or either editor — can manage it
 * after the fact (owner's request): fix its title/caption/category, or
 * add/remove which people it's linked to. Every action below shares
 * this one check instead of repeating it (CLAUDE.md 15) — a level
 * below the existing "own person" checks in member-media.ts, since
 * this is about who owns the *media row*, not the person it's on.
 * 0018_media_member_update_own.sql (title/caption/category) and
 * 0019_media_owner_manage_links.sql (person_media insert/delete) are
 * the matching RLS policies; this explicit check just turns a blocked
 * write into a clear message instead of a raw Postgres error
 * (CLAUDE.md 13).
 */
async function canEditMedia(supabase: Client, mediaId: string, userId: string, isEditor: boolean): Promise<boolean> {
  if (isEditor) return true;
  const createdBy = await mediaRepo.getMediaCreatedBy(supabase, mediaId);
  return createdBy === userId;
}

async function loadActor(supabase: Client, mediaId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Нужно войти." };

  const { data: editorRow } = await supabase.from("editors").select("user_id").eq("user_id", user.id).maybeSingle();
  const isEditor = editorRow !== null;

  if (!(await canEditMedia(supabase, mediaId, user.id, isEditor))) {
    return { ok: false as const, error: "Вы можете редактировать только свои файлы." };
  }

  return { ok: true as const, userId: user.id };
}

async function revalidateMedia(supabase: Client, mediaId: string): Promise<void> {
  const linkedPersonIds = await mediaRepo.getLinkedPersonIds(supabase, mediaId);
  revalidatePath("/archive");
  revalidatePath("/gallery");
  revalidatePath("/tree");
  revalidatePath(`/archive/${mediaId}`);
  for (const personId of linkedPersonIds) {
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/edit/people/${personId}`);
  }
}

export interface MediaEditActionState {
  ok: boolean;
  error?: string;
}

export interface UpdateMediaDetailsInput {
  mediaId: string;
  title: string;
  caption: string;
  /** Documents only — rejected below for any other kind. */
  category?: string | null;
}

/** Title/caption/category of an already-uploaded photo or document. */
export async function updateMediaDetailsAction(input: UpdateMediaDetailsInput): Promise<MediaEditActionState> {
  const supabase = await createSupabaseServerClient();

  if (!input.title.trim()) return { ok: false, error: "Укажите название." };
  if (!input.caption.trim()) return { ok: false, error: "Укажите подпись или пояснение." };

  const actor = await loadActor(supabase, input.mediaId);
  if (!actor.ok) return actor;

  if (input.category) {
    const { data: mediaRow } = await supabase.from("media").select("kind").eq("id", input.mediaId).maybeSingle();
    if (mediaRow?.kind !== "document") {
      return { ok: false, error: "Категория предусмотрена только для документов." };
    }
  }

  try {
    await mediaRepo.updateMediaDetails(
      supabase,
      input.mediaId,
      { title: input.title.trim(), caption: input.caption.trim(), category: input.category ?? null },
      actor.userId,
    );
    await revalidateMedia(supabase, input.mediaId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось сохранить изменения. Попробуйте ещё раз.") };
  }
}

/** Links an already-uploaded photo/document to one more person. */
export async function linkMediaToPersonAction(mediaId: string, personId: string): Promise<MediaEditActionState> {
  const supabase = await createSupabaseServerClient();

  const actor = await loadActor(supabase, mediaId);
  if (!actor.ok) return actor;

  try {
    await mediaRepo.linkMediaToPerson(supabase, personId, mediaId);
    await revalidateMedia(supabase, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/edit/people/${personId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось привязать человека. Попробуйте ещё раз.") };
  }
}

/** Unlinks a photo/document from one of the people it's currently linked to. */
export async function unlinkMediaFromPersonAction(mediaId: string, personId: string): Promise<MediaEditActionState> {
  const supabase = await createSupabaseServerClient();

  const actor = await loadActor(supabase, mediaId);
  if (!actor.ok) return actor;

  try {
    await mediaRepo.unlinkMediaFromPerson(supabase, personId, mediaId);
    await revalidateMedia(supabase, mediaId);
    revalidatePath(`/people/${personId}`);
    revalidatePath(`/edit/people/${personId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: toUserMessage(error, "Не удалось отвязать человека. Попробуйте ещё раз.") };
  }
}
