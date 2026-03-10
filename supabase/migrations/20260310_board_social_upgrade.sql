-- Board social upgrade: likes / stamps / chat messages
-- Non-destructive migration for existing projects.

create extension if not exists "pgcrypto";

create table if not exists public.board_post_likes (
  post_id uuid not null references public.board_posts(id) on delete cascade,
  user_external_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_external_id)
);

create table if not exists public.board_post_stamps (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  user_external_id text not null,
  stamp text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_external_id, stamp)
);

create table if not exists public.board_chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_external_id text not null,
  author_name text not null,
  author_avatar_url text,
  body text not null default '',
  sticker text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_board_post_likes_post_created_at
  on public.board_post_likes (post_id, created_at desc);
create index if not exists idx_board_post_stamps_post_created_at
  on public.board_post_stamps (post_id, created_at desc);
create index if not exists idx_board_chat_messages_created_at
  on public.board_chat_messages (created_at asc);

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
    where tgname = 'trg_board_chat_messages_set_updated_at'
  ) then
    create trigger trg_board_chat_messages_set_updated_at
    before update on public.board_chat_messages
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

alter table public.board_post_likes enable row level security;
alter table public.board_post_stamps enable row level security;
alter table public.board_chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_post_likes'
      and policyname = 'read board post likes'
  ) then
    create policy "read board post likes"
    on public.board_post_likes
    for select
    using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_post_likes'
      and policyname = 'insert board post likes'
  ) then
    create policy "insert board post likes"
    on public.board_post_likes
    for insert
    with check (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_post_likes'
      and policyname = 'delete board post likes'
  ) then
    create policy "delete board post likes"
    on public.board_post_likes
    for delete
    using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_post_stamps'
      and policyname = 'read board post stamps'
  ) then
    create policy "read board post stamps"
    on public.board_post_stamps
    for select
    using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_post_stamps'
      and policyname = 'insert board post stamps'
  ) then
    create policy "insert board post stamps"
    on public.board_post_stamps
    for insert
    with check (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_post_stamps'
      and policyname = 'delete board post stamps'
  ) then
    create policy "delete board post stamps"
    on public.board_post_stamps
    for delete
    using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_chat_messages'
      and policyname = 'read board chat messages'
  ) then
    create policy "read board chat messages"
    on public.board_chat_messages
    for select
    using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_chat_messages'
      and policyname = 'insert board chat messages'
  ) then
    create policy "insert board chat messages"
    on public.board_chat_messages
    for insert
    with check (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'board_chat_messages'
      and policyname = 'update board chat messages'
  ) then
    create policy "update board chat messages"
    on public.board_chat_messages
    for update
    using (true)
    with check (true);
  end if;
end;
$$;

grant select, insert, delete on public.board_post_likes to anon, authenticated;
grant select, insert, delete on public.board_post_stamps to anon, authenticated;
grant select, insert, update on public.board_chat_messages to anon, authenticated;
