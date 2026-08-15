import { Handle, Position, type NodeProps } from "@xyflow/react";
import { formatLifeSpan } from "@/lib/dates/date-value";
import { PERSON_NODE_SIZE } from "@/features/tree/layout";
import { cn } from "@/lib/utils/cn";
import type { FamilyFlowNode, PersonNodeData } from "@/features/tree/to-react-flow";
import { useTreeSelection } from "./tree-selection-context";

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
  const { person } = data as PersonNodeData;
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

  return (
    // Size is fixed inline from PERSON_NODE_SIZE (the exact size ELK used
    // to compute positions) rather than left to grow with content — a
    // one-line vs. two-line display name would otherwise render at
    // different heights and connector lines above/below would land at
    // different y per card. A real <button> (not a div+role) for
    // dependable click/tap/keyboard behavior across browsers.
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={person.displayName || "Без имени"}
      onClick={select}
      style={{ width: PERSON_NODE_SIZE.width, height: PERSON_NODE_SIZE.height }}
      className={cn(
        "pointer-events-auto flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-t-4 border-t-(--color-accent) bg-(--color-bg-elevated) px-3 text-left shadow-(--shadow-sm) transition-shadow hover:shadow-(--shadow-md)",
        isSelected ? "border-(--color-accent) ring-2 ring-(--color-accent)" : "border-(--color-border)",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-(--color-border)" />
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-sm font-bold text-(--color-accent-fg)"
      >
        {initials(person.shortName, person.displayName)}
      </div>
      <div className="min-w-0">
        <div className="font-heading line-clamp-2 text-sm leading-tight font-bold text-(--color-fg)">
          {person.displayName || "Без имени"}
        </div>
        {lifeSpan && <div className="text-label text-[11px] text-(--color-fg-muted)">{lifeSpan}</div>}
        {person.isPlaceholder && (
          <div className="text-xs italic text-(--color-fg-muted)">неизвестный родственник</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-(--color-border)" />
    </button>
  );
}
