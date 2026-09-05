"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MediaPickerItem } from "@/features/media/types";
import { HeritageHeader } from "./heritage-header";
import { PeoplePhotosTab } from "./people-photos-tab";
import { PlacesPhotosTab } from "./places-photos-tab";
import styles from "./heritage-tokens.module.css";

type Tab = "people" | "places";

export interface PhotosShellProps {
  people: MediaPickerItem[];
  places: MediaPickerItem[];
  isMember: boolean;
  isEditor: boolean;
}

/**
 * "Фотографии" — one section, two mutually exclusive tabs (owner's
 * Figma handoff: People and Places are never shown together). Tab
 * state lives in `?tab=`, not just component state, so a shared link
 * opens on the right tab and the browser Back button behaves sensibly
 * — `router.replace` (shallow, no scroll jump) rather than `push`,
 * since switching tabs isn't really "a new page" to step back through.
 */
export function PhotosShell({ people, places, isMember, isEditor }: PhotosShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "places" ? "places" : "people";

  function setTab(next: Tab) {
    const params = new URLSearchParams(searchParams);
    if (next === "people") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className={styles.scope}>
      <HeritageHeader />

      <div className="mx-auto w-full max-w-[1432px] px-4 pb-16">
        <div className="rounded-[var(--h-radius-panel)] border border-(--h-gold-500) bg-(--h-paper-light) shadow-(--h-shadow-panel)">
          <div className="px-[38px] pt-9">
            <p className="text-lg text-(--h-muted)">Главная / Фотографии</p>
            <h2 className="font-heading mt-1 text-4xl text-(--h-forest-800)">Фотографии</h2>

            <div className="mt-6 flex gap-2 border-b border-(--h-gold-200)" role="tablist" aria-label="Раздел фотографий">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "people"}
                onClick={() => setTab("people")}
                className={
                  tab === "people"
                    ? "cursor-pointer rounded-t-[var(--h-radius-control)] border border-b-0 border-(--h-gold-200) bg-(--h-forest-800) px-6 py-2.5 text-lg font-medium text-(--h-white-warm)"
                    : "cursor-pointer rounded-t-[var(--h-radius-control)] border border-b-0 border-transparent px-6 py-2.5 text-lg text-(--h-ink) hover:text-(--h-forest-800)"
                }
              >
                Люди нашего рода
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "places"}
                onClick={() => setTab("places")}
                className={
                  tab === "places"
                    ? "cursor-pointer rounded-t-[var(--h-radius-control)] border border-b-0 border-(--h-gold-200) bg-(--h-forest-800) px-6 py-2.5 text-lg font-medium text-(--h-white-warm)"
                    : "cursor-pointer rounded-t-[var(--h-radius-control)] border border-b-0 border-transparent px-6 py-2.5 text-lg text-(--h-ink) hover:text-(--h-forest-800)"
                }
              >
                Места нашей истории
              </button>
            </div>
          </div>

          {tab === "people" ? (
            <PeoplePhotosTab photos={people} isEditor={isEditor} />
          ) : (
            <PlacesPhotosTab photos={places} isMember={isMember} isEditor={isEditor} />
          )}
        </div>
      </div>
    </div>
  );
}
