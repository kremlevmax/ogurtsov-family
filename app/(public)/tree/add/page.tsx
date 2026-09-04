import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { PersonForm } from "@/components/forms/person-form";
import { requireLoungeMember, NotLoungeMemberError } from "@/server/auth/require-lounge-member";
import { getPersonById } from "@/server/repositories/people";
import { buildDisplayName } from "@/lib/names/display-name";
import type { QuickRelation, QuickRelationKind } from "@/features/people/quick-relation";

export const metadata: Metadata = {
  title: "Добавить человека",
  robots: { index: false, follow: false },
};

const QUICK_RELATION_KINDS: QuickRelationKind[] = ["mother", "father", "parent", "spouse", "child"];

/**
 * The contributor-facing twin of app/edit/people/new/page.tsx — same
 * form, same repository/action layer (server/actions/people.ts now
 * accepts any registered member, not just editors — docs/DECISIONS.md),
 * different auth gate and a public, non-admin URL. Deliberately outside
 * /edit: that area's proxy.ts middleware and its other tools (media
 * archive, restoring anyone, site settings) stay editor-only.
 */
export default async function AddPersonPage(props: PageProps<"/tree/add">) {
  const searchParams = await props.searchParams;
  const relationToId = typeof searchParams.relationTo === "string" ? searchParams.relationTo : null;
  const relationKindRaw = typeof searchParams.relationKind === "string" ? searchParams.relationKind : null;
  const relationKind = QUICK_RELATION_KINDS.find((kind) => kind === relationKindRaw) ?? null;

  const currentPath =
    relationToId && relationKind
      ? `/tree/add?relationTo=${encodeURIComponent(relationToId)}&relationKind=${encodeURIComponent(relationKind)}`
      : "/tree/add";

  let member: Awaited<ReturnType<typeof requireLoungeMember>>;
  try {
    member = await requireLoungeMember();
  } catch (error) {
    if (error instanceof NotLoungeMemberError) {
      redirect(`/login?next=${encodeURIComponent(currentPath)}`);
    }
    throw error;
  }

  let quickRelation: QuickRelation | null = null;
  if (relationToId && relationKind) {
    const relationToPerson = await getPersonById(member.supabase, relationToId);
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
        <Link href="/tree" className="text-label w-fit text-xs text-(--color-fg-muted) hover:text-(--color-accent)">
          ← К дереву
        </Link>
        <h1 className="font-heading text-2xl font-bold">Добавить человека</h1>
        <p className="text-sm text-(--color-fg-muted)">
          Вы сможете редактировать и удалить только добавленных вами людей.
        </p>
        <PersonForm mode="create" quickRelation={quickRelation} redirectAfterCreate="tree-edit" />
      </main>
    </div>
  );
}
