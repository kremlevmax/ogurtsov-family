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
  likeCount: number;
  likedByViewer: boolean;
  /** Always [] on a reply itself — replies are a single level deep, not threaded further. */
  replies: LoungeMessageRow[];
}

const FEED_LIMIT = 200;

/**
 * Fetches the current feed (newest-first top-level messages, each with
 * its replies nested underneath in chronological order) plus, for each
 * message, whether the given viewer may edit/delete it and whether
 * they've liked it. A family lounge is small enough that fetching up
 * to FEED_LIMIT rows and letting the client filter/sort in memory is
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
  const { data: rows, error } = await supabase
    .from("lounge_messages")
    .select("id, author_id, topic, body, image_media_id, parent_message_id, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((m) => m.author_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from("lounge_profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", authorIds);
  if (profilesError) throw profilesError;

  const profileByAuthor = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const attachmentMediaIds = rows.map((m) => m.image_media_id).filter((id): id is string => id !== null);
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

  const messageIds = rows.map((m) => m.id);
  const { data: likeRows, error: likesError } = await supabase
    .from("lounge_message_likes")
    .select("message_id, user_id")
    .in("message_id", messageIds);
  if (likesError) throw likesError;

  const likesByMessage = new Map<string, string[]>();
  for (const like of likeRows ?? []) {
    const list = likesByMessage.get(like.message_id) ?? [];
    list.push(like.user_id);
    likesByMessage.set(like.message_id, list);
  }

  function toRow(m: NonNullable<typeof rows>[number]): LoungeMessageRow {
    const profile = profileByAuthor.get(m.author_id);
    const firstName = profile?.first_name ?? "Участник";
    const lastName = profile?.last_name ?? "гостиной";
    const attachmentMedia = m.image_media_id ? mediaById.get(m.image_media_id) : undefined;
    const attachmentUrl = attachmentMedia ? getMediaPublicUrl(attachmentMedia.objectKey) : null;
    const likers = likesByMessage.get(m.id) ?? [];

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
      likeCount: likers.length,
      likedByViewer: viewer.userId !== null && likers.includes(viewer.userId),
      replies: [],
    };
  }

  const repliesByParent = new Map<string, LoungeMessageRow[]>();
  for (const m of rows) {
    if (!m.parent_message_id) continue;
    const list = repliesByParent.get(m.parent_message_id) ?? [];
    list.push(toRow(m));
    repliesByParent.set(m.parent_message_id, list);
  }
  for (const list of repliesByParent.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  return rows
    .filter((m) => !m.parent_message_id)
    .map((m) => ({ ...toRow(m), replies: repliesByParent.get(m.id) ?? [] }));
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
  input: {
    authorId: string;
    /** Required for a top-level post; ignored (the parent's own topic is copied instead) for a reply. */
    topic: LoungeTopic | null;
    body: string;
    imageMediaId: string | null;
    parentMessageId: string | null;
  },
): Promise<void> {
  let topic = input.topic;

  if (input.parentMessageId) {
    const { data: parent, error: parentError } = await supabase
      .from("lounge_messages")
      .select("topic")
      .eq("id", input.parentMessageId)
      .single();
    if (parentError) throw parentError;
    topic = parent.topic;
  }
  if (!topic) throw new Error("Выберите тему.");

  const { error } = await supabase.from("lounge_messages").insert({
    author_id: input.authorId,
    topic,
    body: input.body,
    image_media_id: input.imageMediaId,
    parent_message_id: input.parentMessageId,
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

export interface LoungePinnedMessage {
  body: string | null;
  updatedAt: string;
}

/** The singleton pinned-banner row (0014_lounge_pinned_message.sql) — always exists, `body` is null when nothing is pinned. */
export async function getLoungePinnedMessage(supabase: Client): Promise<LoungePinnedMessage | null> {
  const { data, error } = await supabase
    .from("lounge_pinned_message")
    .select("body, updated_at")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { body: data.body, updatedAt: data.updated_at };
}

/** `body: null` clears the banner — there's nothing to actually delete on a singleton row. RLS: lounge_pinned_message_editor_update. */
export async function setLoungePinnedMessage(supabase: Client, body: string | null, editorId: string): Promise<void> {
  const { error } = await supabase
    .from("lounge_pinned_message")
    .update({ body, updated_by: editorId })
    .eq("id", true)
    .select("id")
    .single();
  if (error) throw error;
}

/** Toggle: like if not already liked, unlike if already liked. Requires an existing lounge_profiles row (RLS: lounge_message_likes_member_insert, 0012_lounge_message_likes.sql). */
export async function toggleLoungeMessageLike(
  supabase: Client,
  messageId: string,
  userId: string,
): Promise<{ liked: boolean }> {
  const { data: existing, error: selectError } = await supabase
    .from("lounge_message_likes")
    .select("user_id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from("lounge_message_likes")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId);
    if (error) throw error;
    return { liked: false };
  }

  const { error } = await supabase.from("lounge_message_likes").insert({ message_id: messageId, user_id: userId });
  if (error) throw error;
  return { liked: true };
}
