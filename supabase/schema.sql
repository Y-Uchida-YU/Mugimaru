create extension if not exists "pgcrypto";

-- Reset app-specific objects.
drop table if exists public.reviews cascade;
drop table if exists public.spots cascade;
drop table if exists public.user_follows cascade;
drop table if exists public.direct_messages cascade;
drop table if exists public.board_chat_messages cascade;
drop table if exists public.saved_posts cascade;
drop table if exists public.board_post_stamps cascade;
drop table if exists public.board_post_likes cascade;
drop table if exists public.board_comments cascade;
drop table if exists public.board_posts cascade;
drop table if exists public.app_users cascade;
drop function if exists public.set_updated_at() cascade;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  email text,
  avatar_url text,
  header_url text,
  bio text,
  dog_name text,
  dog_breed text,
  prefecture text,
  city text,
  provider text not null check (provider in ('line', 'google', 'apple', 'x', 'email')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_external_id text not null,
  author_name text not null,
  category text not null,
  title text not null,
  body text not null,
  image_url text,
  author_avatar_url text,
  tags text[] not null default '{}',
  replies_count int not null default 0 check (replies_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  parent_comment_id uuid references public.board_comments(id) on delete cascade,
  author_external_id text not null,
  author_name text not null,
  author_avatar_url text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_post_likes (
  post_id uuid not null references public.board_posts(id) on delete cascade,
  user_external_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_external_id)
);

create table public.board_post_stamps (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  user_external_id text not null,
  stamp text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_external_id, stamp)
);

create table public.saved_posts (
  user_external_id text not null,
  post_id uuid not null references public.board_posts(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_external_id, post_id)
);

create table public.board_chat_messages (
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

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  sender_external_id text not null,
  receiver_external_id text not null,
  sender_name text not null default '',
  sender_avatar_url text not null default '',
  receiver_name text not null default '',
  receiver_avatar_url text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);

create table public.user_follows (
  follower_external_id text not null,
  followee_external_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_external_id, followee_external_id),
  check (follower_external_id <> followee_external_id)
);

create table public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('dogrun', 'vet', 'cafe', 'shop')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source text not null default 'osm',
  source_id text unique,
  source_url text,
  address text,
  phone text,
  website text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_external_id text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  author_external_id text,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create index idx_board_posts_created_at on public.board_posts (created_at desc);
create index idx_board_comments_post_created_at on public.board_comments (post_id, created_at asc);
create index idx_board_comments_parent on public.board_comments (parent_comment_id);
create index idx_board_post_likes_post_created_at on public.board_post_likes (post_id, created_at desc);
create index idx_board_post_stamps_post_created_at on public.board_post_stamps (post_id, created_at desc);
create index idx_saved_posts_user_saved_at on public.saved_posts (user_external_id, saved_at desc);
create index idx_saved_posts_post_id on public.saved_posts (post_id);
create index idx_board_chat_messages_created_at on public.board_chat_messages (created_at asc);
create index idx_direct_messages_thread_created_at on public.direct_messages (thread_id, created_at asc);
create index idx_direct_messages_sender_created_at on public.direct_messages (sender_external_id, created_at desc);
create index idx_direct_messages_receiver_created_at on public.direct_messages (receiver_external_id, created_at desc);
create index idx_user_follows_followee on public.user_follows (followee_external_id);
create index idx_user_follows_follower on public.user_follows (follower_external_id);
create index idx_spots_created_at on public.spots (created_at desc);
create index idx_spots_type_created_at on public.spots (type, created_at desc);
create index idx_reviews_spot_created_at on public.reviews (spot_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_app_users_set_updated_at
before update on public.app_users
for each row
execute function public.set_updated_at();

create trigger trg_board_posts_set_updated_at
before update on public.board_posts
for each row
execute function public.set_updated_at();

create trigger trg_board_comments_set_updated_at
before update on public.board_comments
for each row
execute function public.set_updated_at();

create trigger trg_board_chat_messages_set_updated_at
before update on public.board_chat_messages
for each row
execute function public.set_updated_at();

create trigger trg_spots_set_updated_at
before update on public.spots
for each row
execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;
alter table public.board_post_likes enable row level security;
alter table public.board_post_stamps enable row level security;
alter table public.saved_posts enable row level security;
alter table public.board_chat_messages enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_follows enable row level security;
alter table public.spots enable row level security;
alter table public.reviews enable row level security;

create policy "read app users"
on public.app_users
for select
using (true);

create policy "insert app users"
on public.app_users
for insert
with check (true);

create policy "update app users"
on public.app_users
for update
using (true)
with check (true);

create policy "read board posts"
on public.board_posts
for select
using (true);

create policy "insert board posts"
on public.board_posts
for insert
with check (true);

create policy "update board posts"
on public.board_posts
for update
using (true)
with check (true);

create policy "delete board posts"
on public.board_posts
for delete
using (true);

create policy "read board comments"
on public.board_comments
for select
using (true);

create policy "insert board comments"
on public.board_comments
for insert
with check (true);

create policy "update board comments"
on public.board_comments
for update
using (true)
with check (true);

create policy "read board post likes"
on public.board_post_likes
for select
using (true);

create policy "insert board post likes"
on public.board_post_likes
for insert
with check (true);

create policy "delete board post likes"
on public.board_post_likes
for delete
using (true);

create policy "read board post stamps"
on public.board_post_stamps
for select
using (true);

create policy "insert board post stamps"
on public.board_post_stamps
for insert
with check (true);

create policy "delete board post stamps"
on public.board_post_stamps
for delete
using (true);

create policy "read saved posts"
on public.saved_posts
for select
using (true);

create policy "insert saved posts"
on public.saved_posts
for insert
with check (true);

create policy "update saved posts"
on public.saved_posts
for update
using (true)
with check (true);

create policy "delete saved posts"
on public.saved_posts
for delete
using (true);

create policy "read board chat messages"
on public.board_chat_messages
for select
using (true);

create policy "insert board chat messages"
on public.board_chat_messages
for insert
with check (true);

create policy "update board chat messages"
on public.board_chat_messages
for update
using (true)
with check (true);

create policy "read direct messages"
on public.direct_messages
for select
using (true);

create policy "insert direct messages"
on public.direct_messages
for insert
with check (true);

create policy "read user follows"
on public.user_follows
for select
using (true);

create policy "insert user follows"
on public.user_follows
for insert
with check (true);

create policy "delete user follows"
on public.user_follows
for delete
using (true);

create policy "read spots"
on public.spots
for select
using (true);

create policy "insert spots"
on public.spots
for insert
with check (true);

create policy "update spots"
on public.spots
for update
using (true)
with check (true);

create policy "read reviews"
on public.reviews
for select
using (true);

create policy "insert reviews"
on public.reviews
for insert
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.app_users to anon, authenticated;
grant select, insert, update, delete on public.board_posts to anon, authenticated;
grant select, insert, update on public.board_comments to anon, authenticated;
grant select, insert, delete on public.board_post_likes to anon, authenticated;
grant select, insert, delete on public.board_post_stamps to anon, authenticated;
grant select, insert, update, delete on public.saved_posts to anon, authenticated;
grant select, insert, update on public.board_chat_messages to anon, authenticated;
grant select, insert on public.direct_messages to anon, authenticated;
grant select, insert, delete on public.user_follows to anon, authenticated;
grant select, insert, update on public.spots to anon, authenticated;
grant select, insert on public.reviews to anon, authenticated;
