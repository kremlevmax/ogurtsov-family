import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { PersonForm } from "@/components/forms/person-form";
import { RelationshipManager } from "@/components/forms/relationship-manager";
import { DeletePersonButton } from "@/components/forms/delete-person-button";
import { requireLoungeMember, NotLoungeMemberError } from "@/server/auth/require-lounge-member";
import { getPersonById, listPeople } from "@/server/repositories/people";
import { listRelationships, countDependentRelationships } from "@/server/repositories/relationships";
import { buildDisplayName } from "@/lib/names/display-name";
import type { DateValue } from "@/lib/dates/date-value";

export const metadata: Metadata = {
  title: "Редактирование человека",
  robots: { index: false, follow: false },
};

const EMPTY_DATE: DateValue = { precision: "unknown", start: null, end: null, text: null };

/**
 * The contributor-facing twin of app/edit/people/[personId]/page.tsx —
 * scoped to a person the current member actually added themselves (RLS
 * enforces this on every write regardless, but there's no reason to
 * even render an edit form the member can't save — CLAUDE.md 15). No
 * media manager, no restore-from-trash: both stay editor-only tools in
 * /edit (docs/DECISIONS.md).
 */
export default async function ContributorEditPersonPage(props: PageProps<"/tree/edit/[personId]">) {
  const { personId } = await props.params;

  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch (error) {
    if (error instanceof NotLoungeMemberError) {
      redirect(`/lounge/login?next=${encodeURIComponent(`/tree/edit/${personId}`)}`);
    }
    throw error;
  }

  const person = await getPersonById(member.supabase, personId);
  if (!person) notFound();
  if (person.createdBy !== member.userId) redirect(`/people/${personId}`);

  const [allPeople, allRelationships, dependentCount] = await Promise.all([
    listPeople(member.supabase),
    listRelationships(member.supabase),
    countDependentRelationships(member.supabase, personId),
  ]);
  const personRelationships = allRelationships.filter(
    (rel) => rel.fromPersonId === personId || rel.toPersonId === personId,
  );

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/tree" className="text-label text-xs text-(--color-fg-muted) hover:text-(--color-accent)">
            ← К дереву
          </Link>
          <Link
            href={`/people/${personId}`}
            className="text-label text-xs text-(--color-fg-muted) hover:text-(--color-accent)"
          >
            Открыть страницу →
          </Link>
        </div>

        <h1 className="font-heading text-2xl font-bold">Редактирование: {buildDisplayName(person)}</h1>
        <p className="text-sm text-(--color-fg-muted)">
          Вы видите эту форму, потому что сами добавили этого человека. Изменения появятся на сайте сразу.
        </p>

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
            branchColor: person.branchColor,
            highlightColor: person.highlightColor,
          }}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-label text-xs text-(--color-fg-muted)">Связи</h2>
          <RelationshipManager personId={personId} relationships={personRelationships} allPeople={allPeople} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-label text-xs text-(--color-fg-muted)">Опасная зона</h2>
          <DeletePersonButton
            personId={personId}
            dependentCount={dependentCount}
            redirectTo="/tree"
            restoreNote="Удалённого человека сможет восстановить только владелец сайта."
          />
        </section>
      </main>
    </div>
  );
}
