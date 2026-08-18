import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SiteGallery } from "@/components/media/site-gallery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAllMediaForPicker } from "@/server/repositories/media";

export const metadata: Metadata = {
  title: "Фотоальбом",
  description: "Все фотографии семейного архива Огурцовых в одном месте.",
};

export default async function GalleryPage() {
  const supabase = await createSupabaseServerClient();
  const allMedia = await listAllMediaForPicker(supabase);
  const photos = allMedia.filter((item) => item.kind === "photo");

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 py-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Фотоальбом</h1>
          <p className="mt-1 text-sm text-(--color-fg-muted)">
            Все фотографии семейного архива — {photos.length}.
          </p>
        </div>
        <SiteGallery photos={photos} />
      </main>
    </div>
  );
}
