/**
 * Hand-written to mirror supabase/migrations/0001_init.sql. Once a
 * remote Supabase project exists, replace with `supabase gen types
 * typescript` output (CLAUDE.md 5.3) and delete this file's manual upkeep.
 */

export type DatePrecision = "unknown" | "exact" | "year" | "month" | "approximate" | "range";

export type RelationshipType =
  | "biological_parent"
  | "adoptive_parent"
  | "foster_parent"
  | "guardian"
  | "spouse"
  | "former_spouse"
  | "partner";

export type ParentRole = "mother" | "father" | "parent";

export type MediaKind = "photo" | "document" | "audio" | "video" | "archive" | "other";

export type PendingUploadStatus = "pending" | "completed" | "expired" | "failed";

export interface Database {
  public: {
    Tables: {
      editors: {
        Row: { user_id: string; display_name: string; created_at: string };
        Insert: { user_id: string; display_name: string; created_at?: string };
        Update: Partial<{ display_name: string }>;
        Relationships: [];
      };
      places: {
        Row: {
          id: string;
          name: string;
          region: string | null;
          country: string | null;
          latitude: number | null;
          longitude: number | null;
          is_approximate: boolean;
          note: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["places"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["places"]["Row"]>;
        Relationships: [];
      };
      people: {
        Row: {
          id: string;
          first_name: string;
          middle_name: string | null;
          last_name: string | null;
          maiden_name: string | null;
          display_name: string;
          is_placeholder: boolean;
          birth_date_precision: DatePrecision;
          birth_date_start: string | null;
          birth_date_end: string | null;
          birth_date_text: string | null;
          birth_place_id: string | null;
          death_date_precision: DatePrecision;
          death_date_start: string | null;
          death_date_end: string | null;
          death_date_text: string | null;
          death_place_id: string | null;
          is_deceased: boolean;
          profession: string | null;
          education: string | null;
          short_bio: string | null;
          branch_color: string | null;
          highlight_color: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["people"]["Row"]> & {
          first_name: string;
          display_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["people"]["Row"]>;
        Relationships: [];
      };
      relationships: {
        Row: {
          id: string;
          from_person_id: string;
          to_person_id: string;
          relationship_type: RelationshipType;
          parent_role: ParentRole | null;
          start_date_precision: DatePrecision;
          start_date_start: string | null;
          start_date_end: string | null;
          start_date_text: string | null;
          end_date_precision: DatePrecision;
          end_date_start: string | null;
          end_date_end: string | null;
          end_date_text: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["relationships"]["Row"]> & {
          from_person_id: string;
          to_person_id: string;
          relationship_type: RelationshipType;
        };
        Update: Partial<Database["public"]["Tables"]["relationships"]["Row"]>;
        Relationships: [];
      };
      media: {
        Row: {
          id: string;
          kind: MediaKind;
          title: string;
          caption: string | null;
          source_or_owner: string | null;
          date_precision: DatePrecision;
          date_start: string | null;
          date_end: string | null;
          date_text: string | null;
          place_id: string | null;
          object_key: string;
          original_filename: string;
          mime_type: string;
          extension: string;
          size_bytes: number;
          sha256: string | null;
          width: number | null;
          height: number | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["media"]["Row"]> & {
          kind: MediaKind;
          title: string;
          object_key: string;
          original_filename: string;
          mime_type: string;
          extension: string;
          size_bytes: number;
        };
        Update: Partial<Database["public"]["Tables"]["media"]["Row"]>;
        Relationships: [];
      };
      person_media: {
        Row: {
          person_id: string;
          media_id: string;
          is_profile: boolean;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["person_media"]["Row"]> & {
          person_id: string;
          media_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["person_media"]["Row"]>;
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: boolean;
          site_title: string;
          root_person_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["site_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["site_settings"]["Row"]>;
        Relationships: [];
      };
      pending_uploads: {
        Row: {
          id: string;
          editor_id: string;
          object_key: string;
          expected_mime_type: string;
          expected_size_bytes: number;
          status: PendingUploadStatus;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pending_uploads"]["Row"]> & {
          editor_id: string;
          object_key: string;
          expected_mime_type: string;
          expected_size_bytes: number;
          expires_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["pending_uploads"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
