import { Headphones } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import { formatFileSize } from "@/lib/media/format";
import type { PersonMedia } from "@/features/media/types";

export interface StoryAudioPlayerProps {
  recordings: PersonMedia[];
}

/**
 * The "Слушать аудиоверсию" player, now living at the top of `/story`
 * itself instead of a separate `/audio` page (owner's request: one
 * page for both the text and the read-aloud version, player first).
 * Renders nothing if no recording has been uploaded yet — same silent
 * fallback the old page used.
 */
export function StoryAudioPlayer({ recordings }: StoryAudioPlayerProps) {
  if (recordings.length === 0) return null;

  return (
    <div
      id="audio"
      className="scroll-mt-20 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-5 shadow-[0_5px_18px_0_rgba(56,64,54,0.06)] sm:p-7"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-gold-light)/30 text-(--color-gold)">
          <Headphones className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-label text-xs font-bold tracking-[1.32px] text-(--color-fg-muted) uppercase">
            Аудиоверсия
          </p>
          <h2 className="font-heading text-lg font-bold text-(--color-fg)">История, рассказанная вслух</h2>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-5">
        {recordings.map((recording, index) => {
          const url = getMediaPublicUrl(recording.objectKey);
          return (
            <li
              key={recording.id}
              className={
                index > 0 ? "flex flex-col gap-2 border-t border-(--color-border) pt-5" : "flex flex-col gap-2"
              }
            >
              {recordings.length > 1 && (
                <p className="font-heading text-sm font-bold text-(--color-fg)">{recording.title}</p>
              )}
              {recording.caption && <p className="text-sm text-(--color-fg-muted)">{recording.caption}</p>}
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
    </div>
  );
}
