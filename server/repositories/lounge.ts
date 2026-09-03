import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LoungeTopic, MediaKind } from "@/lib/supabase/types";
import { getMediaPublicUrl } from "@/lib/r2/public-url";

type Client = SupabaseClient<Database>;

export interface LoungeMessageAttachment {
  url: string;
  /** For PhotoLightbox (components/media/photo-lightbox.tsx), which builds its own URL from this rather than taking one directly. */
  objectKey: string;
  kind: MediaKind;
  filename: string;
}

export interface LoungeMessageRow {
  id: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorDisplayName: string;
  topic: LoungeTopic;
  body: string;
  attachment: LoungeMessageAttachment | null;
  createdAt: string;
  canManage: boolean;
}

const FEED_LIMIT = 200;

/**
 * Fetches the current feed (newest first) plus, for each message,
 * whether the given viewer may edit/delete it (own message, or an
 * editor). A family lounge is small enough that fetching up to
 * FEED_LIMIT messages and letting the client filter/sort in memory is
 * simpler than a server round-trip per filter click (CLAUDE.md 14).
 */
export async function listLoungeMessages(
  supabase: Client,
  viewer: { userId: string | null; isEditor: boolean },
): Promise<LoungeMessageRow[]> {
  // .is("deleted_at", null) explicitly, not left to RLS alone: the
  // author-own-select policy (lounge_messages_author_select_own,
  // 0011_own_row_select_visibility.sql) intentionally lets an author
  // see their own row regardless of deleted_at — needed so their own
  // soft-delete's RETURNING isn't empty — but that means RLS alone no
  // longer excludes their own deleted messages from a plain SELECT.
  // Same pattern people.ts's listPeople/relationships.ts's
  // listRelationships already used before this ever came up.
  const { data: messages, error } = await supabase
    .from("lounge_messages")
    .select("id, author_id, topic, body, image_media_id, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  const authorIds = Array.from(new Set(messages.map((m) => m.author_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from("lounge_profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", authorIds);
  if (profilesError) throw profilesError;

  const profileByAuthor = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const attachmentMediaIds = messages.map((m) => m.image_media_id).filter((id): id is string => id !== null);
  let mediaById = new Map<string, { objectKey: string; kind: MediaKind; filename: string }>();
  if (attachmentMediaIds.length > 0) {
    const { data: mediaRows, error: mediaError } = await supabase
      .from("media")
      .select("id, object_key, kind, original_filename")
      .in("id", attachmentMediaIds);
    if (mediaError) throw mediaError;
    mediaById = new Map(
      (mediaRows ?? []).map((row) => [
        row.id,
        { objectKey: row.object_key, kind: row.kind, filename: row.original_filename },
      ]),
    );
  }

  return messages.map((m) => {
    const profile = profileByAuthor.get(m.author_id);
    const firstName = profile?.first_name ?? "Участник";
    const lastName = profile?.last_name ?? "гостиной";
    const attachmentMedia = m.image_media_id ? mediaById.get(m.image_media_id) : undefined;
    const attachmentUrl = attachmentMedia ? getMediaPublicUrl(attachmentMedia.objectKey) : null;

    return {
      id: m.id,
      authorId: m.author_id,
      authorFirstName: firstName,
      authorLastName: lastName,
      authorDisplayName: `${firstName} ${lastName}`.trim(),
      topic: m.topic,
      body: m.body,
      attachment:
        attachmentMedia && attachmentUrl
          ? {
              url: attachmentUrl,
              objectKey: attachmentMedia.objectKey,
              kind: attachmentMedia.kind,
              filename: attachmentMedia.filename,
            }
          : null,
      createdAt: m.created_at,
      canManage: viewer.isEditor || viewer.userId === m.author_id,
    };
  });
}

export async function isLoungeMember(supabase: Client, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("lounge_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function createLoungeMessage(
  supabase: Client,
  input: { authorId: string; topic: LoungeTopic; body: string; imageMediaId: string | null },
): Promise<void> {
  const { error } = await supabase.from("lounge_messages").insert({
    author_id: input.authorId,
    topic: input.topic,
    body: input.body,
    image_media_id: input.imageMediaId,
  });
  if (error) throw error;
}

/**
 * Soft-delete only (CLAUDE.md 7.2/17) — RLS lets the author or an
 * editor do this. `.select().single()` turns "RLS silently matched
 * zero rows" into a real error instead of a no-op that looks like
 * success. This relies on `lounge_messages_author_select_own`
 * (0011_own_row_select_visibility.sql) existing: without it, the
 * public SELECT policy (`deleted_at is null`) would make a plain
 * member's own just-deleted row invisible to THIS SAME request's
 * RETURNING clause and throw a false "not found" even though the
 * delete itself succeeded — editors never hit this since their "for
 * all" policy already grants unconditional SELECT.
 */
export async function softDeleteLoungeMessage(supabase: Client, messageId: string): Promise<void> {
  const { error } = await supabase
    .from("lounge_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId)
    .select("id")
    .single();
  if (error) throw error;
}
