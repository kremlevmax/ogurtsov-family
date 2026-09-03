-- Registration only asked for one "Имя" field, so a member's surname
-- had nowhere to go — split into first/last name (owner's report after
-- testing). Renames the existing column rather than adding a new one:
-- whatever a member already typed becomes their first name, last name
-- starts empty for existing rows (there's no way to infer it after the
-- fact) until they re-save it from a future profile-edit page.

alter table lounge_profiles rename column display_name to first_name;
alter table lounge_profiles add column last_name text not null default '';
alter table lounge_profiles alter column last_name drop default;

create or replace function handle_new_lounge_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'lounge_first_name' then
    insert into lounge_profiles (user_id, first_name, last_name)
    values (
      new.id,
      new.raw_user_meta_data ->> 'lounge_first_name',
      coalesce(new.raw_user_meta_data ->> 'lounge_last_name', '')
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
