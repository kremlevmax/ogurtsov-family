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

/**
 * A stuck refresh-token loop (e.g. a stale cookie racing another tab's
 * token rotation — Supabase refresh tokens are single-use) can leave
 * `supabase.auth.getUser()` retrying for a long time. Public pages call
 * this on every render, so an unbounded wait here would stall the whole
 * page past Vercel's serverless timeout — not just for the affected
 * editor, but as a hung response. Capped well under that timeout so a
 * broken session degrades to "viewed as a visitor" instead.
 */
const EDITOR_SESSION_TIMEOUT_MS = 4000;

/** Non-throwing variant for pages that just need to know if the viewer can edit. */
export async function getEditorSession() {
  const session = requireEditor().catch(() => null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), EDITOR_SESSION_TIMEOUT_MS));
  return Promise.race([session, timeout]);
}
