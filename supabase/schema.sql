create table if not exists public.restaurants (
  id text primary key,
  name text not null,
  category text not null default '기타',
  building text not null default '500m 이내',
  address text not null,
  floor text not null default '',
  distance integer not null default 0 check (distance between 0 and 500),
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

alter table public.reviews add column if not exists rating integer not null default 0 check (rating between 0 and 5);

alter table public.restaurants enable row level security;
alter table public.posts enable row level security;
alter table public.reviews enable row level security;

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

drop function if exists public.update_review(text, text, text, text);

create or replace function public.update_review(
  p_id text,
  p_author text,
  p_content text,
  p_rating integer,
  p_password_hash text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviews
  set author = p_author, content = p_content, rating = p_rating
  where id = p_id and password_hash = p_password_hash;
  return found;
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

grant execute on function public.update_review(text, text, text, integer, text) to anon, authenticated;
grant execute on function public.delete_review(text, text) to anon, authenticated;

insert into public.restaurants
  (id, name, category, building, address, floor, distance, rating, note, tags)
values
  ('r1', '우리집순두부', '한식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '지하 식당가', 160, 0, '순두부와 한식 메뉴. 혼밥하기 편한 곳으로 알려져 있어요.', array['혼밥','찌개']),
  ('r2', '스미식당 수서역점', '일식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '지하 1층 132호', 160, 0, '덮밥과 카레 메뉴 중심.', array['덮밥','혼밥']),
  ('r3', '미소야 수서점', '일식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '지하 식당가', 160, 0, '돈카츠, 우동 등 다양한 일식 메뉴.', array['돈카츠','우동']),
  ('r4', '황금식탁', '한식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '지하 1층', 160, 0, '낙지볶음과 닭요리 중심.', array['낙지','점심']),
  ('r5', '포 수서점', '기타', '현대벤처빌', '서울 강남구 밤고개로1길 10', '지하 2층 B203호', 170, 0, '쌀국수와 베트남식 덮밥.', array['쌀국수','혼밥']),
  ('r6', '큰물참치 수서점', '일식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '상가', 160, 0, '참치회와 일식 식사.', array['참치','회식']),
  ('r7', '치마오', '중식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '상가', 160, 0, '중식 메뉴를 찾을 때 확인해 볼 곳.', array['중식','점심']),
  ('r8', '육대장 수서점', '한식', '로즈데일', '서울 강남구 광평로 280', '지하 2층 124호', 80, 0, '육개장과 칼국수. 수서역과 연결되어 비 오는 날도 편해요.', array['육개장','해장']),
  ('r9', '판교집 수서직영점', '한식', '로즈데일', '서울 강남구 광평로 280', '지하 2층 137호', 80, 0, '한돈 급랭삼겹살과 점심 식사 메뉴.', array['삼겹살','회식']),
  ('r10', '올라포케 수서점', '기타', '로즈데일', '서울 강남구 광평로 280', '지하 2층 B125호', 80, 0, '가볍고 산뜻한 포케 메뉴.', array['포케','샐러드']),
  ('r11', '수서광안리', '한식', '로즈데일', '서울 강남구 광평로 280', '상가', 80, 0, '수서역 인근 한식 식당.', array['한식','점심']),
  ('r12', '초원복집', '한식', '로즈데일', '서울 강남구 광평로 280', '상가', 80, 0, '복 요리 전문점.', array['복요리','모임']),
  ('r13', '봉평메밀촌 수서점', '한식', '로즈데일', '서울 강남구 광평로 280', '지하 2층 123호', 80, 0, '메밀 메뉴와 한식.', array['메밀','점심']),
  ('r14', '쇼부라멘 수서역점', '일식', '로즈데일', '서울 강남구 광평로 280', '상가', 80, 0, '라멘을 찾을 때 들르기 좋은 곳.', array['라멘','혼밥']),
  ('r15', '동경규동 수서점', '일식', '500m 이내', '서울 강남구 광평로 295', '상가', 190, 0, '규동과 돈까스 덮밥.', array['규동','혼밥']),
  ('r16', '가장맛있는족발 수서역점', '한식', '500m 이내', '서울 강남구 광평로 295', '1층', 190, 0, '족발과 보쌈. 저녁 모임 후보.', array['족발','회식']),
  ('r17', '수서역 벌교한상', '한식', '500m 이내', '서울 강남구 광평로46길 7', '상가', 350, 0, '벌교식 한상차림과 한식.', array['한식','모임'])
on conflict (id) do nothing;

update public.restaurants set category = '기타' where id in ('r5', 'r10');
update public.restaurants set category = '한식' where id in ('r9', 'r16');

insert into public.posts (id, title, content, author, created_at, views)
values
  ('p1', '점심 번개 같이 가실 분?', '오늘 11시 40분에 로즈데일 쪽으로 가려고 합니다. 메뉴 추천도 받아요!', '수서미식가', '2026-07-24T02:20:00.000Z', 12),
  ('p2', '새로 생긴 식당 발견하면 여기 남겨주세요', '상호와 대략적인 위치만 적어주셔도 목록에 반영하기 쉬워요.', '관리자', '2026-07-23T07:10:00.000Z', 28)
on conflict (id) do nothing;
