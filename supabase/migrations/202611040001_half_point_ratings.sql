-- Apply once in the Supabase SQL editor. Does not delete application rows.
begin;

-- Private, point-in-time copies include voter IDs and password hashes.
-- Never expose this schema through the API or grant access to browser roles.
create schema backup_20261104;
revoke all on schema backup_20261104 from public, anon, authenticated;
create table backup_20261104.restaurants as table public.restaurants;
create table backup_20261104.posts as table public.posts;
create table backup_20261104.reviews as table public.reviews;
create table backup_20261104.ratings as table public.ratings;
create table backup_20261104.rating_functions as
select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('save_rating', 'get_my_rating', 'get_rating_summaries');

alter table public.ratings alter column rating type numeric(2,1) using rating::numeric(2,1);
alter table public.ratings drop constraint if exists ratings_rating_check;
alter table public.ratings add constraint ratings_rating_check
  check (rating between 0.5 and 5 and mod(rating, 0.5) = 0);

-- Avoid overloaded integer/numeric RPC signatures in PostgREST.
drop function if exists public.save_rating(text, integer, text);
create or replace function public.save_rating(
  p_restaurant_id text, p_rating numeric, p_voter_hash text
) returns table (average numeric, count bigint)
language plpgsql security definer set search_path = public as $$
begin
  if p_rating is null or p_rating < 0 or p_rating > 5
     or mod(p_rating, 0.5) <> 0
     or p_voter_hash is null or p_voter_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rating';
  end if;
  if p_rating = 0 then
    delete from public.ratings r
    where r.restaurant_id = p_restaurant_id and r.voter_hash = p_voter_hash;
  else
    insert into public.ratings (id, restaurant_id, author, rating, voter_hash)
    values (gen_random_uuid()::text, p_restaurant_id, '익명', p_rating, p_voter_hash)
    on conflict (restaurant_id, voter_hash)
    do update set rating = excluded.rating, updated_at = now();
  end if;
  return query select round(avg(r.rating)::numeric, 2), count(*)
  from public.ratings r where r.restaurant_id = p_restaurant_id;
end;
$$;

-- A return type change requires recreating this function, not replacing it.
drop function if exists public.get_my_rating(text, text);
create function public.get_my_rating(p_restaurant_id text, p_voter_hash text)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select r.rating from public.ratings r
  where r.restaurant_id = p_restaurant_id and r.voter_hash = p_voter_hash), 0);
$$;
revoke all on function public.save_rating(text, numeric, text) from public;
revoke all on function public.get_my_rating(text, text) from public;
grant execute on function public.save_rating(text, numeric, text) to anon, authenticated;
grant execute on function public.get_my_rating(text, text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
