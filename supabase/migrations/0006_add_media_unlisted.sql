-- A file that must exist in the database (and be linked to at least one
-- person, per the upload pipeline's requirement) but isn't really about
-- that person specifically — e.g. a general family-history recording
-- attached to whoever was convenient. Marking it `unlisted` hides it
-- from that person's own file list and from the site-wide archive; it
-- stays reachable only through a direct link a page builds on purpose
-- (CLAUDE.md 20: record real requests, not hypothetical ones).
alter table media
  add column unlisted boolean not null default false;
