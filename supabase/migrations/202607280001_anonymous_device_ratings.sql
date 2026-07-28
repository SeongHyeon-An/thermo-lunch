-- Replace name/password rating identity with one anonymous browser identity.

drop function if exists public.save_rating(text, text, integer, text);

create or replace function public.save_rating(
  p_restaurant_id text,
  p_rating integer,
  p_voter_hash text
) returns table (average numeric, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_rating not between 0 and 5 or length(p_voter_hash) <> 64 then
    raise exception 'invalid rating';
  end if;

  if p_rating = 0 then
    delete from public.ratings
    where ratings.restaurant_id = p_restaurant_id
      and ratings.voter_hash = p_voter_hash;
  else
    insert into public.ratings (id, restaurant_id, author, rating, voter_hash)
    values (gen_random_uuid()::text, p_restaurant_id, '익명', p_rating, p_voter_hash)
    on conflict (restaurant_id, voter_hash)
    do update set rating = excluded.rating, updated_at = now();
  end if;

  return query
  select round(avg(ratings.rating)::numeric, 2), count(*)
  from public.ratings
  where ratings.restaurant_id = p_restaurant_id;
end;
$$;

create or replace function public.get_my_rating(
  p_restaurant_id text,
  p_voter_hash text
) returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select ratings.rating
    from public.ratings
    where ratings.restaurant_id = p_restaurant_id
      and ratings.voter_hash = p_voter_hash
  ), 0);
$$;

grant execute on function public.save_rating(text, integer, text) to anon, authenticated;
grant execute on function public.get_my_rating(text, text) to anon, authenticated;
