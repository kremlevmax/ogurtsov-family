import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SiteArchive } from "@/components/media/site-archive";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAllMediaForPicker } from "@/server/repositories/media";

export const metadata: Metadata = {
  title: "Архив документов",
  description: "Все документы и файлы семейного архива Огурцовых в одном месте.",
};

export default async function ArchivePage() {
  const supabase = await createSupabaseServerClient();
  const allMedia = await listAllMediaForPicker(supabase);
  const documents = allMedia.filter((item) => item.kind !== "photo" && !item.unlisted);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 py-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Архив документов</h1>
          <p className="mt-1 text-sm text-(--color-fg-muted)">
            Все документы и файлы семейного архива — {documents.length}.
          </p>
        </div>
        <SiteArchive documents={documents} />
      </main>
    </div>
  );
}
