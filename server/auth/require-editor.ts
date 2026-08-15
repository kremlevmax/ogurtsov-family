import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class NotAuthorizedError extends Error {
  constructor() {
    super("Требуется вход редактора");
    this.name = "NotAuthorizedError";
  }
}

/**
 * Confirms the current request has an authenticated session AND that
 * the user is a registered editor — checked here explicitly, not only
 * relied on via RLS (CLAUDE.md 13). Throws NotAuthorizedError if not.
 */
export async function requireEditor() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new NotAuthorizedError();

  const { data: editor } = await supabase
    .from("editors")
    .select("user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!editor) throw new NotAuthorizedError();

  return { supabase, editorId: editor.user_id, displayName: editor.display_name };
}

/** Non-throwing variant for pages that just need to know if the viewer can edit. */
export async function getEditorSession() {
  try {
    return await requireEditor();
  } catch {
    return null;
  }
}
