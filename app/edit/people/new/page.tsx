import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { PersonForm } from "@/components/forms/person-form";
import { requireEditor, NotAuthorizedError } from "@/server/auth/require-editor";
import { getPersonById } from "@/server/repositories/people";
import { buildDisplayName } from "@/lib/names/display-name";
import type { QuickRelation, QuickRelationKind } from "@/features/people/quick-relation";

export const metadata: Metadata = {
  title: "Новый человек",
  robots: { index: false, follow: false },
};

const QUICK_RELATION_KINDS: QuickRelationKind[] = ["mother", "father", "parent", "spouse", "child"];

export default async function NewPersonPage(props: PageProps<"/edit/people/new">) {
  const searchParams = await props.searchParams;

  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch (error) {
    if (error instanceof NotAuthorizedError) redirect("/login");
    throw error;
  }

  const relationToId = typeof searchParams.relationTo === "string" ? searchParams.relationTo : null;
  const relationKindRaw = typeof searchParams.relationKind === "string" ? searchParams.relationKind : null;
  const relationKind = QUICK_RELATION_KINDS.find((kind) => kind === relationKindRaw) ?? null;

  let quickRelation: QuickRelation | null = null;
  if (relationToId && relationKind) {
    const relationToPerson = await getPersonById(editor.supabase, relationToId);
    if (relationToPerson) {
      quickRelation = {
        relationTo: relationToId,
        relationKind,
        relationToName: buildDisplayName(relationToPerson),
      };
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 py-8">
        <Link
          href="/edit"
          className="text-label w-fit text-xs text-(--color-fg-muted) hover:text-(--color-accent)"
        >
          ← Панель редактора
        </Link>
        <h1 className="font-heading text-2xl font-bold">Новый человек</h1>
        <PersonForm mode="create" quickRelation={quickRelation} />
      </main>
    </div>
  );
}
