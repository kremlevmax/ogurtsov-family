"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { PersonDetailContent } from "@/components/people/person-detail-content";
import { getChildren, getParents, getPartners, getSiblings } from "@/features/people/relations";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { Person, Relationship } from "@/features/people/types";
import type { PersonMedia } from "@/features/media/types";

export interface PersonDrawerProps {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  media: PersonMedia[];
  viewer: { isEditor: boolean; memberId: string | null };
  onClose: () => void;
  onPersonSelect: (personId: string) => void;
}

const MOBILE_STYLE: CSSProperties = { position: "fixed", top: 0, right: 0, bottom: 0, left: 0 };
const DESKTOP_STYLE: CSSProperties = { position: "fixed", top: 0, right: 0, bottom: 0, width: 480 };

/**
 * Desktop: a ~480px panel docked to the right, tree stays visible.
 * Mobile (<768px): full-screen sheet — CLAUDE.md 11 explicitly forbids
 * leaving the tree squeezed into an unusable narrow strip on phones.
 *
 * Positioning is plain inline styles picked via `window.matchMedia`
 * (`useMediaQuery`), not Tailwind's `inset-y-0`/`right-0`/`left-auto`
 * classes — those compile through Tailwind v4's CSS logical-property
 * handling, and mixing that with a shorthand `inset-0` base class is
 * exactly the kind of thing browsers have historically disagreed on.
 * Plain physical `top`/`right`/`bottom`/`left` inline styles remove
 * that ambiguity entirely.
 *
 * Also rendered through a portal straight into <body>, so `position:
 * fixed` never sits inside the tree box's `overflow: hidden` ancestor
 * — another category of cross-browser inconsistency avoided outright.
 */
export function PersonDrawer({ person, people, relationships, media, viewer, onClose, onPersonSelect }: PersonDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const parents = getParents(person.id, people, relationships);
  const partners = getPartners(person.id, people, relationships);
  const children = getChildren(person.id, people, relationships);
  const siblings = getSiblings(person.id, people, relationships);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Карточка человека"
      style={isDesktop ? DESKTOP_STYLE : MOBILE_STYLE}
      className="z-50 flex flex-col overflow-y-auto bg-(--color-bg-elevated) md:border-l md:border-(--color-border) md:shadow-(--shadow-md)"
    >
      <div className="flex items-center justify-between gap-3 border-b border-(--color-border) bg-(--color-bg-elevated) px-4 py-3">
        <Link
          href={`/people/${person.id}`}
          className="text-label text-xs text-(--color-fg-muted) hover:text-(--color-accent)"
        >
          Открыть отдельную страницу →
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть карточку"
          className="shrink-0 rounded-full p-1.5 text-(--color-fg-muted) hover:bg-(--color-bg) hover:text-(--color-fg)"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 p-4">
        <PersonDetailContent
          person={person}
          parents={parents}
          partners={partners}
          childPeople={children}
          siblings={siblings}
          media={media}
          viewer={viewer}
          onPersonSelect={onPersonSelect}
        />
      </div>
    </div>,
    document.body,
  );
}
