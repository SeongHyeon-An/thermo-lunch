create table if not exists public.restaurants (
  id text primary key,
  name text not null,
  category text not null default '기타',
  building text not null default '500m 이내',
  address text not null,
  floor text not null default '',
  distance integer not null default 0 check (distance >= 0),
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  note text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id text primary key,
  title text not null,
  content text not null,
  author text not null default '익명',
  password_hash text not null default 'c7680b18671c306147e947131d5a66e56f5a07c6a5de74d2d7773b48412ea24d',
  created_at timestamptz not null default now(),
  views integer not null default 0
);

create table if not exists public.reviews (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  author text not null,
  content text not null,
  rating integer not null default 0 check (rating between 0 and 5),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  author text not null,
  rating integer not null check (rating between 1 and 5),
  voter_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, voter_hash)
);

insert into public.ratings (id, restaurant_id, author, rating, voter_hash, created_at, updated_at)
select
  'legacy-' || legacy.id,
  legacy.restaurant_id,
  legacy.author,
  legacy.rating,
  'legacy:' || md5(lower(trim(legacy.author)) || ':' || legacy.password_hash),
  legacy.created_at,
  legacy.created_at
from (
  select distinct on (restaurant_id, lower(trim(author)), password_hash)
    id, restaurant_id, author, rating, password_hash, created_at
  from public.reviews
  where rating between 1 and 5
  order by restaurant_id, lower(trim(author)), password_hash, created_at desc
) as legacy
on conflict do nothing;

alter table public.reviews add column if not exists rating integer not null default 0 check (rating between 0 and 5);
alter table public.posts add column if not exists password_hash text not null default 'c7680b18671c306147e947131d5a66e56f5a07c6a5de74d2d7773b48412ea24d';
alter table public.restaurants drop constraint if exists restaurants_distance_check;
alter table public.restaurants add constraint restaurants_distance_check check (distance >= 0);

alter table public.restaurants enable row level security;
alter table public.posts enable row level security;
alter table public.reviews enable row level security;
alter table public.ratings enable row level security;

drop policy if exists "office directory public read" on public.restaurants;
drop policy if exists "office directory public insert" on public.restaurants;
drop policy if exists "office directory public update" on public.restaurants;
drop policy if exists "office directory public delete" on public.restaurants;
drop policy if exists "office board public read" on public.posts;
drop policy if exists "office board public insert" on public.posts;
drop policy if exists "office board public delete" on public.posts;
drop policy if exists "office reviews public read" on public.reviews;
drop policy if exists "office reviews public insert" on public.reviews;

create policy "office directory public read" on public.restaurants for select using (true);
create policy "office directory public insert" on public.restaurants for insert with check (true);
create policy "office directory public update" on public.restaurants for update using (true) with check (true);
create policy "office directory public delete" on public.restaurants for delete using (true);

create policy "office board public read" on public.posts for select using (true);
create policy "office board public insert" on public.posts for insert with check (true);
create policy "office board public delete" on public.posts for delete using (true);
create policy "office reviews public read" on public.reviews for select using (true);
create policy "office reviews public insert" on public.reviews for insert with check (true);

create index if not exists restaurants_name_idx on public.restaurants (name);
create index if not exists restaurants_distance_idx on public.restaurants (distance);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists reviews_restaurant_id_idx on public.reviews (restaurant_id, created_at desc);
create index if not exists ratings_restaurant_id_idx on public.ratings (restaurant_id);

drop function if exists public.update_review(text, text, text, text);
drop function if exists public.update_review(text, text, text, integer, text);

create or replace function public.update_review(
  p_id text,
  p_author text,
  p_content text,
  p_password_hash text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviews
  set author = p_author, content = p_content
  where id = p_id and password_hash = p_password_hash;
  return found;
end;
$$;

create or replace function public.get_rating_summaries()
returns table (restaurant_id text, average numeric, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select ratings.restaurant_id, round(avg(ratings.rating)::numeric, 2), count(*)
  from public.ratings
  group by ratings.restaurant_id;
$$;

create or replace function public.save_rating(
  p_restaurant_id text,
  p_author text,
  p_rating integer,
  p_voter_hash text
) returns table (average numeric, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if trim(p_author) = '' or p_rating not between 1 and 5 or length(p_voter_hash) <> 64 then
    raise exception 'invalid rating';
  end if;

  insert into public.ratings (id, restaurant_id, author, rating, voter_hash)
  values (gen_random_uuid()::text, p_restaurant_id, trim(p_author), p_rating, p_voter_hash)
  on conflict (restaurant_id, voter_hash)
  do update set author = excluded.author, rating = excluded.rating, updated_at = now();

  return query
  select round(avg(ratings.rating)::numeric, 2), count(*)
  from public.ratings
  where ratings.restaurant_id = p_restaurant_id;
end;
$$;

create or replace function public.delete_review(
  p_id text,
  p_password_hash text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.reviews
  where id = p_id and password_hash = p_password_hash;
  return found;
end;
$$;

create or replace function public.update_post(
  p_id text,
  p_author text,
  p_title text,
  p_content text,
  p_password_hash text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set author = p_author, title = p_title, content = p_content
  where id = p_id and password_hash = p_password_hash;
  return found;
end;
$$;

create or replace function public.delete_post(
  p_id text,
  p_password_hash text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.posts
  where id = p_id and password_hash = p_password_hash;
  return found;
end;
$$;

revoke all on table public.ratings from anon, authenticated;
grant execute on function public.update_review(text, text, text, text) to anon, authenticated;
grant execute on function public.delete_review(text, text) to anon, authenticated;
grant execute on function public.get_rating_summaries() to anon, authenticated;
grant execute on function public.save_rating(text, text, integer, text) to anon, authenticated;
grant execute on function public.update_post(text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_post(text, text) to anon, authenticated;
