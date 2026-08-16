import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { PersonForm } from "@/components/forms/person-form";
import { RelationshipManager } from "@/components/forms/relationship-manager";
import { DeletePersonButton } from "@/components/forms/delete-person-button";
import { RestorePersonButton } from "@/components/forms/restore-person-button";
import { MediaManager } from "@/components/forms/media-manager";
import { requireEditor, NotAuthorizedError } from "@/server/auth/require-editor";
import { getPersonByIdIncludingDeleted, listPeople } from "@/server/repositories/people";
import { listRelationships, countDependentRelationships } from "@/server/repositories/relationships";
import { listMediaForPerson } from "@/server/repositories/media";
import { buildDisplayName } from "@/lib/names/display-name";
import type { DateValue } from "@/lib/dates/date-value";

export const metadata: Metadata = {
  title: "Редактирование человека",
  robots: { index: false, follow: false },
};

const EMPTY_DATE: DateValue = { precision: "unknown", start: null, end: null, text: null };

export default async function EditPersonPage(props: PageProps<"/edit/people/[personId]">) {
  const { personId } = await props.params;

  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch (error) {
    if (error instanceof NotAuthorizedError) redirect("/login");
    throw error;
  }

  const [result, allPeople, allRelationships, media, dependentCount] = await Promise.all([
    getPersonByIdIncludingDeleted(editor.supabase, personId),
    listPeople(editor.supabase),
    listRelationships(editor.supabase),
    listMediaForPerson(editor.supabase, personId),
    countDependentRelationships(editor.supabase, personId),
  ]);
  if (!result) notFound();
  const { person, deletedAt } = result;

  const personRelationships = allRelationships.filter(
    (rel) => rel.fromPersonId === personId || rel.toPersonId === personId,
  );

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-8">
        <div className="flex items-center justify-between">
          <Link
            href="/edit"
            className="text-label text-xs text-(--color-fg-muted) hover:text-(--color-accent)"
          >
            ← Панель редактора
          </Link>
          <Link
            href={`/people/${personId}`}
            className="text-label text-xs text-(--color-fg-muted) hover:text-(--color-accent)"
          >
            Открыть страницу →
          </Link>
        </div>

        <h1 className="font-heading text-2xl font-bold">Редактирование: {buildDisplayName(person)}</h1>

        {deletedAt && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-(--color-danger) bg-(--color-bg-elevated) px-4 py-3">
            <p className="text-sm text-(--color-fg)">
              Этот человек удалён и не виден посетителям сайта.
            </p>
            <RestorePersonButton personId={personId} />
          </div>
        )}

        <PersonForm
          mode="edit"
          personId={personId}
          defaultValues={{
            firstName: person.firstName,
            middleName: person.middleName ?? "",
            lastName: person.lastName ?? "",
            maidenName: person.maidenName ?? "",
            isPlaceholder: person.isPlaceholder,
            isDeceased: person.isDeceased,
            birth: person.birth ?? EMPTY_DATE,
            death: person.death ?? EMPTY_DATE,
            birthPlace: person.birthPlace ?? "",
            deathPlace: person.deathPlace ?? "",
            profession: person.profession ?? "",
            education: person.education ?? "",
            shortBio: person.shortBio ?? "",
          }}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-label text-xs text-(--color-fg-muted)">Фото и файлы</h2>
          <MediaManager personId={personId} media={media} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-label text-xs text-(--color-fg-muted)">Связи</h2>
          <RelationshipManager personId={personId} relationships={personRelationships} allPeople={allPeople} />
        </section>

        {!deletedAt && (
          <section className="flex flex-col gap-3">
            <h2 className="text-label text-xs text-(--color-fg-muted)">Опасная зона</h2>
            <DeletePersonButton personId={personId} dependentCount={dependentCount} />
          </section>
        )}
      </main>
    </div>
  );
}
