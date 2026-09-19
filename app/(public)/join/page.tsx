import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { getLoungeViewer } from "@/server/auth/require-lounge-member";
import { getOwnTreeAccessStatus } from "@/server/repositories/lounge-tree-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TreeAccessRequestForm } from "@/components/lounge/tree-access-request-form";

export const metadata: Metadata = {
  title: "Подтверждение родства",
  robots: { index: false, follow: false },
};

/**
 * "Подтверждение родства" (owner's mother's spec, 2026-09-18) — a
 * separate step from registration: a signed-in "Гость" asks an editor
 * for the right to add people to the tree. Not yet wired as the
 * auto-opening modal the spec describes (that's a later pass on the
 * modal conversion); for now this is a standalone page a member reaches
 * from "Присоединиться к проекту" on the homepage.
 */
export default async function JoinPage() {
  const viewer = await getLoungeViewer();
  if (!viewer.userId) redirect("/login?next=/join");

  if (viewer.isEditor || viewer.hasTreeAccess) {
    return (
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
          <p className="text-lg text-(--color-fg)">
            У вас уже есть доступ к добавлению людей в родословное дерево.
          </p>
        </main>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const status = await getOwnTreeAccessStatus(supabase, viewer.userId);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 p-4">
        <TreeAccessRequestForm initialStatus={status} />
      </main>
    </div>
  );
}
