import Link from "next/link";
import type { ReactNode } from "react";
import { Ornament } from "@/components/ui/ornament";

export interface HeaderProps {
  /** Rendered centered in the top bar, e.g. the home page's SearchBox. */
  search?: ReactNode;
}

export function Header({ search }: HeaderProps) {
  return (
    <header className="bg-(--color-bg-elevated)">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-heading shrink-0 text-xl font-bold tracking-tight text-(--color-fg) sm:text-2xl"
        >
          Семейное дерево Огурцовых
        </Link>
        {search && <div className="min-w-0 flex-1 sm:flex sm:justify-center">{search}</div>}
        <nav className="flex shrink-0 items-center gap-4">
          <Link
            href="/tree"
            className="text-label text-xs text-(--color-fg-muted) transition-colors hover:text-(--color-accent)"
          >
            Древо
          </Link>
          <Link
            href="/gallery"
            className="text-label hidden text-xs text-(--color-fg-muted) transition-colors hover:text-(--color-accent) sm:inline"
          >
            Фотоальбом
          </Link>
          <Link
            href="/archive"
            className="text-label hidden text-xs text-(--color-fg-muted) transition-colors hover:text-(--color-accent) sm:inline"
          >
            Архив
          </Link>
          <Link
            href="/login"
            className="text-label text-xs text-(--color-fg-muted) transition-colors hover:text-(--color-accent)"
          >
            Вход
          </Link>
        </nav>
      </div>
      {/* Decorative only — hidden on mobile so the header stays compact there (CLAUDE.md 3.6). */}
      <div className="hidden justify-center border-b border-(--color-border) py-1 text-(--color-border) sm:flex">
        <Ornament className="h-3 w-32" />
      </div>
      <div className="border-b border-(--color-border) sm:hidden" />
    </header>
  );
}
