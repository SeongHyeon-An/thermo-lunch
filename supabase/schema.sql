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
alter table public.restaurants drop constraint if exists restaurants_distance_check;
alter table public.restaurants add constraint restaurants_distance_check check (distance >= 0);

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

insert into public.restaurants (id, name, category, building, address, floor, distance, rating, note, tags) values
  ('a01', '온화담', '한식', '수서 인근', '서울 강남구 광평로46길 6', '', 407, 0, '첨부 목록에서 추가한 수서 인근 한식당이에요.', array['한식','점심']),
  ('a02', '필경재', '한식', '수서 인근', '서울 강남구 광평로 205', '', 746, 0, '한정식과 모임 장소를 찾을 때 확인해 볼 곳이에요.', array['한정식','모임']),
  ('a03', '전주집', '한식', '로즈데일', '서울 강남구 수서동 724', '', 89, 0, '로즈데일 인근의 한식 식당이에요.', array['한식','점심']),
  ('a04', '청국장과보리밥 수서점', '한식', '수서 인근', '서울 강남구 수서동 450-4', '', 363, 0, '청국장과 보리밥 중심의 한식당이에요.', array['청국장','보리밥']),
  ('a05', '웰체인 (얼큰짬뽕)', '중식', '수서 인근', '서울 강남구 광평로51길 27', '', 86, 0, '얼큰한 짬뽕을 찾을 때 좋은 중식 후보예요.', array['짬뽕','중식']),
  ('a06', '서래향 수서점', '중식', '수서 인근', '서울 강남구 수서동 714-5', '', 52, 0, '수서역 가까운 중식당이에요.', array['중식','모임']),
  ('a07', '만달린', '중식', '현대벤처빌', '서울 강남구 수서동 713', '지하 1층', 78, 0, '현대벤처빌 인근에서 중식을 찾을 때 확인해 보세요.', array['중식','점심']),
  ('a08', '모모텐동', '일식', '수서 인근', '서울 강남구 광평로47길 17', '', 280, 0, '텐동과 튀김 덮밥을 즐길 수 있는 일식당이에요.', array['텐동','혼밥']),
  ('a09', '스시야 본점', '일식', '로즈데일', '서울 강남구 수서동 724', '', 101, 0, '초밥과 일식 메뉴를 찾을 때 확인해 볼 곳이에요.', array['스시','일식']),
  ('a10', 'RiaNe (와인다이닝)', '양식', '수서 인근', '서울 강남구 수서동 736 신동아상가', '2층', 280, 0, '와인과 양식 메뉴를 함께 즐기는 다이닝이에요.', array['와인','양식']),
  ('a11', '플레이팅 수서역사점', '기타', 'SRT 수서역', '서울 강남구 밤고개로 99', '지하 1층', 257, 0, 'SRT 수서역 안에서 빠르게 식사할 때 편리해요.', array['역사','간편식']),
  ('a12', '밀탑 수서역점', '기타', '로즈데일', '서울 강남구 광평로 280', '', 89, 0, '식사 후 디저트와 빙수를 찾을 때 좋은 후보예요.', array['빙수','디저트']),
  ('a13', '커피빈 수서점', '기타', '수서 인근', '서울 강남구 광평로51길 6-23', '', 161, 0, '커피와 간단한 휴식을 위한 카페예요.', array['카페','커피']),
  ('a14', '달빛서원', '기타', '수서 인근', '서울 강남구 광평로47길 17', '상가 1층', 284, 0, '수서 인근의 카페·디저트 후보예요.', array['카페','디저트']),
  ('a15', '노타임포유', '기타', '수서 인근', '서울 강남구 광평로46길 22', '', 420, 0, '커피와 잠깐의 휴식을 위한 카페예요.', array['카페','커피']),
  ('a16', '아이 러브 커피', '기타', '500m 이내', '서울 강남구 광평로 295', '서관동 107호', 192, 0, '사무실 가까이에서 커피를 마시기 좋은 카페예요.', array['카페','커피']),
  ('a17', '김밥천국 수서역점', '기타', '현대벤처빌', '서울 강남구 밤고개로1길 10', '', 51, 0, '김밥과 분식, 간단한 식사를 빠르게 해결하기 좋아요.', array['김밥','분식']),
  ('a18', '가을한상 (수서역 SRT)', '한식', 'SRT 수서역', '서울 강남구 수서동 214-2', '', 269, 0, '수서역에서 한식 한 끼를 찾을 때 좋은 후보예요.', array['한식','역사']),
  ('a19', '효미역', '한식', '수서 인근', '서울 강남구 광평로 240', '', 404, 0, '수서 인근 한식 식당으로 첨부 목록에서 추가했어요.', array['한식','점심']),
  ('a20', '와세다식당', '일식', '로즈데일', '서울 강남구 광평로 280', '지하 2층', 89, 0, '로즈데일 지하 식당가의 일식당이에요.', array['일식','점심']),
  ('a21', '반가안동국시', '한식', '수서 인근', '서울 강남구 수서동 450-3', '', 377, 0, '안동국시와 따뜻한 한식 메뉴를 찾을 때 좋아요.', array['국시','한식']),
  ('a22', '논골집 (수서점, 궁마을)', '한식', '수서 인근', '서울 강남구 수서동 450-1', '', 367, 0, '궁마을 방향의 한식·고기 식당 후보예요.', array['고기','회식']),
  ('a23', '완백부대찌개 고사리꽃삼겹 수서역점', '한식', '로즈데일', '서울 강남구 광평로 280', '116호', 86, 0, '부대찌개와 삼겹살 메뉴를 함께 고를 수 있어요.', array['부대찌개','삼겹살']),
  ('a24', 'Hanam Pig House 수서역점', '한식', '수서 인근', '서울 강남구 수서동 714-6', '', 36, 0, '돼지고기 구이와 회식 메뉴를 찾을 때 확인해 보세요.', array['돼지고기','회식']),
  ('a25', '제주몽트락 수서직영점', '한식', '수서 인근', '서울 강남구 수서동 717-6', '', 104, 0, '제주식 돼지고기 메뉴를 찾을 때 좋은 후보예요.', array['제주고기','회식']),
  ('a26', '단미그린비', '한식', '수서 인근', '서울 강남구 수서동 인근', '', 971, 0, '첨부 목록에 포함된 수서권 한식당이에요.', array['한식','모임']),
  ('a27', '더치앤빈 수서현대벤처빌점', '기타', '현대벤처빌', '서울 강남구 밤고개로1길 10', '', 52, 0, '현대벤처빌 안에서 커피를 마시기 편한 카페예요.', array['카페','커피']),
  ('a28', '본죽&비빔밥 수서점', '한식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '', 52, 0, '죽과 비빔밥으로 가볍게 한 끼 하기 좋아요.', array['죽','비빔밥']),
  ('a29', '샐러디 수서점', '양식', '현대벤처빌', '서울 강남구 밤고개로1길 10', '', 52, 0, '샐러드와 웜볼 등 가벼운 점심을 고를 수 있어요.', array['샐러드','건강식']),
  ('a30', '홍콩반점0410 수서점', '중식', '로즈데일', '서울 강남구 광평로 280', '', 86, 0, '짜장면과 짬뽕 등 익숙한 중식 메뉴를 제공해요.', array['짜장면','짬뽕']),
  ('a31', '역전우동0410 수서점', '일식', '로즈데일', '서울 강남구 광평로 280', '', 86, 0, '우동과 덮밥으로 빠르게 식사하기 좋아요.', array['우동','혼밥']),
  ('a32', '왕건카레 수서역점', '기타', '로즈데일', '서울 강남구 광평로 280', '지하 2층 104호', 86, 0, '카레 메뉴를 찾을 때 확인해 볼 곳이에요.', array['카레','혼밥']),
  ('a33', '사위식당 수서점', '한식', '로즈데일', '서울 강남구 광평로 280', '', 86, 0, '낙곱새 등 매콤한 한식 메뉴로 알려진 곳이에요.', array['낙곱새','한식']),
  ('a34', '구찌라쿠', '일식', '로즈데일', '서울 강남구 광평로 280', '지하 2층', 91, 0, '로즈데일 지하의 일식 식당이에요.', array['일식','점심']),
  ('a35', '우공묵티기 수서점', '한식', '로즈데일', '서울 강남구 광평로 280', '', 86, 0, '육회비빔밥과 국밥, 소고기 메뉴를 찾을 때 좋아요.', array['육회비빔밥','국밥']),
  ('a36', '일미원', '한식', '수서 인근', '서울 강남구 수서동 449-15', '', 348, 0, '수서 궁마을 방향의 한식 식당이에요.', array['한식','모임']),
  ('a37', '산동네갯마을 수서본점', '한식', '수서 인근', '서울 강남구 수서동 464-5', '', 559, 0, '해산물 중심의 한식 메뉴를 찾을 때 확인해 보세요.', array['해산물','모임']),
  ('a38', '빠레뜨한남 수서역점', '양식', '로즈데일', '서울 강남구 광평로 280', '1층 118호', 89, 0, '파스타와 오므라이스 등 양식 메뉴를 제공해요.', array['파스타','오므라이스']),
  ('a39', '밀절 수서점', '한식', '로즈데일', '서울 강남구 광평로 280', '지하 2층 126호', 89, 0, '로즈데일 지하에서 한식을 찾을 때 확인해 보세요.', array['한식','점심'])
on conflict (id) do update set name=excluded.name, category=excluded.category, building=excluded.building, address=excluded.address, floor=excluded.floor, distance=excluded.distance, note=excluded.note, tags=excluded.tags;

insert into public.posts (id, title, content, author, created_at, views)
values
  ('p1', '점심 번개 같이 가실 분?', '오늘 11시 40분에 로즈데일 쪽으로 가려고 합니다. 메뉴 추천도 받아요!', '수서미식가', '2026-07-24T02:20:00.000Z', 12),
  ('p2', '새로 생긴 식당 발견하면 여기 남겨주세요', '상호와 대략적인 위치만 적어주셔도 목록에 반영하기 쉬워요.', '관리자', '2026-07-23T07:10:00.000Z', 28)
on conflict (id) do nothing;
