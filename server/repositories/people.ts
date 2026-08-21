import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DatePrecision } from "@/lib/supabase/types";
import type { DateValue } from "@/lib/dates/date-value";
import type { Person } from "@/features/people/types";
import type { PersonFormInput } from "@/lib/validation/person";
import { buildDisplayName } from "@/lib/names/display-name";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import { getPlaceNamesByIds, findOrCreatePlaceId } from "./places";
import { getProfilePhotoObjectKeys } from "./media";
import { softDeleteRelationshipsForPerson, restoreRelationshipsDeletedWithPerson } from "./relationships";

type Client = SupabaseClient<Database>;
type PersonRow = Database["public"]["Tables"]["people"]["Row"];

function rowToDateValue(
  precision: DatePrecision,
  start: string | null,
  end: string | null,
  text: string | null,
): DateValue {
  return { precision, start, end, text };
}

async function rowsToPeople(supabase: Client, rows: PersonRow[]): Promise<Person[]> {
  const placeIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.birth_place_id, row.death_place_id])
        .filter((id): id is string => id !== null),
    ),
  ];
  const placeNames = await getPlaceNamesByIds(supabase, placeIds);
  const profilePhotoKeys = await getProfilePhotoObjectKeys(
    supabase,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const profileObjectKey = profilePhotoKeys.get(row.id);
    return {
      id: row.id,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      maidenName: row.maiden_name,
      isPlaceholder: row.is_placeholder,
      isDeceased: row.is_deceased,
      birth: rowToDateValue(row.birth_date_precision, row.birth_date_start, row.birth_date_end, row.birth_date_text),
      death: rowToDateValue(row.death_date_precision, row.death_date_start, row.death_date_end, row.death_date_text),
      birthPlace: row.birth_place_id ? (placeNames.get(row.birth_place_id) ?? null) : null,
      deathPlace: row.death_place_id ? (placeNames.get(row.death_place_id) ?? null) : null,
      profession: row.profession,
      education: row.education,
      shortBio: row.short_bio,
      photoUrl: profileObjectKey ? getMediaPublicUrl(profileObjectKey) : null,
      branchColor: row.branch_color,
      highlightColor: row.highlight_color,
    };
  });
}

/** All published (not soft-deleted) people, for the public tree/search. */
export async function listPeople(supabase: Client): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .is("deleted_at", null)
    .order("last_name", { ascending: true, nullsFirst: true });
  if (error) throw error;

  return rowsToPeople(supabase, data ?? []);
}

/** A single published person, or null if missing/soft-deleted. */
export async function getPersonById(supabase: Client, id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [person] = await rowsToPeople(supabase, [data]);
  return person;
}

/**
 * Same as getPersonById, but also returns soft-deleted people and their
 * deletion status — for the editor's edit-page, which must still open
 * for a deleted person (to show a restore prompt).
 */
export async function getPersonByIdIncludingDeleted(
  supabase: Client,
  id: string,
): Promise<{ person: Person; deletedAt: string | null } | null> {
  const { data, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [person] = await rowsToPeople(supabase, [data]);
  return { person, deletedAt: data.deleted_at };
}

/** Soft-deleted people, newest-deleted first (editor-only "trash" list). */
export async function listDeletedPeople(supabase: Client): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;

  return rowsToPeople(supabase, data ?? []);
}

async function resolvePlaceIds(
  supabase: Client,
  input: PersonFormInput,
): Promise<{ birthPlaceId: string | null; deathPlaceId: string | null }> {
  const birthPlaceId = input.birthPlace ? await findOrCreatePlaceId(supabase, input.birthPlace) : null;
  const deathPlaceId = input.deathPlace ? await findOrCreatePlaceId(supabase, input.deathPlace) : null;
  return { birthPlaceId, deathPlaceId };
}

function toDbFields(input: PersonFormInput, birthPlaceId: string | null, deathPlaceId: string | null) {
  return {
    first_name: input.firstName,
    middle_name: input.middleName,
    last_name: input.lastName,
    maiden_name: input.maidenName,
    display_name: buildDisplayName(input),
    is_placeholder: input.isPlaceholder,
    is_deceased: input.isDeceased,
    birth_date_precision: input.birth.precision,
    birth_date_start: input.birth.start,
    birth_date_end: input.birth.end,
    birth_date_text: input.birth.text,
    birth_place_id: birthPlaceId,
    death_date_precision: input.death.precision,
    death_date_start: input.death.start,
    death_date_end: input.death.end,
    death_date_text: input.death.text,
    death_place_id: deathPlaceId,
    profession: input.profession,
    education: input.education,
    short_bio: input.shortBio,
    branch_color: input.branchColor,
    highlight_color: input.highlightColor,
  };
}

export async function createPerson(
  supabase: Client,
  input: PersonFormInput,
  editorId: string,
): Promise<string> {
  const { birthPlaceId, deathPlaceId } = await resolvePlaceIds(supabase, input);

  const { data, error } = await supabase
    .from("people")
    .insert({
      ...toDbFields(input, birthPlaceId, deathPlaceId),
      created_by: editorId,
      updated_by: editorId,
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id;
}

export async function updatePerson(
  supabase: Client,
  id: string,
  input: PersonFormInput,
  editorId: string,
): Promise<void> {
  const { birthPlaceId, deathPlaceId } = await resolvePlaceIds(supabase, input);

  const { error } = await supabase
    .from("people")
    .update({ ...toDbFields(input, birthPlaceId, deathPlaceId), updated_by: editorId })
    .eq("id", id);
  if (error) throw error;
}

export async function softDeletePerson(supabase: Client, id: string, editorId: string): Promise<void> {
  const deletedAt = new Date().toISOString();
  const { error } = await supabase.from("people").update({ deleted_at: deletedAt }).eq("id", id);
  if (error) throw error;

  // Same timestamp on both, so restorePerson can undo precisely this
  // cascade later without reviving relationships deleted separately.
  await softDeleteRelationshipsForPerson(supabase, id, deletedAt, editorId);
}

export async function restorePerson(supabase: Client, id: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("people")
    .select("deleted_at")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  if (data.deleted_at) {
    await restoreRelationshipsDeletedWithPerson(supabase, id, data.deleted_at);
  }

  return restorePersonRow(supabase, id);
}

async function restorePersonRow(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("people").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}
