import type { PassportTreeData } from "@/features/passport-tree/types";
import {
  VIEWBOX,
  TRUNK_PERSON_RECTS,
  TRUNK_DOC_RECTS,
  TRUNK_DOC_LINES,
  BRANCH_PERSON_RECTS,
  BRANCH_DOC_RECTS,
  BRANCH_DOC_LINES,
  TERMINAL_RECTS,
  BRANCH_SPLIT_Y,
  BRANCH_SPLIT_X,
  NOTE_BLOCK_RECT,
  NOTE_HEADING,
  NOTE_ITEMS,
  EYEBROW_RECT,
  EYEBROW_TEXT,
  buildConnectors,
  type Rect,
} from "@/features/passport-tree/layout";

export interface PassportTreeDiagramProps {
  data: PassportTreeData;
  /** Prefixes every SVG id so more than one instance on a page never collides (07_Структура_SVG.md). */
  instanceId: string;
}

const COLOR = {
  pageBg: "#f5ecde",
  cardFill: "#f6ece0",
  cardBorder: "#1e3a2a",
  accentFill: "#d7e0d3",
  accentBorder: "#3c5245",
  docFill: "#f8f2e6",
  docBorder: "#b08b62",
  docIcon: "#8e5722",
  text: "#2b2b22",
  line: "#1e3a2a",
  gold: "#99693a",
};

const BRANCH_ORDER = ["ignat", "safron", "stepan"] as const;
const BRANCH_TERMINAL: Record<(typeof BRANCH_ORDER)[number], string> = {
  ignat: "moscow",
  safron: "desc_safron",
  stepan: "desc_stepan",
};

function DocumentIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <path
        d="M2 1.5h10l4 4v15a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 20.5v-17A1.5 1.5 0 0 1 2 1.5Z"
        fill="none"
        stroke={COLOR.docIcon}
        strokeWidth="1.4"
      />
      <path d="M12 1.5v4h4" fill="none" stroke={COLOR.docIcon} strokeWidth="1.4" />
      <line x1="3" y1="10" x2="13" y2="10" stroke={COLOR.docIcon} strokeWidth="1.2" />
      <line x1="3" y1="14" x2="13" y2="14" stroke={COLOR.docIcon} strokeWidth="1.2" />
      <line x1="3" y1="18" x2="9" y2="18" stroke={COLOR.docIcon} strokeWidth="1.2" />
    </g>
  );
}

function PersonCard({ rect, name, lifeLabel, note, accent }: { rect: Rect; name: string; lifeLabel: string; note: string | null; accent: boolean }) {
  const centerX = rect.x + rect.width / 2;
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx={8}
        fill={accent ? COLOR.accentFill : COLOR.cardFill}
        stroke={accent ? COLOR.accentBorder : COLOR.cardBorder}
        strokeWidth={2.5}
      />
      <text x={centerX} y={rect.y + rect.height / 2 - (note ? 12 : 6)} textAnchor="middle" fontSize={19} fontWeight={700} fill={COLOR.text}>
        {name}
      </text>
      <text x={centerX} y={rect.y + rect.height / 2 + (note ? 10 : 18)} textAnchor="middle" fontSize={18} fill={COLOR.text}>
        {lifeLabel}
      </text>
      {note && (
        <text x={centerX} y={rect.y + rect.height - 8} textAnchor="middle" fontSize={15} fontStyle="italic" fill={COLOR.text}>
          {note}
        </text>
      )}
    </g>
  );
}

/**
 * One trunk document callout — a compact multi-revision block per
 * 05_Требования_к_дизайну.md's table. Every `documents[].url` is
 * currently `null` (Q3, docs/DECISIONS.md), so there is nothing to
 * link yet; once real URLs exist, each revision number in the compact
 * line should become its own accessible link (07_Структура_SVG.md) —
 * deferred rather than built against data that doesn't exist yet.
 */
