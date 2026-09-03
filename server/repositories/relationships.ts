import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { Relationship } from "@/features/people/types";
import type { RelationshipInput } from "@/lib/validation/person";

type Client = SupabaseClient<Database>;

/** All published (not soft-deleted) relationships, for the public tree/person pages. */
export async function listRelationships(supabase: Client): Promise<Relationship[]> {
  const { data, error } = await supabase
    .from("relationships")
    .select("id, from_person_id, to_person_id, relationship_type, parent_role")
    .is("deleted_at", null);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    fromPersonId: row.from_person_id,
    toPersonId: row.to_person_id,
    relationshipType: row.relationship_type,
    parentRole: row.parent_role,
  }));
}

export async function createRelationship(
  supabase: Client,
  input: RelationshipInput,
  editorId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("relationships")
    .insert({
      from_person_id: input.fromPersonId,
      to_person_id: input.toPersonId,
      relationship_type: input.relationshipType,
      parent_role: input.parentRole,
      note: input.note,
      created_by: editorId,
      updated_by: editorId,
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

export async function softDeleteRelationship(supabase: Client, id: string): Promise<void> {
  // .select().single() — see people.ts's softDeletePerson comment.
  // Relies on relationships_own_select (0011_own_row_select_visibility.sql):
  // without it, a member deleting their own relationship would find it
  // invisible to this same request's RETURNING clause and get a false
  // "not found" even though the delete succeeded.
  const { error } = await supabase
    .from("relationships")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
}

/**
 * Deactivates every active relationship touching a person, stamped with
 * the same `deletedAt` the caller used for the person itself — so
 * `restoreRelationshipsDeletedWithPerson` can later undo exactly this
 * cascade and nothing the editor deleted separately. Without this, a
 * soft-deleted person leaves relationships on record that still point
 * at them, and the tree grows a family-unit node with no person box at
 * the other end to show.
 */
export async function softDeleteRelationshipsForPerson(
  supabase: Client,
  personId: string,
  deletedAt: string,
  editorId: string,
): Promise<void> {
  const { error } = await supabase
    .from("relationships")
    .update({ deleted_at: deletedAt, updated_by: editorId })
    .is("deleted_at", null)
    .or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`);
  if (error) throw error;
}

/** Undoes exactly the cascade `softDeleteRelationshipsForPerson` made for this person, by matching the timestamp — leaves relationships the editor deleted independently untouched. */
export async function restoreRelationshipsDeletedWithPerson(
  supabase: Client,
  personId: string,
  deletedAt: string,
): Promise<void> {
  const { error } = await supabase
    .from("relationships")
    .update({ deleted_at: null })
    .eq("deleted_at", deletedAt)
    .or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`);
  if (error) throw error;
}

/** Counts a person's active relationships, to warn an editor before deletion. */
export async function countDependentRelationships(supabase: Client, personId: string): Promise<number> {
  const { count, error } = await supabase
    .from("relationships")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`);
  if (error) throw error;

  return count ?? 0;
}
