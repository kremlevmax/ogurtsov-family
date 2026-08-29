"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { SearchBox } from "@/components/people/search-box";
import { TreeCanvas } from "@/components/tree/tree-canvas";
import { PersonDrawer } from "@/components/tree/person-drawer";
import type { TreePerson } from "@/features/tree/build-graph";
import type { Person, Relationship } from "@/features/people/types";
import type { PersonMedia } from "@/features/media/types";
import type { SearchablePerson } from "@/features/search/normalize";
import { buildDisplayNameFirstNameFirst, compareByFirstName, compareByName } from "@/lib/names/display-name";

type PeopleListSortMode = "lastName" | "firstName" | "birthYear";

const SORT_MODE_LABELS: Record<PeopleListSortMode, string> = {
  lastName: "По фамилии",
  firstName: "По имени",
  birthYear: "По дате рождения",
};

export interface FamilyTreeExplorerProps {
  people: Person[];
  treePeople: TreePerson[];
  relationships: Relationship[];
  mediaByPersonId: Record<string, PersonMedia[]>;
  searchablePeople: (SearchablePerson & { lifeSpan: string | null })[];
  isEditor: boolean;
  editorName: string | null;
}

/**
 * Owns the tree/drawer selection state and keeps it mirrored in the URL
 * (`/tree?person=<uuid>`) via the History API directly — this route
 * doesn't read `searchParams` on the server, so updating the query
 * string never triggers a server refetch that would reset pan/zoom
 * (CLAUDE.md 3.6, 9, 11).
 */
export function FamilyTreeExplorer({
  people,
  treePeople,
  relationships,
  mediaByPersonId,
  searchablePeople,
  isEditor,
  editorName,
}: FamilyTreeExplorerProps) {
  const searchParams = useSearchParams();
  const [selectedPersonId, setSelectedPersonIdState] = useState<string | null>(() =>
    searchParams.get("person"),
  );

  const selectPerson = useCallback((personId: string | null) => {
    setSelectedPersonIdState(personId);
    const url = personId ? `/tree?person=${personId}` : "/tree";
    window.history.pushState(null, "", url);
  }, []);

  useEffect(() => {
    function handlePopState() {
      setSelectedPersonIdState(new URLSearchParams(window.location.search).get("person"));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectedPerson = selectedPersonId
    ? (people.find((person) => person.id === selectedPersonId) ?? null)
    : null;

  const [peopleListSort, setPeopleListSort] = useState<PeopleListSortMode>("lastName");

  const birthYearById = useMemo(
    () => new Map(treePeople.map((person) => [person.id, person.birthYear])),
    [treePeople],
  );

  const sortedListPeople = useMemo(() => {
    // Reading order matches sort order: "по имени" leads with имя in the
    // label too, otherwise the list would read alphabetized by a name
    // part it isn't visibly leading with.
    const withListLabel = searchablePeople.map((person) => ({
      ...person,
      birthYear: birthYearById.get(person.id) ?? null,
      listLabel: peopleListSort === "firstName" ? buildDisplayNameFirstNameFirst(person) : person.displayName,
    }));

    if (peopleListSort === "firstName") return withListLabel.sort(compareByFirstName);
    if (peopleListSort === "birthYear") {
      return withListLabel.sort((a, b) => {
        if (a.birthYear === null && b.birthYear === null) return compareByName(a, b);
        if (a.birthYear === null) return 1;
        if (b.birthYear === null) return -1;
        return a.birthYear - b.birthYear || compareByName(a, b);
      });
    }
    return withListLabel.sort(compareByName);
  }, [searchablePeople, peopleListSort, birthYearById]);

  return (
    <div className="flex flex-1 flex-col">
      <Header search={<SearchBox people={searchablePeople} onSelect={selectPerson} />} />
      <main className="flex flex-1 flex-col gap-4 p-4">
        {isEditor && (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-4 py-2">
            <p className="text-sm text-(--color-fg-muted)">Вы вошли как {editorName}</p>
            <Link href="/edit" className="text-label text-xs text-(--color-accent) hover:underline">
              Панель редактора
            </Link>
          </div>
        )}

        <div className="relative h-[75vh] min-h-[420px] overflow-hidden rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg)">
          <TreeCanvas
            people={treePeople}
            relationships={relationships}
            selectedPersonId={selectedPersonId}
            onSelectPerson={selectPerson}
          />
          {selectedPerson && (
            <PersonDrawer
              person={selectedPerson}
              people={people}
              relationships={relationships}
              media={mediaByPersonId[selectedPerson.id] ?? []}
              isEditor={isEditor}
              onClose={() => selectPerson(null)}
              onPersonSelect={selectPerson}
            />
          )}
        </div>

        <details className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-4">
          <summary className="text-label cursor-pointer text-xs text-(--color-fg-muted)">
            Список всех людей (доступная альтернатива дереву)
          </summary>

          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="people-list-sort" className="text-label text-xs text-(--color-fg-muted)">
              Сортировка
            </label>
            <select
              id="people-list-sort"
              value={peopleListSort}
              onChange={(event) => setPeopleListSort(event.target.value as PeopleListSortMode)}
              className="h-8 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg) px-2 text-xs text-(--color-fg) focus-visible:outline-none"
            >
              {(Object.entries(SORT_MODE_LABELS) as [PeopleListSortMode, string][]).map(([mode, label]) => (
                <option key={mode} value={mode}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <ul className="mt-3 columns-1 gap-x-6 sm:columns-2">
            {sortedListPeople.map((person) => (
              <li key={person.id} className="mb-1 break-inside-avoid">
                <Link
                  href={`/people/${person.id}`}
                  className="text-sm text-(--color-fg) underline-offset-2 hover:underline"
                >
                  {person.listLabel || "Без имени"}
                  {person.lifeSpan && (
                    <span className="text-label ml-1.5 text-[11px] text-(--color-fg-muted)">
                      {person.lifeSpan}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </details>

        {people.length === 0 && (
          <p className="text-sm text-(--color-fg-muted)">
            В дереве пока никого нет.{" "}
            {isEditor ? (
              <Link href="/edit/people/new" className="text-(--color-accent) hover:underline">
                Добавить первого человека
              </Link>
            ) : (
              "Войдите как редактор, чтобы начать заполнять дерево."
            )}
          </p>
        )}
      </main>
    </div>
  );
}
