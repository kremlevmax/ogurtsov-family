"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Briefcase, Calendar, GraduationCap, MapPin, Pencil, UserPlus, Heart, Baby } from "lucide-react";
import type { ParentLink, PartnerLink } from "@/features/people/relations";
import type { Person } from "@/features/people/types";
import type { PersonMedia } from "@/features/media/types";
import { buildDisplayName } from "@/lib/names/display-name";
import { formatDateValue, formatLifeSpan } from "@/lib/dates/date-value";
import { MediaSection } from "./media-section";

const PARTNER_LABELS: Record<string, string> = {
  spouse: "Супруг(а)",
  former_spouse: "Бывший(ая) супруг(а)",
  partner: "Партнёр",
};

export interface PersonDetailContentProps {
  person: Person;
  parents: ParentLink[];
  partners: PartnerLink[];
  childPeople: Person[];
  siblings: Person[];
  media: PersonMedia[];
  isEditor: boolean;
  /**
   * When provided, clicking a related person calls this instead of a
   * <Link> navigation — used inside the tree drawer so switching between
   * relatives never leaves the tree. The standalone /people/[id] page
   * omits this and falls back to normal navigation.
   */
  onPersonSelect?: (personId: string) => void;
}

/**
 * Shared rendering for a person's vitals/biography/relations/editor
 * actions — used by both the full indexable page and the tree drawer
 * so they can never drift apart (CLAUDE.md 15: don't duplicate).
 */
export function PersonDetailContent({
  person,
  parents,
  partners,
  childPeople,
  siblings,
  media,
  isEditor,
  onPersonSelect,
}: PersonDetailContentProps) {
  const isDeceased = person.isDeceased;
  const lifeSpan = formatLifeSpan(person.birth, person.death, isDeceased);

  const givenNames = [person.firstName, person.middleName].filter(Boolean).join(" ");

  return (
    <div className="@container flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label mb-3 text-xs text-(--color-fg-muted)">
            {person.isPlaceholder ? "Запись-заглушка · неизвестный родственник" : "Семейная запись"}
          </p>
          <h1 className="font-heading leading-tight">
            {givenNames && <span className="block text-3xl font-bold text-(--color-fg)">{givenNames}</span>}
            {/* Surname and maiden name flow as ordinary inline text (not each forced onto its own line) — sharing a line whenever they fit, wrapping only if they don't. Only the maiden name is italic — it's the one part of the name that isn't this person's own, current surname. */}
            {(person.lastName || person.maidenName) && (
              <span className="block text-3xl text-(--color-fg)">
                {person.lastName && <span className="font-bold">{person.lastName}</span>}
                {person.lastName && person.maidenName && " "}
                {person.maidenName && <span className="italic">({person.maidenName})</span>}
              </span>
            )}
            {!givenNames && !person.lastName && !person.maidenName && (
              <span className="block text-3xl font-bold text-(--color-fg)">Без имени</span>
            )}
          </h1>
          {/* Italic font-body, matching the tree cell's life-span style
            (docs/DECISIONS.md, 2026-08-20/21) — not `.text-label`, which
            stays for real eyebrow/form labels elsewhere on this page. */}
          {lifeSpan && <p className="font-body mt-3 text-base italic text-(--color-fg-muted)">{lifeSpan}</p>}
        </div>

        {isEditor && <EditorQuickActions personId={person.id} parents={parents} />}
      </div>

      <hr className="border-(--color-border)" />

      <div className="grid gap-8 @2xl:grid-cols-[240px_1fr]">
        <section className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-5">
          <p className="text-label mb-4 text-xs text-(--color-fg-muted)">Основные данные</p>
          <dl className="flex flex-col">
            <VitalRow icon={Calendar} label="Дата рождения">
              {person.birth ? formatDateValue(person.birth) : "неизвестно"}
            </VitalRow>
            {person.birthPlace && (
              <VitalRow icon={MapPin} label="Место рождения">
                {person.birthPlace}
              </VitalRow>
            )}
            {isDeceased && person.death && (
              <VitalRow icon={Calendar} label="Дата смерти">
                {formatDateValue(person.death)}
              </VitalRow>
            )}
            {isDeceased && person.deathPlace && (
              <VitalRow icon={MapPin} label="Место смерти">
                {person.deathPlace}
              </VitalRow>
            )}
            {person.profession && (
              <VitalRow icon={Briefcase} label="Профессия">
                {person.profession}
              </VitalRow>
            )}
            {person.education && (
              <VitalRow icon={GraduationCap} label="Образование" last>
                {person.education}
              </VitalRow>
            )}
          </dl>
        </section>

        <section>
          <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Биография</p>
          {person.shortBio ? (
            <p className="whitespace-pre-line text-base leading-relaxed text-(--color-fg)">
              {person.shortBio}
            </p>
          ) : (
            <p className="text-sm text-(--color-fg-muted)">Биография пока не добавлена.</p>
          )}
        </section>
      </div>

      <MediaSection media={media} />

      <div className="flex flex-col gap-6">
        <RelationSection
          title="Родители"
          people={parents.map((link) => link.person)}
          onPersonSelect={onPersonSelect}
        />
        <RelationSection
          title="Супруги и партнёры"
          people={partners.map((link) => link.person)}
          labels={partners.map((link) => PARTNER_LABELS[link.type])}
          onPersonSelect={onPersonSelect}
        />
        <RelationSection title="Дети" people={childPeople} onPersonSelect={onPersonSelect} />
        <RelationSection title="Братья и сёстры" people={siblings} onPersonSelect={onPersonSelect} />
      </div>
    </div>
  );
}

