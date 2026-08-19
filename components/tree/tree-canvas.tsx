"use client";

import { useEffect, useMemo, useState } from "react";
import { Controls, ReactFlow, ReactFlowProvider, useReactFlow, useStore, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildReactFlowGraph, type FamilyFlowNode } from "@/features/tree/to-react-flow";
import type { TreePerson, TreeRelationship } from "@/features/tree/build-graph";
import { FAMILY_UNIT_NODE_SIZE, PERSON_NODE_SIZE } from "@/features/tree/layout";
import { PersonNode } from "./person-node";
import { FamilyUnitNode } from "./family-unit-node";
import { TreeSelectionProvider } from "./tree-selection-context";

const NODE_TYPES = { person: PersonNode, familyUnit: FamilyUnitNode };

/** How far past the outermost nodes panning is still allowed — enough to comfortably center an edge node, not so much the tree gets lost in empty canvas. */
const PAN_MARGIN = 400;

/** Tight bounding box of every node's box (in flow coordinates), no padding. */
function computeNodeBounds(nodes: FamilyFlowNode[]): [[number, number], [number, number]] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const size = node.type === "person" ? PERSON_NODE_SIZE : FAMILY_UNIT_NODE_SIZE;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + size.width);
    maxY = Math.max(maxY, node.position.y + size.height);
  }

  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

/** Bounding box of every node, padded by `PAN_MARGIN` — passed to `ReactFlow`'s `translateExtent` so dragging can't scroll off into empty space. */
function computePanBounds(nodes: FamilyFlowNode[]): [[number, number], [number, number]] {
  const [[minX, minY], [maxX, maxY]] = computeNodeBounds(nodes);
  return [
    [minX - PAN_MARGIN, minY - PAN_MARGIN],
    [maxX + PAN_MARGIN, maxY + PAN_MARGIN],
  ];
}

/**
 * `ReactFlow`'s own default `minZoom` (0.5) can't zoom out far enough to
 * show a wide multi-generation tree in one view — the "-" control and
 * scroll-to-zoom-out both stop well before the whole tree is visible
 * (CLAUDE.md 3.6: fit-to-view is a required tree interaction). Kept
 * lower than the fit-everything zoom would ever need, so it never
 * clamps `fitView`'s own initial calculation upward — see `DynamicMinZoom`.
 */
const FALLBACK_MIN_ZOOM = 0.02;
/** Same fraction `fitView`'s default `padding: 0.1` adds around the bounding box, applied here so "zoomed out as far as possible" lands on the same view `fitView` itself would choose. */
const FIT_VIEW_PADDING_FACTOR = 1.1;

/**
 * Keeps `minZoom` tied to the pane's actual measured size (which
 * `ReactFlow` tracks via its own `ResizeObserver`, exposed through
 * `useStore`) so "zoomed out as far as possible" always means "the
 * whole tree fits on screen" — on first paint, after a window resize,
 * or after the container's height changes (e.g. mobile keyboard).
 */
function DynamicMinZoom({ nodes, onChange }: { nodes: FamilyFlowNode[]; onChange: (zoom: number) => void }) {
  const paneWidth = useStore((state) => state.width);
  const paneHeight = useStore((state) => state.height);

  useEffect(() => {
    if (nodes.length === 0 || paneWidth === 0 || paneHeight === 0) return;

    const [[minX, minY], [maxX, maxY]] = computeNodeBounds(nodes);
    const treeWidth = (maxX - minX) * FIT_VIEW_PADDING_FACTOR;
    const treeHeight = (maxY - minY) * FIT_VIEW_PADDING_FACTOR;
    if (treeWidth <= 0 || treeHeight <= 0) return;

    const fitZoom = Math.min(paneWidth / treeWidth, paneHeight / treeHeight);
    onChange(Math.min(1, Math.max(FALLBACK_MIN_ZOOM, fitZoom)));
  }, [nodes, paneWidth, paneHeight, onChange]);

  return null;
}

export interface TreeCanvasProps {
  people: TreePerson[];
  relationships: TreeRelationship[];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; nodes: FamilyFlowNode[]; edges: Edge[] };

export function TreeCanvas({ people, relationships, selectedPersonId, onSelectPerson }: TreeCanvasProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [minZoom, setMinZoom] = useState(FALLBACK_MIN_ZOOM);

  useEffect(() => {
    let cancelled = false;

    buildReactFlowGraph(people, relationships)
      .then(({ nodes, edges }) => {
        if (!cancelled) setState({ status: "ready", nodes, edges });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [people, relationships]);

  const isEmpty = useMemo(() => people.length === 0, [people]);
  const panBounds = useMemo(
    () => (state.status === "ready" ? computePanBounds(state.nodes) : undefined),
    [state],
  );

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-(--color-fg-muted)">
        В дереве пока никого нет.
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-(--color-fg-muted)">
        Строим дерево…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-(--color-danger)">
        Не удалось построить дерево. Попробуйте обновить страницу.
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <TreeSelectionProvider value={{ selectedPersonId, onSelectPerson }}>
        <ReactFlow
          nodes={state.nodes}
          edges={state.edges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          translateExtent={panBounds}
          minZoom={minZoom}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ backgroundColor: "var(--color-bg)" }}
        >
          <Controls showInteractive={false} />
          <FocusOnSelection selectedPersonId={selectedPersonId} />
          <DynamicMinZoom nodes={state.nodes} onChange={setMinZoom} />
        </ReactFlow>
      </TreeSelectionProvider>
    </ReactFlowProvider>
  );
}

/**
 * Pans/zooms to the selected person whenever selection changes — covers
 * both tree clicks and search-result selection with one mechanism, and
 * (since this only mounts once nodes exist) also restores focus for a
 * `/?person=<uuid>` deep link without racing the async ELK layout.
 */
function FocusOnSelection({ selectedPersonId }: { selectedPersonId: string | null }) {
  const { setCenter, getNode, getZoom } = useReactFlow();

  useEffect(() => {
    if (!selectedPersonId) return;
    const node = getNode(selectedPersonId);
    if (!node) return;

    const x = node.position.x + PERSON_NODE_SIZE.width / 2;
    const y = node.position.y + PERSON_NODE_SIZE.height / 2;
    setCenter(x, y, { zoom: Math.max(getZoom(), 1), duration: 400 });
  }, [selectedPersonId, getNode, setCenter, getZoom]);

  return null;
}
