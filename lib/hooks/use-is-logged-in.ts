"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Reads the session client-side — `getSession()` reads local/cookie
 * state without a network round-trip, so there's no flash of "Вход"
 * before it resolves; `onAuthStateChange` keeps it in sync after
 * login/logout in this same tab. This is a UI convenience only, never
 * an authorization check — every actual write is still gated
 * server-side (CLAUDE.md 13). Shared by components/layout/header.tsx
 * and the homepage's "Присоединиться к проекту" button.
 */
export function useIsLoggedIn(): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(data.session !== null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setIsLoggedIn(session !== null));
    return () => subscription.unsubscribe();
  }, []);

  return isLoggedIn;
}
