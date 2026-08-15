import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MediaKind } from "@/lib/supabase/types";
import type { PersonMedia } from "@/features/media/types";

type Client = SupabaseClient<Database>;

export interface PendingUploadInput {
  objectKey: string;
  expectedMimeType: string;
  expectedSizeBytes: number;
  editorId: string;
}

const PENDING_UPLOAD_TTL_MS = 10 * 60 * 1000;

export async function createPendingUpload(supabase: Client, input: PendingUploadInput): Promise<string> {
  const expiresAt = new Date(Date.now() + PENDING_UPLOAD_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("pending_uploads")
    .insert({
      editor_id: input.editorId,
      object_key: input.objectKey,
      expected_mime_type: input.expectedMimeType,
      expected_size_bytes: input.expectedSizeBytes,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

export interface PendingUpload {
  id: string;
  objectKey: string;
  expectedMimeType: string;
  expectedSizeBytes: number;
}

export async function getPendingUpload(
  supabase: Client,
  id: string,
  editorId: string,
): Promise<PendingUpload | null> {
  const { data, error } = await supabase
    .from("pending_uploads")
    .select("id, object_key, expected_mime_type, expected_size_bytes")
    .eq("id", id)
    .eq("editor_id", editorId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    objectKey: data.object_key,
    expectedMimeType: data.expected_mime_type,
    expectedSizeBytes: data.expected_size_bytes,
  };
}

export async function markPendingUploadStatus(
  supabase: Client,
  id: string,
  status: "completed" | "failed" | "expired",
): Promise<void> {
  const { error } = await supabase.from("pending_uploads").update({ status }).eq("id", id);
  if (error) throw error;
}

export interface CreateMediaInput {
  kind: MediaKind;
  title: string;
  caption: string | null;
  sourceOrOwner: string | null;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}

export async function createMedia(supabase: Client, input: CreateMediaInput, editorId: string): Promise<string> {
  const { data, error } = await supabase
    .from("media")
    .insert({
      kind: input.kind,
      title: input.title,
      caption: input.caption,
      source_or_owner: input.sourceOrOwner,
      object_key: input.objectKey,
      original_filename: input.originalFilename,
      mime_type: input.mimeType,
      extension: input.extension,
      size_bytes: input.sizeBytes,
      width: input.width,
      height: input.height,
      created_by: editorId,
      updated_by: editorId,
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

export async function softDeleteMedia(supabase: Client, mediaId: string): Promise<void> {
  const { error } = await supabase
    .from("media")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", mediaId);
  if (error) throw error;
}

/** The object key of a (possibly already soft-deleted) media row — used to also remove the R2 object. */
export async function getMediaObjectKey(supabase: Client, mediaId: string): Promise<string | null> {
  const { data, error } = await supabase.from("media").select("object_key").eq("id", mediaId).maybeSingle();
  if (error) throw error;
  return data?.object_key ?? null;
}

export async function linkMediaToPerson(supabase: Client, personId: string, mediaId: string): Promise<void> {
  const { error } = await supabase
    .from("person_media")
    .insert({ person_id: personId, media_id: mediaId });
  if (error) throw error;
}

export async function unlinkMediaFromPerson(supabase: Client, personId: string, mediaId: string): Promise<void> {
  const { error } = await supabase
    .from("person_media")
    .delete()
    .eq("person_id", personId)
    .eq("media_id", mediaId);
  if (error) throw error;
}

/** At most one profile photo per person — clears any existing one first (also enforced by a DB unique index). */
export async function setProfilePhoto(supabase: Client, personId: string, mediaId: string): Promise<void> {
  const { error: clearError } = await supabase
    .from("person_media")
    .update({ is_profile: false })
    .eq("person_id", personId)
    .eq("is_profile", true);
  if (clearError) throw clearError;

  const { error } = await supabase
    .from("person_media")
    .update({ is_profile: true })
    .eq("person_id", personId)
    .eq("media_id", mediaId);
  if (error) throw error;
}

export async function unsetProfilePhoto(supabase: Client, personId: string, mediaId: string): Promise<void> {
  const { error } = await supabase
    .from("person_media")
    .update({ is_profile: false })
    .eq("person_id", personId)
    .eq("media_id", mediaId);
  if (error) throw error;
}

type MediaRow = Database["public"]["Tables"]["media"]["Row"];

function rowToPersonMedia(row: MediaRow, isProfile: boolean): PersonMedia {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    caption: row.caption,
    sourceOrOwner: row.source_or_owner,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    objectKey: row.object_key,
    isProfile,
  };
}

/**
 * Two separate queries + an in-memory join, deliberately — see
 * server/repositories/people.ts for why embedded PostgREST selects
 * (`media(*)`) aren't used against the hand-written Database type.
 */
export async function listMediaForPerson(supabase: Client, personId: string): Promise<PersonMedia[]> {
  const { data: links, error: linksError } = await supabase
    .from("person_media")
    .select("media_id, is_profile, sort_order")
    .eq("person_id", personId)
    .order("sort_order", { ascending: true });
  if (linksError) throw linksError;
  if (!links || links.length === 0) return [];

  const mediaIds = links.map((link) => link.media_id);
  const { data: mediaRows, error: mediaError } = await supabase
    .from("media")
    .select("*")
    .in("id", mediaIds)
    .is("deleted_at", null);
  if (mediaError) throw mediaError;

  const mediaById = new Map((mediaRows ?? []).map((row) => [row.id, row]));

  return links
    .map((link) => {
      const row = mediaById.get(link.media_id);
      return row ? rowToPersonMedia(row, link.is_profile) : null;
    })
    .filter((item): item is PersonMedia => item !== null);
}

/**
 * Every published person's media, grouped by person id — a plain object
 * (not a Map) so it can be passed straight through as Server → Client
 * component props. Used to preload the tree drawer's media client-side,
 * the same way people/relationships are already preloaded in full.
 */
export async function listAllMediaGroupedByPerson(supabase: Client): Promise<Record<string, PersonMedia[]>> {
  const { data: links, error: linksError } = await supabase
    .from("person_media")
    .select("person_id, media_id, is_profile, sort_order")
    .order("sort_order", { ascending: true });
  if (linksError) throw linksError;
  if (!links || links.length === 0) return {};

  const mediaIds = [...new Set(links.map((link) => link.media_id))];
  const { data: mediaRows, error: mediaError } = await supabase
    .from("media")
    .select("*")
    .in("id", mediaIds)
    .is("deleted_at", null);
  if (mediaError) throw mediaError;

  const mediaById = new Map((mediaRows ?? []).map((row) => [row.id, row]));

  const grouped: Record<string, PersonMedia[]> = {};
  for (const link of links) {
    const row = mediaById.get(link.media_id);
    if (!row) continue;
    const list = (grouped[link.person_id] ??= []);
    list.push(rowToPersonMedia(row, link.is_profile));
  }
  return grouped;
}

/** Profile-photo object key per person, batched — used to show portraits on the tree/search (CLAUDE.md 3.6). */
export async function getProfilePhotoObjectKeys(
  supabase: Client,
  personIds: string[],
): Promise<Map<string, string>> {
  if (personIds.length === 0) return new Map();

  const { data: links, error: linksError } = await supabase
    .from("person_media")
    .select("person_id, media_id")
    .in("person_id", personIds)
    .eq("is_profile", true);
  if (linksError) throw linksError;
  if (!links || links.length === 0) return new Map();

  const mediaIds = links.map((link) => link.media_id);
  const { data: mediaRows, error: mediaError } = await supabase
    .from("media")
    .select("id, object_key")
    .in("id", mediaIds)
    .is("deleted_at", null);
  if (mediaError) throw mediaError;

  const objectKeyByMediaId = new Map((mediaRows ?? []).map((row) => [row.id, row.object_key]));

  const result = new Map<string, string>();
  for (const link of links) {
    const objectKey = objectKeyByMediaId.get(link.media_id);
    if (objectKey) result.set(link.person_id, objectKey);
  }
  return result;
}

/** Total bytes stored across all active media — shown to editors against the ~5 GB expectation (CLAUDE.md 3.7). */
export async function getTotalStorageBytes(supabase: Client): Promise<number> {
  const { data, error } = await supabase.from("media").select("size_bytes").is("deleted_at", null);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + row.size_bytes, 0);
}
