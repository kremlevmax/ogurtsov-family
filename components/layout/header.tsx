"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Monogram } from "@/components/ui/monogram";

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
  { href: "/#descendants", label: "Потомкам" },
] as const;

export function Header({ search }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-(--color-border) bg-(--color-bg-elevated)">
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
              className="text-label text-xs font-bold text-(--color-fg-muted) transition-colors hover:text-(--color-accent)"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="text-label text-xs text-(--color-fg-muted)/70 transition-colors hover:text-(--color-accent)"
          >
            Вход
          </Link>
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
              className="text-label rounded-[var(--radius-sm)] px-2 py-2 text-xs font-bold text-(--color-fg-muted) transition-colors hover:bg-(--color-bg-inset) hover:text-(--color-accent)"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="text-label rounded-[var(--radius-sm)] px-2 py-2 text-xs text-(--color-fg-muted)/70 transition-colors hover:bg-(--color-bg-inset) hover:text-(--color-accent)"
          >
            Вход
          </Link>
        </nav>
      )}
    </header>
  );
}
