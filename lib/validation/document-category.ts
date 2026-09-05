/**
 * Document categories for the "Документы" sidebar/filter
 * (ogurtsovy_pages_handoff_v2). Plain text on `media.category`
 * (0016_media_category_transcript.sql), not a DB enum — this fixed
 * list is the only place the set of valid values is enforced. A
 * document with no category (`null`) groups under "Другие документы"
 * in the UI without ever writing that string to the row itself.
 */
export const DOCUMENT_CATEGORIES = [
  "Старинные документы",
  "Личные документы",
  "Письма",
  "Семейные истории",
  "Ответы архивов и справки",
  "Другие документы",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const UNCATEGORIZED_LABEL: DocumentCategory = "Другие документы";

/** The category a document's own `category` groups under in the sidebar — `null`/unrecognized values fall back to "Другие документы". */
export function resolveDocumentCategory(category: string | null): DocumentCategory {
  const match = DOCUMENT_CATEGORIES.find((candidate) => candidate === category);
  return match ?? UNCATEGORIZED_LABEL;
}
