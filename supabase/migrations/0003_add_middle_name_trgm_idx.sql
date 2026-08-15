-- Недостающий trigram-индекс для middle_name (CLAUDE.md 8: поиск должен
-- находить по имени, фамилии, отчеству и девичьей фамилии). Индексы на
-- first_name/last_name/maiden_name/display_name уже были в 0001_init.sql.

create index people_middle_name_trgm_idx on people using gin (middle_name gin_trgm_ops);
