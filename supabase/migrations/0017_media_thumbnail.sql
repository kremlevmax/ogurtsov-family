-- PDF card thumbnails (owner's request): a small first-page PNG
-- rendered client-side at upload time (pdf.js is already loaded there
-- for the /archive viewer), uploaded as a lightweight derivative next
-- to the original — never re-rendered per page view, matching the same
-- "generate derivatives at upload, not on every read" principle
-- CLAUDE.md 14 already applies to photo thumbnails.
alter table media
  add column thumbnail_object_key text;
