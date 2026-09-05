-- "Документы" redesign (ogurtsovy_pages_handoff_v2, owner's request):
-- a document category sidebar/filter, and a "Расшифровка" (transcript)
-- tab in the document viewer. Both are real, owner-approved additions
-- to `media`, not fixture-only stand-ins.
--
-- `category` is plain nullable text, not a new enum — the fixed list of
-- category labels shown in the UI (lib/validation/document-category.ts)
-- is enforced at the application layer (same simplicity call already
-- made for CLAUDE.md's own model: it never asked for DB-level
-- category enforcement). A null category groups under "Другие
-- документы" in the UI, same shape as every other optional media field.
--
-- "Источник" (source) already exists as `media.source_or_owner`
-- (0001_init.sql) — CLAUDE.md 3.7 describes that field as covering
-- "автор, владелец оригинала ИЛИ источник" already, so no new column
-- for that tab.
alter table media
  add column category text,
  add column transcript text;
