-- Applied to production on 2026-07-27.
-- Kept as the first incremental migration record for future environments.

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

alter table public.ratings enable row level security;
create index if not exists ratings_restaurant_id_idx on public.ratings (restaurant_id);

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

revoke all on table public.ratings from anon, authenticated;
grant execute on function public.get_rating_summaries() to anon, authenticated;
grant execute on function public.save_rating(text, text, integer, text) to anon, authenticated;
