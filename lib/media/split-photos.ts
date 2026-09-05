import type { MediaPickerItem } from "@/features/media/types";

export interface SplitPhotos {
  people: MediaPickerItem[];
  places: MediaPickerItem[];
}

/**
 * Splits the site's photo list into the two "Фотографии" tabs (owner's
 * Figma handoff request). "People" photos are linked to at least one
 * person via `person_media`; "Places" photos have no person link at
 * all — uploaded through the places-only form (server/actions/place-media.ts),
 * which never creates a person_media row. No new DB column needed: the
 * existing `linkedPersonIds` already distinguishes the two.
 */
export function splitPhotosByLinkage(photos: MediaPickerItem[]): SplitPhotos {
  const people: MediaPickerItem[] = [];
  const places: MediaPickerItem[] = [];
  for (const photo of photos) {
    (photo.linkedPersonIds.length > 0 ? people : places).push(photo);
  }
  return { people, places };
}
