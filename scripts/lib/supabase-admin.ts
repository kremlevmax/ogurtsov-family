import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface ScriptSupabase {
  supabase: SupabaseClient<Database>;
  /** false when falling back to the anon key — soft-deleted rows, `editors`, and other editors' `pending_uploads` will be invisible under RLS. */
  hasFullAccess: boolean;
}

/**
 * A true backup must see soft-deleted rows and editor-only tables, which
 * RLS hides from the anon key — so scripts prefer the service-role key
 * (never used by the running app itself, only by maintenance scripts;
 * CLAUDE.md 13). Falls back to the anon key with a clear warning so the
 * script still runs against a fresh project that has no service key set.
 */
export function createScriptSupabaseClient(): ScriptSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL не задан в .env.local");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return {
      supabase: createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } }),
      hasFullAccess: true,
    };
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("Ни SUPABASE_SERVICE_ROLE_KEY, ни NEXT_PUBLIC_SUPABASE_ANON_KEY не заданы в .env.local");
  }

  console.warn(
    "⚠ SUPABASE_SERVICE_ROLE_KEY не задан — скрипт пройдёт по анонимному ключу и НЕ увидит " +
      "мягко удалённых записей, таблицу editors и чужие pending_uploads. Для полного доступа впишите " +
      "service-role key (Supabase Dashboard → Project Settings → API) в .env.local.",
  );
  return {
    supabase: createClient<Database>(url, anonKey, { auth: { persistSession: false } }),
    hasFullAccess: false,
  };
}
