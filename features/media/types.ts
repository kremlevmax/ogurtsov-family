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
  /** True for a file that's linked here only so it exists in the database — hidden from this person's own public gallery/document list; public pages filter these out themselves (repositories always return the full set so the editor can still see and manage them). */
  unlisted: boolean;
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
  /** Free-text approximate date ("около 1980", "2024 год") — `media.date_text`. Used by the Places photo tab; null for most people photos, which don't set it. */
  dateText: string | null;
  /** One of lib/validation/document-category.ts's DOCUMENT_CATEGORIES, or null (groups under "Другие документы" in the UI) — documents only. */
  category: string | null;
  /** Object key of a small first-page PNG rendered client-side at upload time (PDF cards only) — null for everything else, including a PDF uploaded before this feature existed. */
  thumbnailObjectKey: string | null;
  extension: string;
  originalFilename: string;
  sizeBytes: number;
  objectKey: string;
  linkedPersonIds: string[];
  linkedPersonNames: string[];
  unlisted: boolean;
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

/**
 * Full detail for one document — /archive/[documentId] (DocumentViewer).
 * A superset of MediaPickerItem's fields plus the two viewer-only tabs'
 * content (transcript, sourceOrOwner) that the gallery card never needs.
 */
export interface DocumentDetail {
  id: string;
  kind: MediaKind;
  title: string;
  caption: string | null;
  category: string | null;
  transcript: string | null;
  sourceOrOwner: string | null;
  dateText: string | null;
  extension: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  linkedPersonIds: string[];
  linkedPersonNames: string[];
}
