import type { MediaKind } from "@/lib/supabase/types";

/** A media item as linked to one specific person (CLAUDE.md 7.5, 7.6). */
export interface PersonMedia {
  id: string;
  kind: MediaKind;
  title: string;
  caption: string | null;
  sourceOrOwner: string | null;
  originalFilename: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  objectKey: string;
  isProfile: boolean;
  /** True when this file is also linked to at least one other person — controls whether "delete" removes it everywhere or just unlinks it here (CLAUDE.md 3.7). */
  linkedToOtherPeople: boolean;
}

/**
 * One already-uploaded file, for the "attach an existing file" picker
 * (CLAUDE.md 3.7: один объект может быть связан с несколькими людьми —
 * реюз без повторной загрузки). `linkedPersonNames` is just for display
 * ("уже привязано к: ..."), not used for any logic.
 */
export interface MediaPickerItem {
  id: string;
  kind: MediaKind;
  title: string;
  caption: string | null;
  extension: string;
  originalFilename: string;
  sizeBytes: number;
  objectKey: string;
  linkedPersonIds: string[];
  linkedPersonNames: string[];
}

/** A soft-deleted file, for the editor's "Корзина файлов" (CLAUDE.md 13: restore safety for accidental deletes). */
export interface DeletedMediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  extension: string;
  deletedAt: string;
  linkedPersonNames: string[];
}
