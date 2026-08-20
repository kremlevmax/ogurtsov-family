/**
 * `npm run relationships:fix-orphans [-- --apply]`
 *
 * Soft-deleting a person only ever touched `people.deleted_at` — any
 * `relationships` row pointing at that person (as parent, child, or
 * spouse) was left active. `build-graph.ts` builds a family-unit node
 * for such a row regardless, so the tree grows a dangling stub with no
 * person cell at the end (real bug report: Косолапов Александр
 * Иванович — a deleted second spouse and two deleted children left
 * three and two orphaned rows behind).
 *
 * `softDeletePerson` (server/repositories/people.ts) now cascades this
 * at the source, so this script is only for auditing/cleaning rows that
 * predate that fix (or that a manual DB edit created). Dry run by
 * default; pass `--apply` to actually soft-delete what it finds.
 */
import { loadEnvLocal } from "./lib/env";
import { createScriptSupabaseClient } from "./lib/supabase-admin";

loadEnvLocal();

async function main() {
  const apply = process.argv.includes("--apply");
  const { supabase, hasFullAccess } = createScriptSupabaseClient();

  if (!hasFullAccess) {
    console.error("✗ Нужен SUPABASE_SERVICE_ROLE_KEY в .env.local — иначе мягко удалённые люди не видны и починка невозможна.");
    process.exit(1);
  }

  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id")
    .is("deleted_at", null);
  if (peopleError) throw peopleError;

  const { data: relationships, error: relError } = await supabase
    .from("relationships")
    .select("id, from_person_id, to_person_id, relationship_type")
    .is("deleted_at", null);
  if (relError) throw relError;

  const livingIds = new Set((people ?? []).map((p) => p.id));
  const orphans = (relationships ?? []).filter(
    (r) => !livingIds.has(r.from_person_id) || !livingIds.has(r.to_person_id),
  );

  if (orphans.length === 0) {
    console.log("✓ Осиротевших связей не найдено.");
    return;
  }

  console.log(`Найдено осиротевших связей: ${orphans.length}`);
  for (const r of orphans) {
    console.log(`  ${r.id} (${r.relationship_type}): ${r.from_person_id} -> ${r.to_person_id}`);
  }

  if (!apply) {
    console.log("\nЭто предварительный просмотр. Запустите с --apply, чтобы мягко удалить эти связи.");
    return;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("relationships")
    .update({ deleted_at: now })
    .in("id", orphans.map((r) => r.id));
  if (updateError) throw updateError;

  console.log(`\n✓ Помечены как удалённые: ${orphans.length} связей.`);
}

main().catch((error) => {
  console.error("✗ Не удалось выполнить проверку:", error instanceof Error ? error.message : error);
  process.exit(1);
});
