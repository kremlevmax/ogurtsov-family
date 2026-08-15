-- Семейное дерево Огурцовых — начальная схема (Этап 0).
-- Соответствует модели данных из CLAUDE.md, раздел 7.
-- Эта миграция НЕ применялась к удаленному проекту.

create extension if not exists pg_trgm;

-- ============================================================
-- Перечисления
-- ============================================================

create type date_precision as enum (
  'unknown', 'exact', 'year', 'month', 'approximate', 'range'
);

create type relationship_type as enum (
  'biological_parent', 'adoptive_parent', 'foster_parent', 'guardian',
  'spouse', 'former_spouse', 'partner'
);

create type parent_role as enum ('mother', 'father', 'parent');

create type media_kind as enum ('photo', 'document', 'audio', 'video', 'archive', 'other');

create type pending_upload_status as enum ('pending', 'completed', 'expired', 'failed');

-- ============================================================
-- Общие функции
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- editors — два заранее созданных редактора (CLAUDE.md 7.1)
-- ============================================================

create table editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- security definer намеренно: позволяет другим политикам проверять
-- членство в editors, не читая саму таблицу editors напрямую (без рекурсии RLS).
create or replace function is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from editors where user_id = auth.uid());
$$;

alter table editors enable row level security;

create policy "editors_select_self" on editors
  for select using (auth.uid() = user_id);

-- ============================================================
-- places (CLAUDE.md 7.3)
-- ============================================================

create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  country text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_approximate boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references editors (user_id) on delete set null,
  updated_by uuid references editors (user_id) on delete set null,
  deleted_at timestamptz
);

create index places_deleted_at_idx on places (deleted_at);

create trigger places_set_updated_at
  before update on places
  for each row execute function set_updated_at();

alter table places enable row level security;

create policy "places_public_select" on places
  for select using (deleted_at is null);

create policy "places_editor_all" on places
  for all using (is_editor()) with check (is_editor());

-- ============================================================
-- people (CLAUDE.md 7.2)
-- ============================================================

create table people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  middle_name text,
  last_name text,
  maiden_name text,
  display_name text not null,
  is_placeholder boolean not null default false,

  birth_date_precision date_precision not null default 'unknown',
  birth_date_start date,
  birth_date_end date,
  birth_date_text text,
  birth_place_id uuid references places (id) on delete set null,

  death_date_precision date_precision not null default 'unknown',
  death_date_start date,
  death_date_end date,
  death_date_text text,
  death_place_id uuid references places (id) on delete set null,

  profession text,
  education text,
  short_bio text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references editors (user_id) on delete set null,
  updated_by uuid references editors (user_id) on delete set null,
  deleted_at timestamptz
);

create index people_deleted_at_idx on people (deleted_at);
create index people_first_name_trgm_idx on people using gin (first_name gin_trgm_ops);
create index people_last_name_trgm_idx on people using gin (last_name gin_trgm_ops);
create index people_maiden_name_trgm_idx on people using gin (maiden_name gin_trgm_ops);
create index people_display_name_trgm_idx on people using gin (display_name gin_trgm_ops);

create trigger people_set_updated_at
  before update on people
  for each row execute function set_updated_at();

alter table people enable row level security;

create policy "people_public_select" on people
  for select using (deleted_at is null);

create policy "people_editor_all" on people
  for all using (is_editor()) with check (is_editor());

-- ============================================================
-- relationships (CLAUDE.md 7.4)
-- from_person_id — родитель/первый партнер, to_person_id — ребенок/второй партнер
-- ============================================================

create table relationships (
  id uuid primary key default gen_random_uuid(),
  from_person_id uuid not null references people (id) on delete cascade,
  to_person_id uuid not null references people (id) on delete cascade,
  relationship_type relationship_type not null,
  parent_role parent_role,

  start_date_precision date_precision not null default 'unknown',
  start_date_start date,
  start_date_end date,
  start_date_text text,
  end_date_precision date_precision not null default 'unknown',
  end_date_start date,
  end_date_end date,
  end_date_text text,

  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references editors (user_id) on delete set null,
  updated_by uuid references editors (user_id) on delete set null,
  deleted_at timestamptz,

  constraint relationships_no_self check (from_person_id <> to_person_id),
  constraint relationships_parent_role_matches_type check (
    (
      relationship_type in ('biological_parent', 'adoptive_parent', 'foster_parent', 'guardian')
      and parent_role is not null
    )
    or (
      relationship_type not in ('biological_parent', 'adoptive_parent', 'foster_parent', 'guardian')
      and parent_role is null
    )
  )
);

create index relationships_from_person_idx on relationships (from_person_id);
create index relationships_to_person_idx on relationships (to_person_id);
create index relationships_deleted_at_idx on relationships (deleted_at);

-- Запрещает дубликат одной и той же родительской связи (не A-B и B-A —
-- направление здесь смыслово различно, родитель всегда from_person_id).
create unique index relationships_parent_unique_idx on relationships (
  from_person_id, to_person_id, relationship_type
) where deleted_at is null and relationship_type in (
  'biological_parent', 'adoptive_parent', 'foster_parent', 'guardian'
);

