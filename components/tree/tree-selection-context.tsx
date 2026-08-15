"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface TreeSelectionContextValue {
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
}

const TreeSelectionContext = createContext<TreeSelectionContextValue | null>(null);

export function TreeSelectionProvider({
  value,
  children,
}: {
  value: TreeSelectionContextValue;
  children: ReactNode;
}) {
  return <TreeSelectionContext.Provider value={value}>{children}</TreeSelectionContext.Provider>;
}

export function useTreeSelection(): TreeSelectionContextValue {
  const context = useContext(TreeSelectionContext);
  if (!context) {
    throw new Error("useTreeSelection must be used within a TreeSelectionProvider");
  }
  return context;
}
