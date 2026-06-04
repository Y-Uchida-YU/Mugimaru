alter table public.board_posts
  add column if not exists image_urls text[] not null default '{}';

alter table public.direct_messages
  add column if not exists read_at timestamptz;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_external_id text not null,
  actor_external_id text not null,
  actor_name text not null default '',
  actor_avatar_url text,
  type text not null check (type in ('like', 'follow', 'dm')),
  post_id uuid references public.board_posts(id) on delete cascade,
  thread_id text,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_created_at
  on public.notifications (recipient_external_id, created_at desc);

create index if not exists idx_notifications_recipient_read_at
  on public.notifications (recipient_external_id, read_at);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'direct_messages' and policyname = 'update direct messages'
  ) then
    create policy "update direct messages"
    on public.direct_messages
    for update
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'read notifications'
  ) then
    create policy "read notifications"
    on public.notifications
    for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'insert notifications'
  ) then
    create policy "insert notifications"
    on public.notifications
    for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'update notifications'
  ) then
    create policy "update notifications"
    on public.notifications
    for update
    using (true)
    with check (true);
  end if;
end $$;

grant select, insert, update on public.direct_messages to anon, authenticated;
grant select, insert, update on public.notifications to anon, authenticated;
