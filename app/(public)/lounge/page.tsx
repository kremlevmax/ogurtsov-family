import type { Metadata } from "next";
import { FamilyLounge } from "@/components/lounge/family-lounge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLoungeViewer } from "@/server/auth/require-lounge-member";
import { getLoungePinnedMessage, listLoungeMessages } from "@/server/repositories/lounge";

export const metadata: Metadata = {
  title: "Семейная гостиная",
  description: "Новости, воспоминания и тёплые слова родным от потомков семьи Огурцовых.",
};

export default async function LoungePage() {
  const viewer = await getLoungeViewer();
  const supabase = await createSupabaseServerClient();

  // Falls back to an honest "не удалось загрузить" state (not a crashed
  // page, not a silent empty feed) — e.g. before migration
  // 0007_add_lounge.sql has been applied to the live project.
  let messages: Awaited<ReturnType<typeof listLoungeMessages>> = [];
  let loadError = false;
  try {
    messages = await listLoungeMessages(supabase, { userId: viewer.userId, isEditor: viewer.isEditor });
  } catch (error) {
    console.error(error);
    loadError = true;
  }

  // Same fallback shape as messages above — before 0014_lounge_pinned_message.sql
  // is applied, this just degrades to "no banner" rather than a crashed page.
  let pinnedMessage: string | null = null;
  try {
    const pinned = await getLoungePinnedMessage(supabase);
    pinnedMessage = pinned?.body ?? null;
  } catch (error) {
    console.error(error);
  }

  return <FamilyLounge viewer={viewer} messages={messages} loadError={loadError} pinnedMessage={pinnedMessage} />;
}
