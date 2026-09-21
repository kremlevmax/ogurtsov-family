import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface TreeAccessAttachment {
  mediaId: string;
  originalFilename: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PendingTreeAccessRequest {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationNote: string | null;
  adminNote: string | null;
  status: "pending" | "needs_info";
  createdAt: string;
  attachments: TreeAccessAttachment[];
}

/**
 * Editors review these in app/edit/page.tsx. Joins lounge_tree_access
 * (private, editor-only RLS) with lounge_profiles (public, but the only
 * source of first/last name) and lounge_tree_access_attachments (any
 * files the member attached, RegistrationProject v1.0 Documents/05) to
 * show a reviewable request. Includes 'needs_info' rows too (not just
 * 'pending') so an editor can still see — read-only, no
 * Подтвердить/Отклонить/Запросить-уточнение buttons for those in
 * app/edit/page.tsx — which requests are waiting on the member's reply,
 * instead of the request disappearing from the list entirely.
 */
export async function listPendingTreeAccessRequests(supabase: Client): Promise<PendingTreeAccessRequest[]> {
  const { data: rows, error } = await supabase
    .from("lounge_tree_access")
    .select("user_id, email, relation_note, admin_note, status, created_at")
    .in("status", ["pending", "needs_info"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const userIds = rows.map((row) => row.user_id);
  const [{ data: profiles, error: profilesError }, attachmentsByUser] = await Promise.all([
    supabase.from("lounge_profiles").select("user_id, first_name, last_name").in("user_id", userIds),
    listTreeAccessAttachmentsForUsers(supabase, userIds),
  ]);
  if (profilesError) throw profilesError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      userId: row.user_id,
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      email: row.email,
      relationNote: row.relation_note,
      adminNote: row.admin_note,
      status: row.status as "pending" | "needs_info",
      createdAt: row.created_at,
      attachments: attachmentsByUser.get(row.user_id) ?? [],
    };
  });
}

/** Grouped by user_id — batched for listPendingTreeAccessRequests, one query instead of one per request. Two queries + an in-JS join, matching this file's existing style (no embedded-resource selects — lib/supabase/types.ts doesn't declare Relationships for these tables). */
async function listTreeAccessAttachmentsForUsers(
  supabase: Client,
  userIds: string[],
): Promise<Map<string, TreeAccessAttachment[]>> {
  const { data: links, error } = await supabase
    .from("lounge_tree_access_attachments")
    .select("user_id, media_id")
    .in("user_id", userIds);
  if (error) throw error;
  if (!links || links.length === 0) return new Map();

  const mediaIds = links.map((link) => link.media_id);
  const { data: mediaRows, error: mediaError } = await supabase
    .from("media")
    .select("id, original_filename, object_key, mime_type, size_bytes")
    .in("id", mediaIds);
  if (mediaError) throw mediaError;

  const mediaById = new Map((mediaRows ?? []).map((media) => [media.id, media]));

  const result = new Map<string, TreeAccessAttachment[]>();
  for (const link of links) {
    const media = mediaById.get(link.media_id);
    if (!media) continue;
    const attachment: TreeAccessAttachment = {
      mediaId: media.id,
      originalFilename: media.original_filename,
      objectKey: media.object_key,
      mimeType: media.mime_type,
      sizeBytes: media.size_bytes,
    };
    const existing = result.get(link.user_id);
    if (existing) existing.push(attachment);
    else result.set(link.user_id, [attachment]);
  }
  return result;
}

/** Member-initiated (server/actions/tree-access-request.ts): records an already-uploaded, already-finalized media row (server/actions/lounge-attachments.ts) as belonging to this request. */
export async function attachMediaToTreeAccessRequest(supabase: Client, userId: string, mediaId: string): Promise<void> {
  const { error } = await supabase.from("lounge_tree_access_attachments").insert({ user_id: userId, media_id: mediaId });
  if (error) throw error;
}

export type OwnTreeAccessStatus = "granted" | "pending" | "rejected" | "needs_info" | "none";

