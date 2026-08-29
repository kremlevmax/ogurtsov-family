import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listUnlistedAudio } from "@/server/repositories/media";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import { formatFileSize } from "@/lib/media/format";

export const metadata: Metadata = {
  title: "Аудиоверсия истории",
  description: "История рода Огурцовых в записи.",
};

/**
 * Reachable only from the direct "Слушать аудио" links on the title
 * page — not linked from any person's own card or the general archive
 * (this recording is about the whole family, attached to one person
 * only because the upload pipeline requires a link target; see
 * `media.unlisted`, docs/DECISIONS.md 2026-08-28).
 */
export default async function AudioPage() {
  const supabase = await createSupabaseServerClient();
  const recordings = await listUnlistedAudio(supabase);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-(--color-fg)">Аудиоверсия истории</h1>
          <p className="mt-1 text-sm text-(--color-fg-muted)">История рода Огурцовых, рассказанная вслух.</p>
        </div>

        {recordings.length === 0 ? (
          <p className="text-sm text-(--color-fg-muted)">Запись пока не добавлена.</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {recordings.map((recording) => {
              const url = getMediaPublicUrl(recording.objectKey);
              return (
                <li
                  key={recording.id}
                  className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-5"
                >
                  <div>
                    <p className="font-heading text-lg font-bold text-(--color-fg)">{recording.title}</p>
                    {recording.caption && <p className="mt-1 text-sm text-(--color-fg-muted)">{recording.caption}</p>}
                  </div>
                  {url ? (
                    <>
                      <audio controls preload="none" className="w-full" src={url}>
                        Ваш браузер не поддерживает воспроизведение аудио.
                      </audio>
                      <a
                        href={url}
                        download={recording.originalFilename}
                        className="text-label w-fit text-xs text-(--color-accent) hover:underline"
                      >
                        Скачать файл ({formatFileSize(recording.sizeBytes)})
                      </a>
                    </>
                  ) : (
                    <p className="text-sm text-(--color-danger)">Не удалось получить ссылку на файл.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
