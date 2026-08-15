"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchPeople, type SearchablePerson } from "@/features/search/normalize";

const DEBOUNCE_MS = 200;

export interface SearchBoxProps {
  people: SearchablePerson[];
  /** When provided, selecting a result opens the tree drawer instead of navigating away. */
  onSelect?: (personId: string) => void;
}

export function SearchBox({ people, onSelect }: SearchBoxProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const results = debouncedQuery ? searchPeople(people, debouncedQuery) : [];

  function handleSelect(personId: string) {
    onSelect?.(personId);
    setRawQuery("");
    setDebouncedQuery("");
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-fg-muted)"
        />
        <Input
          type="search"
          placeholder="Найти человека по имени или фамилии…"
          aria-label="Поиск по семейному дереву"
          value={rawQuery}
          onChange={(event) => setRawQuery(event.target.value)}
          className="border-(--color-border) bg-(--color-bg-inset) pl-9"
        />
      </div>

      {debouncedQuery && (
        <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) shadow-(--shadow-md)">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-(--color-fg-muted)">
              Никого не найдено. Проверьте написание имени.
            </li>
          ) : (
            results.map((person) =>
              onSelect ? (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(person.id)}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-(--color-bg)"
                  >
                    {person.displayName}
                  </button>
                </li>
              ) : (
                <li key={person.id}>
                  <Link
                    href={`/people/${person.id}`}
                    className="block px-4 py-2 text-sm hover:bg-(--color-bg)"
                  >
                    {person.displayName}
                  </Link>
                </li>
              ),
            )
          )}
        </ul>
      )}
    </div>
  );
}
