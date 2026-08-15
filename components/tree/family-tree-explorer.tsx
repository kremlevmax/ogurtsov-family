"use client";

import { useCallback, useEffect, useState } from "react";
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
 * (`/?person=<uuid>`) via the History API directly — this route doesn't
 * read `searchParams` on the server, so updating the query string never
 * triggers a server refetch that would reset pan/zoom (CLAUDE.md 3.6, 9, 11).
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
    const url = personId ? `/?person=${personId}` : "/";
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
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {searchablePeople.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/people/${person.id}`}
                  className="text-sm text-(--color-fg) underline-offset-2 hover:underline"
                >
                  {person.displayName || "Без имени"}
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
