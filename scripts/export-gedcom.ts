/**
 * `npm run export:gedcom [файл]` (CLAUDE.md 3.10) — basic GEDCOM 5.5.1
 * export: people, parents, spouses, birth and death. Desirable for
 * portability into other genealogy software, explicitly not required to
 * be exhaustive (CLAUDE.md: "не задерживай им основной MVP").
 *
 * Known simplification: our data model doesn't track sex/gender (parent
 * roles are mother/father/parent on the *relationship*, not a person
 * attribute), but GEDCOM's FAM record wants HUSB/WIFE. We map
 * father→HUSB, mother→WIFE; for an unknown-gender `parent` role or a
 * childless couple, the first person becomes HUSB and the second WIFE
 * arbitrarily — harmless for re-import, just not necessarily correct
 * gender-wise. Documented in docs/DECISIONS.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvLocal } from "./lib/env";
import { createScriptSupabaseClient } from "./lib/supabase-admin";
import type { DatePrecision } from "@/lib/dates/date-value";

loadEnvLocal();

const PARENT_TYPES = new Set(["biological_parent", "adoptive_parent", "foster_parent", "guardian"]);
const PARTNER_TYPES = new Set(["spouse", "former_spouse", "partner"]);

const GEDCOM_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

interface PersonRow {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  maiden_name: string | null;
  birth_date_precision: DatePrecision;
  birth_date_start: string | null;
  birth_date_end: string | null;
  death_date_precision: DatePrecision;
  death_date_start: string | null;
  death_date_end: string | null;
  is_deceased: boolean;
}

interface RelationshipRow {
  id: string;
  from_person_id: string;
  to_person_id: string;
  relationship_type: string;
  parent_role: "mother" | "father" | "parent" | null;
}

function gedcomYearMonthDay(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function formatGedcomDate(value: { precision: DatePrecision; start: string | null; end: string | null }): string | null {
  switch (value.precision) {
    case "exact": {
      if (!value.start) return null;
      const { year, month, day } = gedcomYearMonthDay(value.start);
      return `${day} ${GEDCOM_MONTHS[month - 1]} ${year}`;
    }
    case "month": {
      if (!value.start) return null;
      const { year, month } = gedcomYearMonthDay(value.start);
      return `${GEDCOM_MONTHS[month - 1]} ${year}`;
    }
    case "year":
      return value.start ? String(gedcomYearMonthDay(value.start).year) : null;
    case "approximate":
      return value.start ? `ABT ${gedcomYearMonthDay(value.start).year}` : null;
    case "range": {
      if (value.start && value.end) {
        return `BET ${gedcomYearMonthDay(value.start).year} AND ${gedcomYearMonthDay(value.end).year}`;
      }
      if (value.start) return `AFT ${gedcomYearMonthDay(value.start).year}`;
      if (value.end) return `BEF ${gedcomYearMonthDay(value.end).year}`;
      return null;
    }
    default:
      return null;
  }
}

function gedcomName(person: PersonRow): string {
  const given = [person.first_name, person.middle_name].filter(Boolean).join(" ").trim();
  const surname = person.maiden_name
    ? `${person.last_name ?? ""} (${person.maiden_name})`.trim()
    : (person.last_name ?? "");
  return `${given} /${surname}/`.trim();
}

interface Family {
  key: string;
  parentIds: string[];
  childIds: string[];
  roleByParent: Map<string, "mother" | "father" | "parent">;
  marriageType: "spouse" | "former_spouse" | "partner" | null;
}

function buildFamilies(relationships: RelationshipRow[]): Family[] {
  const families = new Map<string, Family>();

  function familyFor(parentIds: string[]): Family {
    const key = [...parentIds].sort().join("|");
    let family = families.get(key);
    if (!family) {
      family = { key, parentIds: [...parentIds].sort(), childIds: [], roleByParent: new Map(), marriageType: null };
      families.set(key, family);
    }
    return family;
  }

  const parentsByChild = new Map<string, { parentId: string; role: "mother" | "father" | "parent" }[]>();
  for (const rel of relationships) {
    if (!PARENT_TYPES.has(rel.relationship_type)) continue;
    const list = parentsByChild.get(rel.to_person_id) ?? [];
    list.push({ parentId: rel.from_person_id, role: rel.parent_role ?? "parent" });
    parentsByChild.set(rel.to_person_id, list);
  }

  for (const [childId, parents] of parentsByChild) {
    const family = familyFor(parents.map((p) => p.parentId));
    family.childIds.push(childId);
    for (const { parentId, role } of parents) family.roleByParent.set(parentId, role);
  }

  for (const rel of relationships) {
    if (!PARTNER_TYPES.has(rel.relationship_type)) continue;
    const family = familyFor([rel.from_person_id, rel.to_person_id]);
    if (!family.marriageType || rel.relationship_type === "spouse") {
      family.marriageType = rel.relationship_type as Family["marriageType"];
    }
  }

  return [...families.values()].filter((family) => family.parentIds.length > 0);
}

async function main() {
  const { supabase } = createScriptSupabaseClient();

  const [{ data: people, error: peopleError }, { data: relationships, error: relError }] = await Promise.all([
    supabase.from("people").select("*").is("deleted_at", null),
    supabase.from("relationships").select("*").is("deleted_at", null),
  ]);
  if (peopleError) throw peopleError;
  if (relError) throw relError;

  const personRows = (people ?? []) as unknown as PersonRow[];
  const relationshipRows = (relationships ?? []) as unknown as RelationshipRow[];

  const personIndex = new Map(personRows.map((person, i) => [person.id, i + 1]));
  const families = buildFamilies(relationshipRows);

  const lines: string[] = [];
  lines.push("0 HEAD");
  lines.push("1 SOUR ogurtsov-family");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("2 FORM LINEAGE-LINKED");
  lines.push("1 CHAR UTF-8");
  lines.push(`1 DATE ${new Date().toISOString().slice(0, 10)}`);

  const famsByPerson = new Map<string, string[]>();
  const famcByPerson = new Map<string, string>();
  families.forEach((family, i) => {
    const famId = `@F${i + 1}@`;
    for (const parentId of family.parentIds) {
      const list = famsByPerson.get(parentId) ?? [];
      list.push(famId);
      famsByPerson.set(parentId, list);
    }
    for (const childId of family.childIds) famcByPerson.set(childId, famId);
  });

  for (const person of personRows) {
    lines.push(`0 @I${personIndex.get(person.id)}@ INDI`);
    lines.push(`1 NAME ${gedcomName(person)}`);
    const birthDate = formatGedcomDate({
      precision: person.birth_date_precision,
      start: person.birth_date_start,
      end: person.birth_date_end,
    });
    if (birthDate || person.birth_date_precision !== "unknown") {
      lines.push("1 BIRT");
      if (birthDate) lines.push(`2 DATE ${birthDate}`);
    }
    if (person.is_deceased) {
      lines.push("1 DEAT");
      const deathDate = formatGedcomDate({
        precision: person.death_date_precision,
        start: person.death_date_start,
        end: person.death_date_end,
      });
      if (deathDate) lines.push(`2 DATE ${deathDate}`);
    }
    const famc = famcByPerson.get(person.id);
    if (famc) lines.push(`1 FAMC ${famc}`);
    for (const fams of famsByPerson.get(person.id) ?? []) lines.push(`1 FAMS ${fams}`);
  }

  families.forEach((family, i) => {
    lines.push(`0 @F${i + 1}@ FAM`);
    // Known roles (father/mother) are placed first and never overwritten;
    // only a parent with an unknown/absent role fills a remaining slot —
    // otherwise a lone known "mother" could wrongly land in HUSB just for
    // being first in sorted order.
    let husb: string | undefined;
    let wife: string | undefined;
    for (const parentId of family.parentIds) {
      const role = family.roleByParent.get(parentId);
      if (role === "father" && !husb) husb = parentId;
      else if (role === "mother" && !wife) wife = parentId;
    }
    for (const parentId of family.parentIds) {
      if (parentId === husb || parentId === wife) continue;
      if (!husb) husb = parentId;
      else if (!wife) wife = parentId;
    }

    if (husb) lines.push(`1 HUSB @I${personIndex.get(husb)}@`);
    if (wife && wife !== husb) lines.push(`1 WIFE @I${personIndex.get(wife)}@`);
    if (family.marriageType) {
      lines.push("1 MARR");
      if (family.marriageType === "former_spouse") lines.push("1 DIV");
    }
    for (const childId of family.childIds) lines.push(`1 CHIL @I${personIndex.get(childId)}@`);
  });

  lines.push("0 TRLR");

  const outPath = process.argv[2] ? resolve(process.argv[2]) : resolve(process.cwd(), "exports", "ogurtsov-family.ged");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

  console.log(`✓ GEDCOM экспортирован: ${outPath}`);
  console.log(`  Людей: ${personRows.length}, семей: ${families.length}`);
}

main().catch((error) => {
  console.error("✗ Экспорт прерван:", error instanceof Error ? error.message : error);
  process.exit(1);
});