function TrunkDocumentBox({ rect, personId }: { rect: Rect; personId: string }) {
  const lines = TRUNK_DOC_LINES[personId];

  return (
    <g data-document-ids={lines.documentIds.join(",")}>
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={6} fill={COLOR.docFill} stroke={COLOR.docBorder} strokeWidth={1.3} />
      <DocumentIcon x={rect.x + 12} y={rect.y + rect.height / 2 - 10} />
      <text x={rect.x + 42} y={rect.y + rect.height / 2 - (lines.extra ? 16 : 6)} fontSize={17.5} fontWeight={700} fill={COLOR.text}>
        {lines.numbers}
      </text>
      <text x={rect.x + 42} y={rect.y + rect.height / 2 + (lines.extra ? 4 : 14)} fontSize={16.5} fill={COLOR.text}>
        {lines.dates}
      </text>
      {lines.extra && (
        <text x={rect.x + 42} y={rect.y + rect.height / 2 + 22} fontSize={16} fill={COLOR.text}>
          {lines.extra}
        </text>
      )}
    </g>
  );
}

/** Wrapped per BRANCH_DOC_LINES — "Метрическая запись..." never fits this column's width on one line (measured against the artwork; see layout.ts). */
function BranchDocumentBox({ rect, personId, data }: { rect: Rect; personId: string; data: PassportTreeData }) {
  const person = data.people.find((candidate) => candidate.id === personId);
  const document = person ? data.documents.find((candidate) => candidate.id === person.documentIds[0]) : undefined;
  const wrapped = BRANCH_DOC_LINES[personId];
  if (!person || !document || !wrapped) return null;
  const centerX = rect.x + rect.width / 2;
  const accessibleName = document.dates ? `${document.title} (${document.dates.label})` : document.title;

  const lineCount = wrapped.lines.length + (wrapped.note ? 1 : 0);
  const lineHeight = 19;
  const firstLineY = rect.y + rect.height / 2 - ((lineCount - 1) * lineHeight) / 2 + 4;

  return (
    <g data-document-ids={document.id}>
      <title>{accessibleName}</title>
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={6} fill={COLOR.docFill} stroke={COLOR.docBorder} strokeWidth={1.3} />
      <DocumentIcon x={rect.x + 10} y={rect.y + 8} />
      {wrapped.lines.map((line, index) => (
        <text key={index} x={centerX} y={firstLineY + index * lineHeight} textAnchor="middle" fontSize={16} fill={COLOR.text}>
          {line}
        </text>
      ))}
      {wrapped.note && (
        <text x={centerX} y={firstLineY + wrapped.lines.length * lineHeight} textAnchor="middle" fontSize={15} fontStyle="italic" fill={COLOR.text}>
          {wrapped.note}
        </text>
      )}
    </g>
  );
}

function TerminalBlock({ rect, label }: { rect: Rect; label: string }) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return (
    <g>
      <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={8} fill={COLOR.accentFill} stroke={COLOR.accentBorder} strokeWidth={2.5} />
      <text x={centerX} y={centerY + 6} textAnchor="middle" fontSize={19} fontWeight={700} fill={COLOR.text}>
        {label}
      </text>
    </g>
  );
}

/**
 * "Паспорт родословного дерева Огурцовых" — pure rendering from data
 * (features/passport-tree/data.ts) and measured layout
 * (features/passport-tree/layout.ts). The approved artwork
 * (public/passport/base-artwork.png) supplies the landscape, ornament
 * and title; every card, document callout, terminal block and
 * connecting line here is a real, separately positioned SVG object
 * drawn on top of it at the artwork's own coordinates — covering its
 * older baked-in labels with the approved text from
 * 03_Данные_родословной.md (PassportTree/07_Структура_SVG.md: "не
 * рисовать фон заново", but also "недостаточно показать только PNG с
 * невидимыми актуальными данными, если видимые старые надписи
 * расходятся с документом 03").
 */