-- Запрещает дубликат пары A-B и B-A для симметричных связей супругов/партнеров.
create unique index relationships_partner_unique_idx on relationships (
  least(from_person_id, to_person_id),
  greatest(from_person_id, to_person_id),
  relationship_type
) where deleted_at is null and relationship_type in ('spouse', 'former_spouse', 'partner');

create trigger relationships_set_updated_at
  before update on relationships
  for each row execute function set_updated_at();

-- Запрещает очевидный цикл «человек — собственный предок»: перед
-- сохранением родительской связи проверяем, что ребенок еще не входит
-- в список предков предполагаемого родителя.
create or replace function prevent_ancestor_cycle()
returns trigger
language plpgsql
as $$
begin
  if new.relationship_type not in ('biological_parent', 'adoptive_parent', 'foster_parent', 'guardian') then
    return new;
  end if;

  if exists (
    with recursive ancestors as (
      select from_person_id as person_id
      from relationships
      where to_person_id = new.from_person_id
        and deleted_at is null
        and relationship_type in ('biological_parent', 'adoptive_parent', 'foster_parent', 'guardian')
      union
      select r.from_person_id
      from relationships r
      inner join ancestors a on r.to_person_id = a.person_id
      where r.deleted_at is null
        and r.relationship_type in ('biological_parent', 'adoptive_parent', 'foster_parent', 'guardian')
    )
    select 1 from ancestors where person_id = new.to_person_id
  ) then
    raise exception 'Обнаружен цикл: человек не может быть предком самого себя';
  end if;

  return new;
end;
$$;

create trigger relationships_prevent_cycle
  before insert or update on relationships
  for each row execute function prevent_ancestor_cycle();

alter table relationships enable row level security;

create policy "relationships_public_select" on relationships
  for select using (deleted_at is null);

create policy "relationships_editor_all" on relationships
  for all using (is_editor()) with check (is_editor());

-- ============================================================
-- media (CLAUDE.md 7.5, 3.8) — 100 MiB = 104857600 bytes
-- ============================================================

create table media (
  id uuid primary key default gen_random_uuid(),
  kind media_kind not null,
  title text not null,
  caption text,
  source_or_owner text,

  date_precision date_precision not null default 'unknown',
  date_start date,
  date_end date,
  date_text text,
  place_id uuid references places (id) on delete set null,

  object_key text not null unique,
  original_filename text not null,
  mime_type text not null,
  extension text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  sha256 text,
  width integer,
  height integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references editors (user_id) on delete set null,
  updated_by uuid references editors (user_id) on delete set null,
  deleted_at timestamptz
);

create index media_deleted_at_idx on media (deleted_at);

create trigger media_set_updated_at
  before update on media
  for each row execute function set_updated_at();

alter table media enable row level security;

create policy "media_public_select" on media
  for select using (deleted_at is null);

create policy "media_editor_all" on media
  for all using (is_editor()) with check (is_editor());

-- ============================================================
-- person_media (CLAUDE.md 7.6)
-- ============================================================

create table person_media (
  person_id uuid not null references people (id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  is_profile boolean not null default false,
  sort_order integer not null default 0,
  primary key (person_id, media_id)
);

-- Не более одной активной фотографии профиля на человека.
create unique index person_media_one_profile_idx on person_media (person_id) where is_profile;

alter table person_media enable row level security;

create policy "person_media_public_select" on person_media
  for select using (
    exists (select 1 from people p where p.id = person_id and p.deleted_at is null)
    and exists (select 1 from media m where m.id = media_id and m.deleted_at is null)
  );

create policy "person_media_editor_all" on person_media
  for all using (is_editor()) with check (is_editor());

-- ============================================================
-- site_settings (CLAUDE.md 7.7) — singleton-таблица
-- ============================================================

create table site_settings (
  id boolean primary key default true,
  site_title text not null default 'Семейное дерево Огурцовых',
  root_person_id uuid references people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id)
);

insert into site_settings (id) values (true);

create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;

create policy "site_settings_public_select" on site_settings
  for select using (true);

create policy "site_settings_editor_update" on site_settings
  for update using (is_editor()) with check (is_editor());

-- ============================================================
-- pending_uploads (CLAUDE.md 7.8) — двухэтапный upload flow
-- ============================================================

create table pending_uploads (
  id uuid primary key default gen_random_uuid(),
  editor_id uuid not null references editors (user_id) on delete cascade,
  object_key text not null unique,
  expected_mime_type text not null,
  expected_size_bytes bigint not null check (
    expected_size_bytes > 0 and expected_size_bytes <= 104857600
  ),
  status pending_upload_status not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index pending_uploads_expires_at_idx on pending_uploads (expires_at)
  where status = 'pending';

alter table pending_uploads enable row level security;

create policy "pending_uploads_editor_own" on pending_uploads
  for all using (editor_id = auth.uid()) with check (editor_id = auth.uid());
