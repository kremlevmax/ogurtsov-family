import { Suspense } from "react";
import type { Metadata } from "next";
import { FamilyTreeExplorer } from "@/components/tree/family-tree-explorer";
import { toTreePerson } from "@/features/people/to-tree-person";
import { buildDisplayName } from "@/lib/names/display-name";
import { formatLifeSpan } from "@/lib/dates/date-value";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPeople } from "@/server/repositories/people";
import { listRelationships } from "@/server/repositories/relationships";
import { listAllMediaGroupedByPerson } from "@/server/repositories/media";
import { getLoungeViewer } from "@/server/auth/require-lounge-member";

export const metadata: Metadata = {
  title: "Родословное древо",
  description: "Интерактивное родословное дерево семьи Огурцовых с поиском по именам.",
};

export default async function TreePage() {
  const supabase = await createSupabaseServerClient();
  const [people, relationships, allMediaByPersonId, viewer] = await Promise.all([
    listPeople(supabase),
    listRelationships(supabase),
    listAllMediaGroupedByPerson(supabase),
    getLoungeViewer(),
  ]);
  // Public tree/drawer — a file linked to someone only for the upload
  // pipeline's sake (`unlisted`) never appears in their card here.
  const mediaByPersonId = Object.fromEntries(
    Object.entries(allMediaByPersonId).map(([personId, items]) => [personId, items.filter((item) => !item.unlisted)]),
  );

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
        viewer={{ isEditor: viewer.isEditor, memberId: viewer.userId, displayName: viewer.displayName }}
      />
    </Suspense>
  );
}
