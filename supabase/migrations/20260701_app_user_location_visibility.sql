alter table public.app_users
add column if not exists location_public boolean not null default true;
