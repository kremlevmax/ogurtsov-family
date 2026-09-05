import type { Metadata } from "next";
import { Suspense } from "react";
import { DocumentGallery } from "@/components/media/document-gallery";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAllMediaForPicker } from "@/server/repositories/media";
import { getLoungeViewer } from "@/server/auth/require-lounge-member";

export const metadata: Metadata = {
  title: "Документы",
  description: "Архивные документы и файлы семейного архива Огурцовых — по категориям, с поиском.",
};

export default async function ArchivePage() {
  const supabase = await createSupabaseServerClient();
  const [allMedia, viewer] = await Promise.all([listAllMediaForPicker(supabase), getLoungeViewer()]);
  const documents = allMedia.filter((item) => item.kind !== "photo" && !item.unlisted);

  return (
    <Suspense>
      <DocumentGallery documents={documents} isMember={viewer.isMember} isEditor={viewer.isEditor} />
    </Suspense>
  );
}
