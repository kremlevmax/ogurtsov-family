import { Suspense } from "react";
import { FamilyTreeExplorer } from "@/components/tree/family-tree-explorer";
import { toTreePerson } from "@/features/people/to-tree-person";
import { buildDisplayName } from "@/lib/names/display-name";
import { formatLifeSpan } from "@/lib/dates/date-value";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPeople } from "@/server/repositories/people";
import { listRelationships } from "@/server/repositories/relationships";
import { listAllMediaGroupedByPerson } from "@/server/repositories/media";
import { getEditorSession } from "@/server/auth/require-editor";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const [people, relationships, mediaByPersonId, editor] = await Promise.all([
    listPeople(supabase),
    listRelationships(supabase),
    listAllMediaGroupedByPerson(supabase),
    getEditorSession(),
  ]);

  const treePeople = people.map(toTreePerson);
  const searchablePeople = people.map((person) => ({
    id: person.id,
    firstName: person.firstName,
    middleName: person.middleName,
    lastName: person.lastName,
    maidenName: person.maidenName,
    displayName: buildDisplayName(person),
    lifeSpan: formatLifeSpan(person.birth, person.death, person.isDeceased),
  }));

  return (
    <Suspense fallback={null}>
      <FamilyTreeExplorer
        people={people}
        treePeople={treePeople}
        relationships={relationships}
        mediaByPersonId={mediaByPersonId}
        searchablePeople={searchablePeople}
        isEditor={editor !== null}
        editorName={editor?.displayName ?? null}
      />
    </Suspense>
  );
}
