import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/header";
import { PersonDetailContent } from "@/components/people/person-detail-content";
import { getChildren, getParents, getPartners, getSiblings } from "@/features/people/relations";
import { buildDisplayName } from "@/lib/names/display-name";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPeople, getPersonById } from "@/server/repositories/people";
import { listRelationships } from "@/server/repositories/relationships";
import { listMediaForPerson } from "@/server/repositories/media";
import { getLoungeViewer } from "@/server/auth/require-lounge-member";

export async function generateMetadata(props: PageProps<"/people/[personId]">): Promise<Metadata> {
  const { personId } = await props.params;
  const supabase = await createSupabaseServerClient();
  const person = await getPersonById(supabase, personId);
  if (!person) return { title: "Человек не найден", robots: { index: false, follow: false } };

  const displayName = buildDisplayName(person);
  return {
    title: displayName,
    description: person.shortBio ?? `Страница ${displayName} в семейном дереве Огурцовых.`,
  };
}

export default async function PersonPage(props: PageProps<"/people/[personId]">) {
  const { personId } = await props.params;
  const supabase = await createSupabaseServerClient();
  const [person, people, relationships, allMedia, viewer] = await Promise.all([
    getPersonById(supabase, personId),
    listPeople(supabase),
    listRelationships(supabase),
    listMediaForPerson(supabase, personId),
    getLoungeViewer(),
  ]);
  if (!person) notFound();
  // Public page — a file linked here only for the upload pipeline's
  // sake (`unlisted`) never appears in this person's own gallery.
  const media = allMedia.filter((item) => !item.unlisted);

  const parents = getParents(person.id, people, relationships);
  const partners = getPartners(person.id, people, relationships);
  const children = getChildren(person.id, people, relationships);
  const siblings = getSiblings(person.id, people, relationships);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 py-8">
        <Link
          href="/tree"
          className="text-label inline-flex w-fit items-center gap-1.5 text-xs text-(--color-fg-muted) transition-colors hover:text-(--color-accent)"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Ко всему дереву
        </Link>

        <PersonDetailContent
          person={person}
          parents={parents}
          partners={partners}
          childPeople={children}
          siblings={siblings}
          media={media}
          viewer={{ isEditor: viewer.isEditor, memberId: viewer.userId }}
        />
      </main>
    </div>
  );
}
