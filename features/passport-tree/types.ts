/**
 * Mirrors PassportTree/06_Техническая_документация/passport-tree.json's
 * schema (06_JSON_структура.md) — the owner's mother's approved data
 * contract for the "Паспорт родословного дерева Огурцовых" page.
 */

export interface PassportLife {
  label: string;
  startYear: number;
  endYear: number | null;
}

export interface PassportPerson {
  id: string;
  name: string;
  life: PassportLife;
  documentIds: string[];
  /** e.g. "Игнат — восприемник" — shown under the person's card. */
  note: string | null;
}

export interface PassportDocumentDates {
  label: string;
  startYear: number;
  endYear: number;
}

export interface PassportDocument {
  id: string;
  title: string;
  dates: PassportDocumentDates | null;
  url: string | null;
}

export interface PassportRelationship {
  from: string;
  to: string;
}

export interface PassportTerminalBranch {
  id: string;
  personId: string;
  label: string;
  styleKey: "terminal";
}

export interface PassportTreeData {
  schemaVersion: string;
  page: {
    title: string;
    note: { heading: string; text: string | null; status: string };
  };
  people: PassportPerson[];
  documents: PassportDocument[];
  trunk: string[];
  relationships: PassportRelationship[];
  terminalBranches: PassportTerminalBranch[];
}
