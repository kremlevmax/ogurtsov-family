-- Owner decision (2026-09-20, docs/DECISIONS.md): "Требуется уточнение"
-- becomes a real fourth status, not just an editor emailing the member
-- out of band. Split into its own migration because Postgres forbids
-- using a freshly added enum value inside the same transaction that
-- added it (0026_tree_access_needs_info_flow.sql, which adds the
-- columns/policies that reference 'needs_info', must run after this
-- one has committed).
alter type lounge_tree_access_status add value 'needs_info';
