"use client";

import { useEffect, useMemo, useState } from "react";
import { Controls, ReactFlow, ReactFlowProvider, useReactFlow, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { buildReactFlowGraph, type FamilyFlowNode } from "@/features/tree/to-react-flow";
import type { TreePerson, TreeRelationship } from "@/features/tree/build-graph";
import { PERSON_NODE_SIZE } from "@/features/tree/layout";
import { PersonNode } from "./person-node";
import { FamilyUnitNode } from "./family-unit-node";
import { TreeSelectionProvider } from "./tree-selection-context";

const NODE_TYPES = { person: PersonNode, familyUnit: FamilyUnitNode };

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
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ backgroundColor: "var(--color-bg)" }}
        >
          <Controls showInteractive={false} />
          <FocusOnSelection selectedPersonId={selectedPersonId} />
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
