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
}
