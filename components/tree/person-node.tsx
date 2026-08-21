import { Handle, Position, type NodeProps } from "@xyflow/react";
import { formatLifeSpan } from "@/lib/dates/date-value";
import { PERSON_NODE_SIZE } from "@/features/tree/layout";
import { cn } from "@/lib/utils/cn";
import { tintTowardCardBg } from "@/lib/utils/color";
import { CardCrest, CornerScroll } from "@/components/ui/ornament";
import type { FamilyFlowNode, PersonNodeData } from "@/features/tree/to-react-flow";
import { useTreeSelection } from "./tree-selection-context";

/** How much larger a branch founder's card renders than everyone else's. */
const FOUNDER_SCALE = 1.15;

/** One scroll per corner — CornerScroll is drawn for the top-left; the rest are CSS mirror flips of the same SVG. */
const CORNERS = [
  { position: "top-0 left-0", flip: "" },
  { position: "top-0 right-0", flip: "scale-x-[-1]" },
  { position: "bottom-0 left-0", flip: "scale-y-[-1]" },
  { position: "bottom-0 right-0", flip: "scale-x-[-1] scale-y-[-1]" },
] as const;

/** Corner-scroll size for an ordinary card's frame — smaller than a founder's (see FOUNDER_CORNER_SIZE below), since the founder's card is already scaled up (FOUNDER_SCALE) and gets the bigger motif to read as more elaborate on top of that. */
const CORNER_SIZE = "h-3.5 w-3.5";
const FOUNDER_CORNER_SIZE = "h-5 w-5";
/** Same idea for the four side crests. */
const CREST_SIZE = "h-3 w-12";
const FOUNDER_CREST_SIZE = "h-4 w-16";
/**
 * How far a *rotated* (left/right) crest's center sits from the card
 * edge, in px — top/bottom sit flush with the border (`top-0`), so a
 * rotated crest's center must sit at exactly half its own (pre-
 * rotation) height for the same "flush with the border" look, since
 * rotating a box spins it around its own center rather than resizing
 * the protrusion to match. Must be recomputed whenever
 * CREST_SIZE/FOUNDER_CREST_SIZE's height changes (owner picked this
 * "flush" option after comparing several depths live, docs/DECISIONS.md
 * 2026-08-21).
 */
const CREST_SIDE_OFFSET = 6; // CREST_SIZE height 12px: 0 + 6
const FOUNDER_CREST_SIDE_OFFSET = 8; // FOUNDER_CREST_SIZE height 16px: 0 + 8

/** Scalloped, asymmetric corner radius — the "Викторианский альбом" frame's signature shape (docs/DECISIONS.md, 2026-08-20), applied to every card's outer border and (slightly tighter) inner hairline alike. */
const FRAME_RADIUS = "3px 14px 3px 14px";
const FRAME_INNER_RADIUS = "2px 11px 2px 11px";