/**
 * Backs the "подтверждение родства" form (server/actions/tree-access-request.ts):
 * tells a member whether they can submit a fresh request, should wait
 * for a pending one, may resubmit after a rejection, or needs to answer
 * an editor's question (adminNote — the message from "Запросить
 * дополнительные сведения", server/actions/tree-access.ts).
 * lounge_tree_access_own_select (0023_tree_access_self_service.sql)
 * lets a member read their own row here.
 */
export async function getOwnTreeAccessState(
  supabase: Client,
  userId: string,
): Promise<{ status: OwnTreeAccessStatus; adminNote: string | null }> {
  const { data, error } = await supabase
    .from("lounge_tree_access")
    .select("status, admin_note")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { status: data?.status ?? "none", adminNote: data?.admin_note ?? null };
}

/**
 * Member-initiated: creates the first request (lounge_tree_access_own_insert)
 * or resubmits after a rejection (lounge_tree_access_own_resubmit) — RLS
 * enforces both status is 'pending' at the end and, for a resubmit, that
 * the row was 'rejected' beforehand. Requires status already checked as
 * 'none' or 'rejected' by the caller (getOwnTreeAccessState) so a
 * 'granted'/'pending' row surfaces a friendly message instead of a raw
 * RLS permission error.
 */
export async function submitTreeAccessRequest(
  supabase: Client,
  args: { userId: string; email: string; relationNote: string; isResubmit: boolean },
): Promise<void> {
  if (args.isResubmit) {
    const { error } = await supabase
      .from("lounge_tree_access")
      .update({ status: "pending", relation_note: args.relationNote, reviewed_at: null, reviewed_by: null })
      .eq("user_id", args.userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("lounge_tree_access")
    .insert({ user_id: args.userId, email: args.email, relation_note: args.relationNote, status: "pending" });
  if (error) throw error;
}

export async function approveTreeAccess(supabase: Client, userId: string, reviewerId: string): Promise<void> {
  const { error } = await supabase
    .from("lounge_tree_access")
    .update({ status: "granted", reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function rejectTreeAccess(supabase: Client, userId: string, reviewerId: string): Promise<void> {
  const { error } = await supabase
    .from("lounge_tree_access")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq("user_id", userId);
  if (error) throw error;
}

/** Editor's "Запросить дополнительные сведения" (server/actions/tree-access.ts) — parks the request in 'needs_info' with the editor's question attached, instead of Подтвердить/Отклонить. */
export async function requestTreeAccessMoreInfo(
  supabase: Client,
  userId: string,
  reviewerId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from("lounge_tree_access")
    .update({ status: "needs_info", admin_note: message, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Member's reply to an editor's question (server/actions/tree-access-request.ts)
 * — moves 'needs_info' back to 'pending' (lounge_tree_access_own_provide_info,
 * 0026_tree_access_needs_info_flow.sql). The reply is appended under the
 * original relation_note rather than replacing it, so an editor
 * re-reviewing the request sees the whole exchange, not just the latest
 * message — reading the current text first because Postgres has no
 * "append to column" update short of a raw SQL expression, and this
 * table only sees the occasional single-row write, never concurrent ones.
 */
export async function submitTreeAccessAdditionalInfo(supabase: Client, userId: string, reply: string): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("lounge_tree_access")
    .select("relation_note")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const relationNote = [existing?.relation_note, `Дополнительные сведения от участника:\n${reply}`]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await supabase
    .from("lounge_tree_access")
    .update({ status: "pending", relation_note: relationNote })
    .eq("user_id", userId);
  if (error) throw error;
}

/** Read back for the approval email (firstName + email), after the update above. */
export async function getTreeAccessContact(
  supabase: Client,
  userId: string,
): Promise<{ email: string; firstName: string } | null> {
  const [{ data: access, error: accessError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("lounge_tree_access").select("email").eq("user_id", userId).maybeSingle(),
    supabase.from("lounge_profiles").select("first_name").eq("user_id", userId).maybeSingle(),
  ]);
  if (accessError) throw accessError;
  if (profileError) throw profileError;
  if (!access) return null;
  return { email: access.email, firstName: profile?.first_name ?? "" };
}
