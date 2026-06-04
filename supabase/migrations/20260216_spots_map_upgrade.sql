-- Non-destructive migration for map spot enhancements
-- Apply this if you already have data and do not want to reset all tables.

alter table public.spots
  drop constraint if exists spots_type_check;

alter table public.spots
  add constraint spots_type_check
  check (type in ('dogrun', 'vet', 'cafe', 'shop'));

alter table public.spots add column if not exists source text not null default 'osm';
alter table public.spots add column if not exists source_id text;
alter table public.spots add column if not exists source_url text;
alter table public.spots add column if not exists address text;
alter table public.spots add column if not exists phone text;
alter table public.spots add column if not exists website text;
alter table public.spots add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.spots add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_spots_source_id_unique on public.spots (source_id) where source_id is not null;
create index if not exists idx_spots_type_created_at on public.spots (type, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_spots_set_updated_at'
  ) then
    create trigger trg_spots_set_updated_at
    before update on public.spots
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spots'
      and policyname = 'update spots'
  ) then
    create policy "update spots"
    on public.spots
    for update
    using (true)
    with check (true);
  end if;
end;
$$;

grant select, insert, update on public.spots to anon, authenticated;