export function PassportTreeDiagram({ data, instanceId }: PassportTreeDiagramProps) {
  const titleId = `${instanceId}-title`;
  const descId = `${instanceId}-desc`;
  const connectors = buildConnectors();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      fontFamily="var(--font-cormorant-garamond), Georgia, serif"
    >
      <title id={titleId}>{data.page.title}</title>
      <desc id={descId}>
        Главный ствол: {data.trunk.map((id) => data.people.find((person) => person.id === id)?.name).join(" → ")}. От Гаврилы
        Егорова — три ветви: Игнат Гаврилов (Московская ветвь), Сафрон Гаврилов (Потомки), Степан Гаврилов (Потомки).
      </desc>

      <defs>
        <marker id={`${instanceId}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={COLOR.line} />
        </marker>
      </defs>

      <image href="/passport/base-artwork.png" x={0} y={0} width={VIEWBOX.width} height={VIEWBOX.height} aria-hidden="true" />

      {/* Centers the artwork's own eyebrow line, which sits off-center relative to "Огурцовых" below it — see EYEBROW_RECT's doc comment (layout.ts). */}
      <g>
        <rect x={EYEBROW_RECT.x} y={EYEBROW_RECT.y} width={EYEBROW_RECT.width} height={EYEBROW_RECT.height} fill={COLOR.pageBg} />
        <text
          x={VIEWBOX.width / 2}
          y={EYEBROW_RECT.y + EYEBROW_RECT.height - 10}
          textAnchor="middle"
          fontSize={15}
          fontWeight={600}
          letterSpacing="3"
          fill={COLOR.gold}
        >
          {EYEBROW_TEXT}
        </text>
      </g>

      <g aria-hidden="true">
        {connectors.map((connector, index) => (
          <line
            key={index}
            x1={connector.x}
            y1={connector.y0}
            x2={connector.x}
            y2={connector.y1}
            stroke={COLOR.line}
            strokeWidth={3}
            markerEnd={`url(#${instanceId}-arrow)`}
          />
        ))}
        <line x1={BRANCH_SPLIT_X[0]} y1={BRANCH_SPLIT_Y} x2={BRANCH_SPLIT_X[1]} y2={BRANCH_SPLIT_Y} stroke={COLOR.line} strokeWidth={3} />
      </g>

      {data.trunk.map((personId) => {
        const person = data.people.find((candidate) => candidate.id === personId);
        if (!person) return null;
        return (
          <g key={person.id} data-person-id={person.id}>
            <PersonCard rect={TRUNK_PERSON_RECTS[person.id]} name={person.name} lifeLabel={person.life.label} note={null} accent={person.id === "gavrila"} />
            <TrunkDocumentBox rect={TRUNK_DOC_RECTS[person.id]} personId={person.id} />
          </g>
        );
      })}

      {BRANCH_ORDER.map((personId) => {
        const person = data.people.find((candidate) => candidate.id === personId);
        const terminal = data.terminalBranches.find((branch) => branch.id === BRANCH_TERMINAL[personId]);
        if (!person || !terminal) return null;
        return (
          <g key={person.id} data-person-id={person.id}>
            <PersonCard rect={BRANCH_PERSON_RECTS[person.id]} name={person.name} lifeLabel={person.life.label} note={null} accent={false} />
            <BranchDocumentBox rect={BRANCH_DOC_RECTS[person.id]} personId={person.id} data={data} />
            <g data-terminal-branch-id={terminal.id}>
              <TerminalBlock rect={TERMINAL_RECTS[terminal.id]} label={terminal.label} />
            </g>
          </g>
        );
      })}

      {/* The whole "Примечания" block redrawn as real text, all in one consistent font — see NOTE_BLOCK_RECT's doc comment (layout.ts). */}
      <g>
        <rect x={NOTE_BLOCK_RECT.x} y={NOTE_BLOCK_RECT.y} width={NOTE_BLOCK_RECT.width} height={NOTE_BLOCK_RECT.height} fill={COLOR.pageBg} />
        <text x={NOTE_BLOCK_RECT.x} y={NOTE_BLOCK_RECT.y + 28} fontSize={26} fontWeight={700} fill={COLOR.text}>
          {NOTE_HEADING}
        </text>
        {NOTE_ITEMS.map((item, index) => (
          <text key={index} x={NOTE_BLOCK_RECT.x} y={NOTE_BLOCK_RECT.y + 68 + index * 28} fontSize={18} fill={COLOR.text}>
            {`${index + 1}.  ${item}`}
          </text>
        ))}
      </g>
    </svg>
  );
}
