import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class NotLoungeMemberError extends Error {
  constructor() {
    super("Требуется вход в гостиную");
    this.name = "NotLoungeMemberError";
  }
}

/**
 * Confirms the current request has a session AND a lounge_profiles row
 * (i.e. registered through the invite-code flow, or one of the two
 * editors) — checked explicitly here, not only relied on via RLS
 * (CLAUDE.md 13), same shape as require-editor.ts. Throws
 * NotLoungeMemberError if not.
 */
export async function requireLoungeMember() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new NotLoungeMemberError();

  const { data: profile } = await supabase
    .from("lounge_profiles")
    .select("first_name, last_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) throw new NotLoungeMemberError();

  return { supabase, userId: user.id, displayName: `${profile.first_name} ${profile.last_name}`.trim() };
}

export interface LoungeViewer {
  userId: string | null;
  isEditor: boolean;
  isMember: boolean;
  displayName: string | null;
}

const NOT_LOGGED_IN: LoungeViewer = { userId: null, isEditor: false, isMember: false, displayName: null };

/** Same stuck-refresh-token guard as require-editor.ts's getEditorSession — every public person/tree page calls this on every render. */
const VIEWER_SESSION_TIMEOUT_MS = 4000;

async function loadLoungeViewer(): Promise<LoungeViewer> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NOT_LOGGED_IN;

  const [{ data: editor }, { data: profile }] = await Promise.all([
    supabase.from("editors").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("lounge_profiles").select("first_name, last_name").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    isEditor: editor !== null,
    isMember: profile !== null,
    displayName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : null,
  };
}

/**
 * Non-throwing variant for pages that stay public (CLAUDE.md 3.1) — the
 * /lounge page itself (show the compose form vs. a
 * "войдите/зарегистрируйтесь" prompt) and every person/tree page (show
 * "Добавить.../Редактировать" quick actions — components/people/person-detail-content.tsx).
 */
export async function getLoungeViewer(): Promise<LoungeViewer> {
  const viewer = loadLoungeViewer().catch(() => NOT_LOGGED_IN);
  const timeout = new Promise<LoungeViewer>((resolve) => setTimeout(() => resolve(NOT_LOGGED_IN), VIEWER_SESSION_TIMEOUT_MS));
  return Promise.race([viewer, timeout]);
}
