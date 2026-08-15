import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";
import { requireEditor, NotAuthorizedError } from "@/server/auth/require-editor";
import { listPeople, listDeletedPeople } from "@/server/repositories/people";
import { getTotalStorageBytes } from "@/server/repositories/media";
import { buildDisplayName } from "@/lib/names/display-name";
import { RestorePersonButton } from "@/components/forms/restore-person-button";

const EXPECTED_TOTAL_BYTES = 5 * 1024 * 1024 * 1024; // ~5 ГБ (CLAUDE.md 3.7)

function formatGigabytes(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2);
}

export const metadata: Metadata = {
  title: "Панель редактора",
  robots: { index: false, follow: false },
};

export default async function EditHomePage() {
  let editor: Awaited<ReturnType<typeof requireEditor>>;
  try {
    editor = await requireEditor();
  } catch (error) {
    if (error instanceof NotAuthorizedError) redirect("/login");
    throw error;
  }

  const [people, deletedPeople, storageBytes] = await Promise.all([
    listPeople(editor.supabase),
    listDeletedPeople(editor.supabase),
    getTotalStorageBytes(editor.supabase),
  ]);
  const storagePercent = Math.min(100, Math.round((storageBytes / EXPECTED_TOTAL_BYTES) * 100));

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Панель редактора</h1>
            <p className="text-sm text-(--color-fg-muted)">Вы вошли как {editor.displayName}.</p>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              Выйти
            </Button>
          </form>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/edit/people/new">
            <Button type="button">Создать человека</Button>
          </Link>
          <Link href="/">
            <Button type="button" variant="secondary">
              Вернуться к дереву
            </Button>
          </Link>
        </div>

        <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-4">
          <h2 className="text-label text-xs text-(--color-fg-muted)">Хранилище файлов</h2>
          <p className="text-sm text-(--color-fg)">
            {formatGigabytes(storageBytes)} ГБ из ~5 ГБ ожидаемого объёма
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-(--color-border)">
            <div
              className="h-full rounded-full bg-(--color-accent)"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-label text-xs text-(--color-fg-muted)">Люди ({people.length})</h2>
          {people.length === 0 ? (
            <p className="text-sm text-(--color-fg-muted)">Пока никого нет.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {people.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/edit/people/${person.id}`}
                    className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-sm text-(--color-fg) hover:bg-(--color-bg-elevated)"
                  >
                    {buildDisplayName(person) || "Без имени"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {deletedPeople.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-label text-xs text-(--color-fg-muted)">
              Удалённые ({deletedPeople.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {deletedPeople.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2"
                >
                  <span className="text-sm text-(--color-fg-muted)">
                    {buildDisplayName(person) || "Без имени"}
                  </span>
                  <RestorePersonButton personId={person.id} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