function EditorQuickActions({ personId, parents }: { personId: string; parents: ParentLink[] }) {
  const hasMother = parents.some((link) => link.role === "mother");
  const hasFather = parents.some((link) => link.role === "father");

  const actions = [
    !hasMother && {
      label: "Добавить карточку матери",
      href: `/edit/people/new?relationTo=${personId}&relationKind=mother`,
      icon: UserPlus,
    },
    !hasFather && {
      label: "Добавить карточку отца",
      href: `/edit/people/new?relationTo=${personId}&relationKind=father`,
      icon: UserPlus,
    },
    {
      label: "Добавить карточку супруга/партнёра",
      href: `/edit/people/new?relationTo=${personId}&relationKind=spouse`,
      icon: Heart,
    },
    {
      label: "Добавить карточку ребёнка",
      href: `/edit/people/new?relationTo=${personId}&relationKind=child`,
      icon: Baby,
    },
  ].filter((action): action is { label: string; href: string; icon: typeof UserPlus } => Boolean(action));

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          title={action.label}
          className="text-label inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-2.5 py-1.5 text-[10px] text-(--color-fg-muted) hover:border-(--color-accent) hover:text-(--color-accent)"
        >
          <action.icon className="h-3.5 w-3.5" aria-hidden="true" />
          {action.label}
        </Link>
      ))}
      <Link
        href={`/edit/people/${personId}`}
        title="Редактировать"
        className="text-label inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-(--color-accent) bg-(--color-accent) px-2.5 py-1.5 text-[10px] text-(--color-accent-fg) hover:opacity-90"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Редактировать
      </Link>
    </div>
  );
}

function VitalRow({
  icon: Icon,
  label,
  children,
  last = false,
}: {
  icon: typeof Calendar;
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "flex gap-3 py-3" : "flex gap-3 border-b border-(--color-border) py-3"}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-(--color-accent)" aria-hidden="true" />
      <div>
        <dt className="text-label text-[11px] text-(--color-fg-muted)">{label}</dt>
        <dd className="text-sm text-(--color-fg)">{children}</dd>
      </div>
    </div>
  );
}

function RelationSection({
  title,
  people,
  labels,
  onPersonSelect,
}: {
  title: string;
  people: Person[];
  labels?: (string | undefined)[];
  onPersonSelect?: (personId: string) => void;
}) {
  if (people.length === 0) return null;

  return (
    <section>
      <p className="text-label mb-2 text-xs text-(--color-fg-muted)">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {people.map((relative, index) => {
          const label = labels?.[index];
          const className =
            "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-1.5 text-sm text-(--color-fg) hover:border-(--color-accent)";
          const content = (
            <>
              {buildDisplayName(relative)}
              {label && <span className="text-label text-[10px] text-(--color-fg-muted)">{label}</span>}
            </>
          );

          return (
            <li key={relative.id}>
              {onPersonSelect ? (
                <button type="button" onClick={() => onPersonSelect(relative.id)} className={className}>
                  {content}
                </button>
              ) : (
                <Link href={`/people/${relative.id}`} className={className}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
