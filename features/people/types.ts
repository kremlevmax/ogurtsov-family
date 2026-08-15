import type { DateValue } from "@/lib/dates/date-value";
import type { ParentRole, RelationshipType } from "@/lib/validation/person";

/**
 * Shared domain shape for a person, used by both the fictional Stage 0
 * fixtures and the real Supabase-backed repositories (server/repositories/people.ts)
 * so UI components don't care which one fed them.
 */
export interface Person {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  maidenName: string | null;
  isPlaceholder: boolean;
  /** Explicit flag, independent of whether the death date itself is known. */
  isDeceased: boolean;
  birth: DateValue | null;
  death: DateValue | null;
  birthPlace: string | null;
  deathPlace: string | null;
  profession: string | null;
  education: string | null;
  shortBio: string | null;
  photoUrl: string | null;
}

export interface Relationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationshipType: RelationshipType;
  parentRole: ParentRole;
}