function initials(shortName: string, displayName: string): string {
  const source = shortName || displayName;
  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PersonNode({ data }: NodeProps<Extract<FamilyFlowNode, { type: "person" }>>) {
  const { person, branchColor, isBranchRoot, highlightColor } = data as PersonNodeData;
  // A one-off highlight (people.highlight_color) looks exactly like an
  // ordinary branch descendant's card — same border+tint, no ornamental
  // frame — it just comes from a direct, non-inherited field instead of
  // features/tree/branch-colors.ts. A resolved branch color always wins
  // if this person happens to have both (the form doesn't allow setting
  // both at once, but the tree shouldn't assume that holds forever).
  const effectiveColor = branchColor ?? highlightColor;
  const { selectedPersonId, onSelectPerson } = useTreeSelection();
  const isSelected = selectedPersonId === person.id;
  const lifeSpan = formatLifeSpan(
    person.birthYear ? { precision: "year", start: `${person.birthYear}-01-01`, end: `${person.birthYear}-01-01`, text: null } : null,
    person.deathYear ? { precision: "year", start: `${person.deathYear}-01-01`, end: `${person.deathYear}-01-01`, text: null } : null,
    person.isDeceased,
  );

  function select() {
    onSelectPerson(person.id);
  }

  // Every card gets the Victorian frame (docs/DECISIONS.md, 2026-08-20):
  // burgundy outer border + gold inner hairline/corner scrolls by
  // default. A branch/highlight color, when set, takes over BOTH roles
  // as one solid color instead — same "this branch is entirely one
  // color" rule the frame already followed before this change, just
  // with a two-tone Victorian default instead of a plain thin border.
  const frameColor = effectiveColor ?? "var(--color-frame)";
  const accentColor = effectiveColor ?? "var(--color-frame-accent)";
  const background = effectiveColor ? tintTowardCardBg(effectiveColor, isBranchRoot ? 0.12 : 0.09) : undefined;
  const cornerSize = isBranchRoot ? FOUNDER_CORNER_SIZE : CORNER_SIZE;
  const crestSize = isBranchRoot ? FOUNDER_CREST_SIZE : CREST_SIZE;
  const crestSideOffset = isBranchRoot ? FOUNDER_CREST_SIDE_OFFSET : CREST_SIDE_OFFSET;

  return (
    // The OUTER element keeps PERSON_NODE_SIZE exactly — that's the box
    // features/tree/layout.ts positioned and the one connector lines
    // (Handles below) anchor to. The founder's visibly bigger card is a
    // `transform: scale()` on an INNER wrapper only: it paints outside
    // the outer box (allowed by `overflow-visible`) without moving where
    // the layout or any neighboring node thinks this one actually is —
    // a scaled child still receives its own clicks/taps wherever it's
    // painted, so this doesn't cost the founder any hit-target area.
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={person.displayName || "Без имени"}
      onClick={select}
      style={{ width: PERSON_NODE_SIZE.width, height: PERSON_NODE_SIZE.height }}
      className="pointer-events-auto relative overflow-visible bg-transparent p-0 text-left"
    >
      <Handle type="target" position={Position.Top} className="!bg-(--color-border)" />
      <div
        style={{
          width: PERSON_NODE_SIZE.width,
          height: PERSON_NODE_SIZE.height,
          borderColor: frameColor,
          borderRadius: FRAME_RADIUS,
          background,
          transform: isBranchRoot ? `scale(${FOUNDER_SCALE})` : undefined,
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-0.5 overflow-visible border-[3px] px-3 py-1.5 text-center shadow-(--shadow-sm) transition-shadow hover:shadow-(--shadow-md)",
          !effectiveColor && "bg-(--color-bg-elevated)",
          isSelected && "ring-2 ring-(--color-accent)",
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[6px]"
          style={{ border: `1px solid ${accentColor}`, borderRadius: FRAME_INNER_RADIUS }}
        />
        {/* A crest on all four sides (docs/DECISIONS.md, 2026-08-20),
          sitting flush with the border rather than poking past it —
          the owner compared several depths live and picked this one
          (docs/DECISIONS.md, 2026-08-21). Left/right rotate the same
          shape in place. One shared set for every card — a founder's is
          simply bigger, same as its corner scrolls. */}
        <CardCrest
          className={cn("pointer-events-none absolute top-0 left-1/2 -translate-x-1/2", crestSize)}
          style={{ color: accentColor }}
        />
        <CardCrest
          className={cn("pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 scale-y-[-1]", crestSize)}
          style={{ color: accentColor }}
        />
        {/* Rotating an already-positioned box spins it around its OWN
          (unrotated) center — a plain `left-[-8px]` offset here would
          size the protrusion by the crest's pre-rotation WIDTH (48px),
          not its height (12px), landing it well inside the frame
          instead of straddling it like top/bottom. Centering explicitly
          via `translate(-50%, -50%)` before rotating, at an offset
          derived from half the (pre-rotation) height, reproduces the
          same straddle amount top/bottom get. */}
        <CardCrest
          className={cn("pointer-events-none absolute top-1/2", crestSize)}
          style={{ color: accentColor, left: `${crestSideOffset}px`, transform: "translate(-50%, -50%) rotate(-90deg)" }}
        />
        <CardCrest
          className={cn("pointer-events-none absolute top-1/2", crestSize)}
          style={{ color: accentColor, right: `${crestSideOffset}px`, transform: "translate(50%, -50%) rotate(90deg)" }}
        />
        {CORNERS.map(({ position, flip }) => (
          <CornerScroll
            key={position}
            className={cn("pointer-events-none absolute", cornerSize, position, flip)}
            style={{ color: accentColor }}
          />
        ))}
        {/* A branch founder's card is text-only, like the rest of its
          ornamental frame — everyone else keeps the portrait/initials
          circle (CLAUDE.md 3.6 requires it in the tree; the founder's
          own name is already the most prominent thing on their card by
          size and framing alone). */}
        {!isBranchRoot && (
          <div
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-(--color-accent-fg)"
            style={{ background: frameColor, border: `2px solid ${accentColor}` }}
          >
            {initials(person.shortName, person.displayName)}
          </div>
        )}
        <div
          className={cn(
            "font-heading line-clamp-2 leading-tight font-bold text-(--color-fg)",
            isBranchRoot ? "mt-1 text-sm" : "text-xs",
          )}
        >
          {person.displayName || "Без имени"}
        </div>
        {/* Life span reads as an italic serif date (font-body), matching
          the "Викторианский альбом" mockup's card — not the site's
          uppercase-tracked `.text-label` used for real form/eyebrow
          labels elsewhere. */}
        {lifeSpan && <div className="font-body text-[11px] italic text-(--color-fg-muted)">{lifeSpan}</div>}
        {person.isPlaceholder && (
          <div className="text-[10px] italic text-(--color-fg-muted)">неизвестный родственник</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-(--color-border)" />
      {/* Second, distinct target handle at the same spot as the source
        one above — used only by the direct partner-to-partner tie for a
        childless couple (see to-react-flow.ts), so that tie's line rises
        into a neighbor's bottom edge instead of looping up and over into
        their normal top handle (which faces this person's own parents). */}
      <Handle type="target" position={Position.Bottom} id="bottom" className="!opacity-0" />
    </button>
  );
}
