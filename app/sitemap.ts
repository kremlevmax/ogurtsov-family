import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPeople } from "@/server/repositories/people";

/** Placeholder people ("Неизвестный отец" и т.п.) не несут полезной информации — не публикуем их в sitemap (CLAUDE.md 19). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const people = await listPeople(supabase);

  const personEntries: MetadataRoute.Sitemap = people
    .filter((person) => !person.isPlaceholder)
    .map((person) => ({
      url: `${siteUrl}/people/${person.id}`,
      changeFrequency: "monthly",
    }));

  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/gallery`, changeFrequency: "weekly" },
    { url: `${siteUrl}/archive`, changeFrequency: "weekly" },
    ...personEntries,
  ];
}
