import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/** Batch-loads place names by id, for joining onto people rows in application code. */
export async function getPlaceNamesByIds(
  supabase: Client,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.from("places").select("id, name").in("id", ids);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

/**
 * Finds an existing place by case-insensitive exact name match, or
 * creates a new one. Places have no map/coordinates yet at creation —
 * an editor can add those later by editing the place directly.
 */
export async function findOrCreatePlaceId(supabase: Client, name: string): Promise<string> {
  const trimmed = name.trim();

  const { data: existing, error: findError } = await supabase
    .from("places")
    .select("id")
    .ilike("name", trimmed)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("places")
    .insert({ name: trimmed })
    .select("id")
    .single();
  if (insertError) throw insertError;

  return created.id;
}
