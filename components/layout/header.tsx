"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOutLoungeMemberAction } from "@/server/actions/lounge-auth";

export interface HeaderProps {
  /** Rendered centered in the top bar, e.g. the home page's SearchBox. */
  search?: ReactNode;
}

const NAV_LINKS = [
  { href: "/", label: "Главная" },
  { href: "/tree", label: "Древо" },
  { href: "/story", label: "История" },
  { href: "/archive", label: "Архив" },
  { href: "/#places", label: "Карта" },
  { href: "/lounge", label: "Гостиная" },
] as const;

// Same font/weight/tracking/color as the other nav links, exactly
// (owner's request, three times now — the first two passes wrapped the
// button in a <form>, plain or `display:contents`; a screenshot showed
// the button rendering in a completely different, much larger font,
// which points at a real `display:contents` inheritance/rendering bug
// rather than a specificity issue. Fixed by dropping the <form>
// entirely: signOutLoungeMemberAction is called directly as a plain
// async function via useTransition (same pattern as
// DeleteLoungeMessageButton), so the <button> is a direct flex-row
// item with nothing wrapping it, identical in structure to the <a>
// siblings it needs to match.
const authLinkClassName = "text-label text-xs font-bold tracking-[0.84px] text-(--color-fg) transition-colors hover:text-(--color-heading)";
const mobileAuthLinkClassName =
  "text-label rounded-[var(--radius-sm)] px-2 py-2 text-xs font-bold tracking-[0.84px] text-(--color-fg) transition-colors hover:bg-(--color-bg-inset) hover:text-(--color-heading)";

/**
 * Reads the session client-side (this Header is imported directly from
 * two "use client" call sites — components/tree/family-tree-explorer.tsx,
 * components/lounge/family-lounge.tsx — which can't import a Server
 * Component, so it can't just be handed a `viewer` prop from every one
 * of its ~15 callers). `getSession()` reads local/cookie state without
 * a network round-trip, so there's no flash of "Вход" before it
 * resolves; `onAuthStateChange` keeps it in sync after login/logout in
 * this same tab. This is a UI convenience only, never an authorization
 * check — every actual write is still gated server-side (CLAUDE.md 13).
 */
function useIsLoggedIn(): boolean {
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

export function Header({ search }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = useIsLoggedIn();
  const [isSigningOut, startSignOutTransition] = useTransition();

  function handleSignOut() {
    startSignOutTransition(() => signOutLoungeMemberAction());
  }

  return (
    <header className="sticky top-0 z-40 border-b border-(--color-border) bg-(--color-bg-elevated)">
      <div className="flex h-20 items-center justify-between gap-4 px-6 sm:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Monogram />
          <span className="font-heading hidden text-lg font-semibold text-(--color-fg) sm:inline">
            Род Огурцовых
          </span>
        </Link>

        {search && <div className="min-w-0 flex-1 sm:flex sm:justify-center">{search}</div>}

        <nav className="hidden shrink-0 items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-label text-xs font-bold tracking-[0.84px] text-(--color-fg) transition-colors hover:text-(--color-heading)"
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <button type="button" disabled={isSigningOut} onClick={handleSignOut} className={authLinkClassName}>
              Выйти
            </button>
          ) : (
            <Link href="/login" className={authLinkClassName}>
              Вход
            </Link>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          className="shrink-0 rounded-[var(--radius-sm)] p-2 text-(--color-fg) transition-colors hover:bg-(--color-bg-inset) lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-1 border-t border-(--color-border) px-6 py-3 sm:px-10 lg:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-label rounded-[var(--radius-sm)] px-2 py-2 text-xs font-bold tracking-[0.84px] text-(--color-fg) transition-colors hover:bg-(--color-bg-inset) hover:text-(--color-heading)"
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <button
              type="button"
              disabled={isSigningOut}
              onClick={() => {
                setMenuOpen(false);
                handleSignOut();
              }}
              className={mobileAuthLinkClassName}
            >
              Выйти
            </button>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className={mobileAuthLinkClassName}>
              Вход
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
