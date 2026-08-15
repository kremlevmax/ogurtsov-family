import { buildDisplayName, buildShortName } from "@/lib/names/display-name";
import { extractDisplayYear } from "@/lib/dates/date-value";
import type { TreePerson } from "@/features/tree/build-graph";
import type { Person } from "./types";

/** Maps a full person record down to the minimal shape tree nodes need. */
export function toTreePerson(person: Person): TreePerson {
  return {
    id: person.id,
    displayName: buildDisplayName(person),
    shortName: buildShortName(person),
    birthYear: person.birth ? extractDisplayYear(person.birth) : null,
    deathYear: person.isDeceased && person.death ? extractDisplayYear(person.death) : null,
    isDeceased: person.isDeceased,
    isPlaceholder: person.isPlaceholder,
    photoUrl: person.photoUrl,
  };
}
