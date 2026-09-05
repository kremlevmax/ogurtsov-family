import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { PhotosShell } from "@/components/media/photos-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAllMediaForPicker } from "@/server/repositories/media";
import { getLoungeViewer } from "@/server/auth/require-lounge-member";
import { splitPhotosByLinkage } from "@/lib/media/split-photos";

export const metadata: Metadata = {
  title: "Фотографии",
  description: "Фотографии людей и мест семейного архива Огурцовых — «Люди нашего рода» и «Места нашей истории».",
};

/**
 * "Фотографии" — People/Places tabs (ogurtsovy_pages_handoff_v2,
 * owner's request). `PhotosShell` reads/writes the active tab via
 * `?tab=`, hence the Suspense boundary (Next.js requires one around
 * any `useSearchParams()` client component).
 */
export default async function GalleryPage() {
  const supabase = await createSupabaseServerClient();
  const [allMedia, viewer] = await Promise.all([listAllMediaForPicker(supabase), getLoungeViewer()]);
  const photos = allMedia.filter((item) => item.kind === "photo" && !item.unlisted);
  const { people, places } = splitPhotosByLinkage(photos);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <Suspense>
        <PhotosShell people={people} places={places} isMember={viewer.isMember} isEditor={viewer.isEditor} />
      </Suspense>
    </div>
  );
}
