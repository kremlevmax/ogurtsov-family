"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRelationshipAction, deleteRelationshipAction } from "@/server/actions/relationships";
import type { Person, Relationship } from "@/features/people/types";
import { describeRelationship } from "@/features/people/relations";
import { buildDisplayName } from "@/lib/names/display-name";
import { searchPeople } from "@/features/search/normalize";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface RelationshipManagerProps {
  personId: string;
  relationships: Relationship[];
  allPeople: Person[];
}

const RELATIONSHIP_TYPE_OPTIONS = [
  { value: "biological_parent", label: "Биологический родитель" },
  { value: "adoptive_parent", label: "Приёмный родитель (усыновитель)" },
  { value: "spouse", label: "Супруг(а)" },
  { value: "former_spouse", label: "Бывший(ая) супруг(а)" },
  { value: "partner", label: "Партнёр" },
] as const;

const PARENT_TYPES = new Set(["biological_parent", "adoptive_parent", "foster_parent", "guardian"]);

const selectClassName =
  "h-10 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 text-sm text-(--color-fg) focus-visible:outline-none";

export function RelationshipManager({ personId, relationships, allPeople }: RelationshipManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove(rel: Relationship) {
    setError(null);
    startTransition(async () => {
      const result = await deleteRelationshipAction(rel.id, [rel.fromPersonId, rel.toPersonId]);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось удалить связь.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {relationships.map((rel) => {
          const description = describeRelationship(rel, personId, allPeople);
          if (!description) return null;
          return (
            <li
              key={rel.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-sm"
            >
              <span>
                <span className="text-label mr-2 text-[10px] text-(--color-fg-muted)">
                  {description.label}
                </span>
                <Link href={`/people/${description.person.id}`} className="hover:underline">
                  {buildDisplayName(description.person)}
                </Link>
              </span>
              <button
                type="button"
                onClick={() => handleRemove(rel)}
                disabled={isPending}
                className="text-label text-[10px] text-(--color-danger) hover:underline disabled:opacity-50"
              >
                Удалить связь
              </button>
            </li>
          );
        })}
        {relationships.length === 0 && (
          <p className="text-sm text-(--color-fg-muted)">Связей пока нет.</p>
        )}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}

      <AddRelationshipForm
        personId={personId}
        currentPersonName={buildDisplayName(allPeople.find((p) => p.id === personId) ?? { firstName: "", middleName: null, lastName: null, maidenName: null })}
        allPeople={allPeople.filter((p) => p.id !== personId)}
      />
    </div>
  );
}

function AddRelationshipForm({
  personId,
  currentPersonName,
  allPeople,
}: {
  personId: string;
  currentPersonName: string;
  allPeople: Person[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [relationshipType, setRelationshipType] = useState<string>("biological_parent");
  const [direction, setDirection] = useState<"this-is-parent" | "this-is-child">("this-is-parent");
  const [parentRole, setParentRole] = useState<string>("mother");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const selectedName = selected ? buildDisplayName(selected) : "найденный человек";

  const searchable = allPeople.map((person) => ({
    id: person.id,
    firstName: person.firstName,
    middleName: person.middleName,
    lastName: person.lastName,
    maidenName: person.maidenName,
    displayName: buildDisplayName(person),
  }));
  const results = query ? searchPeople(searchable, query) : [];
  const isParentType = PARENT_TYPES.has(relationshipType);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Выберите человека из списка.");
      return;
    }
    setError(null);

    const fromPersonId = isParentType ? (direction === "this-is-parent" ? personId : selected.id) : personId;
    const toPersonId = isParentType ? (direction === "this-is-parent" ? selected.id : personId) : selected.id;

    startTransition(async () => {
      const result = await createRelationshipAction({
        fromPersonId,
        toPersonId,
        relationshipType,
        parentRole: isParentType ? parentRole : null,
        note: null,
      });
      if (result.ok) {
        setSelected(null);
        setQuery("");
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось сохранить связь.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-inset) p-4"
    >
      <p className="text-label text-xs text-(--color-fg-muted)">Добавить связь с существующей карточкой человека</p>
      <p className="text-sm text-(--color-fg-muted)">
        Вы редактируете карточку <span className="font-medium text-(--color-fg)">{currentPersonName}</span>.
        Найдите второго человека, а затем укажите, как он связан с {currentPersonName}.
      </p>

      <div className="relative">
        <Input
          placeholder="Найти второго человека…"
          value={selected ? buildDisplayName(selected) : query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
        />
        {query && !selected && results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) shadow-(--shadow-md)">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    const person = allPeople.find((p) => p.id === result.id) ?? null;
                    setSelected(person);
                    setQuery("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-(--color-bg)"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
        {query && !selected && results.length === 0 && (
          <p className="mt-1 text-xs text-(--color-fg-muted)">
            Никого не найдено. Чтобы добавить нового человека, используйте быстрые действия на странице
            родственника.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-(--color-fg)">Вид связи (кровные, приёмные, брак…)</span>
          <select
            value={relationshipType}
            onChange={(event) => setRelationshipType(event.target.value)}
            className={selectClassName}
          >
            {RELATIONSHIP_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isParentType && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-(--color-fg)">Кто кому родитель</span>
              <select
                value={direction}
                onChange={(event) => setDirection(event.target.value as typeof direction)}
                className={cn(selectClassName, "min-w-56")}
              >
                <option value="this-is-parent">
                  {currentPersonName} — родитель, {selectedName} — ребёнок
                </option>
                <option value="this-is-child">
                  {selectedName} — родитель, {currentPersonName} — ребёнок
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-(--color-fg)">
                Пол родителя ({direction === "this-is-parent" ? currentPersonName : selectedName})
              </span>
              <select
                value={parentRole}
                onChange={(event) => setParentRole(event.target.value)}
                className={selectClassName}
              >
                <option value="mother">Мать</option>
                <option value="father">Отец</option>
              </select>
            </label>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Сохраняем…" : "Добавить связь"}
        </Button>
      </div>
    </form>
  );
}
