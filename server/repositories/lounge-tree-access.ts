import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export interface PendingTreeAccessRequest {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationNote: string | null;
  createdAt: string;
}

/**
 * Editors review these in app/edit/page.tsx. Joins lounge_tree_access
 * (private, editor-only RLS) with lounge_profiles (public, but the only
 * source of first/last name) to show a reviewable request.
 */
export async function listPendingTreeAccessRequests(supabase: Client): Promise<PendingTreeAccessRequest[]> {
  const { data: rows, error } = await supabase
    .from("lounge_tree_access")
    .select("user_id, email, relation_note, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const userIds = rows.map((row) => row.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("lounge_profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", userIds);
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
      createdAt: row.created_at,
    };
  });
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
