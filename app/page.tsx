"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Restaurant = {
  id: string;
  name: string;
  category: string;
  building: string;
  address: string;
  floor: string;
  distance: number;
  rating: number;
  note: string;
  tags: string[];
};

type Post = {
  id: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  views: number;
};

type Review = {
  id: string;
  restaurant_id: string;
  author: string;
  content: string;
  password_hash?: string;
  created_at: string;
};

const ADMIN_PASSWORD_HASH = "c7680b18671c306147e947131d5a66e56f5a07c6a5de74d2d7773b48412ea24d";
const CATEGORY_TABS = ["전체", "한식", "중식", "양식", "일식", "기타"];

async function hashText(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const seedRestaurants: Restaurant[] = [
  { id: "r1", name: "우리집순두부", category: "한식", building: "현대벤처빌", address: "서울 강남구 밤고개로1길 10", floor: "지하 식당가", distance: 160, rating: 0, note: "순두부와 한식 메뉴. 혼밥하기 편한 곳으로 알려져 있어요.", tags: ["혼밥", "찌개"] },
  { id: "r2", name: "스미식당 수서역점", category: "일식", building: "현대벤처빌", address: "서울 강남구 밤고개로1길 10", floor: "지하 1층 132호", distance: 160, rating: 0, note: "덮밥과 카레 메뉴 중심.", tags: ["덮밥", "혼밥"] },
  { id: "r3", name: "미소야 수서점", category: "일식", building: "현대벤처빌", address: "서울 강남구 밤고개로1길 10", floor: "지하 식당가", distance: 160, rating: 0, note: "돈카츠, 우동 등 다양한 일식 메뉴.", tags: ["돈카츠", "우동"] },
  { id: "r4", name: "황금식탁", category: "한식", building: "현대벤처빌", address: "서울 강남구 밤고개로1길 10", floor: "지하 1층", distance: 160, rating: 0, note: "낙지볶음과 닭요리 중심.", tags: ["낙지", "점심"] },
  { id: "r5", name: "포 수서점", category: "기타", building: "현대벤처빌", address: "서울 강남구 밤고개로1길 10", floor: "지하 2층 B203호", distance: 170, rating: 0, note: "쌀국수와 베트남식 덮밥.", tags: ["쌀국수", "혼밥"] },
  { id: "r6", name: "큰물참치 수서점", category: "일식", building: "현대벤처빌", address: "서울 강남구 밤고개로1길 10", floor: "상가", distance: 160, rating: 0, note: "참치회와 일식 식사.", tags: ["참치", "회식"] },
  { id: "r7", name: "치마오", category: "중식", building: "현대벤처빌", address: "서울 강남구 밤고개로1길 10", floor: "상가", distance: 160, rating: 0, note: "중식 메뉴를 찾을 때 확인해 볼 곳.", tags: ["중식", "점심"] },
  { id: "r8", name: "육대장 수서점", category: "한식", building: "로즈데일", address: "서울 강남구 광평로 280", floor: "지하 2층 124호", distance: 80, rating: 0, note: "육개장과 칼국수. 수서역과 연결되어 비 오는 날도 편해요.", tags: ["육개장", "해장"] },
  { id: "r9", name: "판교집 수서직영점", category: "한식", building: "로즈데일", address: "서울 강남구 광평로 280", floor: "지하 2층 137호", distance: 80, rating: 0, note: "한돈 급랭삼겹살과 점심 식사 메뉴.", tags: ["삼겹살", "회식"] },
  { id: "r10", name: "올라포케 수서점", category: "기타", building: "로즈데일", address: "서울 강남구 광평로 280", floor: "지하 2층 B125호", distance: 80, rating: 0, note: "가볍고 산뜻한 포케 메뉴.", tags: ["포케", "샐러드"] },
  { id: "r11", name: "수서광안리", category: "한식", building: "로즈데일", address: "서울 강남구 광평로 280", floor: "상가", distance: 80, rating: 0, note: "수서역 인근 한식 식당.", tags: ["한식", "점심"] },
  { id: "r12", name: "초원복집", category: "한식", building: "로즈데일", address: "서울 강남구 광평로 280", floor: "상가", distance: 80, rating: 0, note: "복 요리 전문점.", tags: ["복요리", "모임"] },
  { id: "r13", name: "봉평메밀촌 수서점", category: "한식", building: "로즈데일", address: "서울 강남구 광평로 280", floor: "지하 2층 123호", distance: 80, rating: 0, note: "메밀 메뉴와 한식.", tags: ["메밀", "점심"] },
  { id: "r14", name: "쇼부라멘 수서역점", category: "일식", building: "로즈데일", address: "서울 강남구 광평로 280", floor: "상가", distance: 80, rating: 0, note: "라멘을 찾을 때 들르기 좋은 곳.", tags: ["라멘", "혼밥"] },
  { id: "r15", name: "동경규동 수서점", category: "일식", building: "500m 이내", address: "서울 강남구 광평로 295", floor: "상가", distance: 190, rating: 0, note: "규동과 돈까스 덮밥.", tags: ["규동", "혼밥"] },
  { id: "r16", name: "가장맛있는족발 수서역점", category: "한식", building: "500m 이내", address: "서울 강남구 광평로 295", floor: "1층", distance: 190, rating: 0, note: "족발과 보쌈. 저녁 모임 후보.", tags: ["족발", "회식"] },
  { id: "r17", name: "수서역 벌교한상", category: "한식", building: "500m 이내", address: "서울 강남구 광평로46길 7", floor: "상가", distance: 350, rating: 0, note: "벌교식 한상차림과 한식.", tags: ["한식", "모임"] },
];

const seedPosts: Post[] = [
  { id: "p1", title: "점심 번개 같이 가실 분?", content: "오늘 11시 40분에 로즈데일 쪽으로 가려고 합니다. 메뉴 추천도 받아요!", author: "수서미식가", created_at: "2026-07-24T02:20:00.000Z", views: 12 },
  { id: "p2", title: "새로 생긴 식당 발견하면 여기 남겨주세요", content: "상호와 대략적인 위치만 적어주셔도 목록에 반영하기 쉬워요.", author: "관리자", created_at: "2026-07-23T07:10:00.000Z", views: 28 },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isConnected = Boolean(supabaseUrl && supabaseKey);

async function supabaseRequest(path: string, init?: RequestInit) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) throw new Error(await response.text());
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function Home() {
  const [tab, setTab] = useState<"restaurants" | "board">("restaurants");
  const [restaurants, setRestaurants] = useState<Restaurant[]>(seedRestaurants);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState("distance");
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("suseo-admin") === "1");
    if (!isConnected) return;
    Promise.all([
      supabaseRequest("restaurants?select=*&order=distance.asc"),
      supabaseRequest("posts?select=*&order=created_at.desc"),
      supabaseRequest("reviews?select=id,restaurant_id,author,content,created_at&order=created_at.desc"),
    ]).then(([restaurantRows, postRows, reviewRows]) => {
      if (restaurantRows?.length) setRestaurants(restaurantRows);
      if (postRows?.length) setPosts(postRows);
      if (reviewRows?.length) setReviews(reviewRows);
    }).catch(() => setNotice("데이터 연결을 확인하지 못해 이 기기의 데모 목록을 보여드려요."));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return restaurants
      .filter((item) => category === "전체" || item.category === category)
      .filter((item) => !normalized || [item.name, item.category, item.address, item.note, ...item.tags].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => sort === "rating" ? b.rating - a.rating : sort === "name" ? a.name.localeCompare(b.name, "ko") : a.distance - b.distance);
  }, [restaurants, query, category, sort]);

  const selectedReviews = useMemo(() => reviews.filter((review) => review.restaurant_id === selected?.id), [reviews, selected]);

  function requireAdmin(action: () => void) {
    if (isAdmin) action();
    else setShowAdminLogin(true);
  }

  async function loginAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    if (await hashText(password) !== ADMIN_PASSWORD_HASH) {
      setNotice("관리자 비밀번호가 맞지 않아요.");
      return;
    }
    sessionStorage.setItem("suseo-admin", "1");
    setIsAdmin(true);
    setShowAdminLogin(false);
    setNotice("관리자로 로그인했어요.");
  }

  function logoutAdmin() {
    sessionStorage.removeItem("suseo-admin");
    setIsAdmin(false);
    setNotice("관리자 로그아웃을 완료했어요.");
  }

  async function saveRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return setShowAdminLogin(true);
    const form = new FormData(event.currentTarget);
    const row: Restaurant = {
      id: editing?.id || crypto.randomUUID(),
      name: String(form.get("name") || ""),
      category: String(form.get("category") || "기타"),
      building: String(form.get("building") || "500m 이내"),
      address: String(form.get("address") || ""),
      floor: String(form.get("floor") || ""),
      distance: Number(form.get("distance") || 0),
      rating: editing?.rating || 0,
      note: String(form.get("note") || ""),
      tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      if (isConnected) {
        await supabaseRequest(editing ? `restaurants?id=eq.${editing.id}` : "restaurants", {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(row),
        });
      }
      setRestaurants((items) => editing ? items.map((item) => item.id === row.id ? row : item) : [row, ...items]);
      setSelected(row);
      setNotice(editing ? "식당 정보가 수정됐어요." : "새 식당이 추가됐어요.");
      setShowRestaurantForm(false);
      setEditing(null);
    } catch {
      setNotice("저장하지 못했어요. Supabase 설정을 확인해 주세요.");
    }
  }

  async function removeRestaurant(item: Restaurant) {
    if (!isAdmin) return setShowAdminLogin(true);
    if (!window.confirm(`${item.name}을(를) 목록에서 삭제할까요?`)) return;
    try {
      if (isConnected) await supabaseRequest(`restaurants?id=eq.${item.id}`, { method: "DELETE" });
      setRestaurants((items) => items.filter((restaurant) => restaurant.id !== item.id));
      setSelected(null);
      setNotice("식당을 삭제했어요.");
    } catch {
      setNotice("삭제하지 못했어요. Supabase 설정을 확인해 주세요.");
    }
  }

  async function rateRestaurant(item: Restaurant, rating: number) {
    const updated = { ...item, rating };
    try {
      if (isConnected) await supabaseRequest(`restaurants?id=eq.${item.id}`, { method: "PATCH", body: JSON.stringify({ rating }) });
      setRestaurants((items) => items.map((restaurant) => restaurant.id === item.id ? updated : restaurant));
      setSelected(updated);
      setNotice(`${rating}점으로 기록했어요.`);
    } catch {
      setNotice("평점을 저장하지 못했어요.");
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const author = String(form.get("author") || "").trim();
    const content = String(form.get("content") || "").trim();
    const passwordHash = await hashText(String(form.get("password") || ""));

    try {
      if (editingReview) {
        if (isConnected) {
          const updated = await supabaseRequest("rpc/update_review", {
            method: "POST",
            body: JSON.stringify({ p_id: editingReview.id, p_author: author, p_content: content, p_password_hash: passwordHash }),
          });
          if (!updated) return setNotice("비밀번호가 맞지 않아요.");
        } else if (editingReview.password_hash !== passwordHash) {
          return setNotice("비밀번호가 맞지 않아요.");
        }
        setReviews((items) => items.map((review) => review.id === editingReview.id ? { ...review, author, content } : review));
        setEditingReview(null);
        setNotice("리뷰를 수정했어요.");
      } else {
        const review: Review = { id: crypto.randomUUID(), restaurant_id: selected.id, author, content, password_hash: passwordHash, created_at: new Date().toISOString() };
        if (isConnected) await supabaseRequest("reviews", { method: "POST", body: JSON.stringify(review) });
        setReviews((items) => [review, ...items]);
        setNotice("리뷰를 남겼어요.");
      }
      event.currentTarget.reset();
    } catch {
      setNotice("리뷰를 저장하지 못했어요.");
    }
  }

  async function removeReview(review: Review) {
    const password = window.prompt("리뷰 작성 시 입력한 비밀번호를 입력해 주세요.");
    if (!password) return;
    const passwordHash = await hashText(password);
    try {
      if (isConnected) {
        const removed = await supabaseRequest("rpc/delete_review", { method: "POST", body: JSON.stringify({ p_id: review.id, p_password_hash: passwordHash }) });
        if (!removed) return setNotice("비밀번호가 맞지 않아요.");
      } else if (review.password_hash !== passwordHash) {
        return setNotice("비밀번호가 맞지 않아요.");
      }
      setReviews((items) => items.filter((item) => item.id !== review.id));
      if (editingReview?.id === review.id) setEditingReview(null);
      setNotice("리뷰를 삭제했어요.");
    } catch {
      setNotice("리뷰를 삭제하지 못했어요.");
    }
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const post: Post = {
      id: crypto.randomUUID(),
      title: String(form.get("title") || ""),
      content: String(form.get("content") || ""),
      author: String(form.get("author") || "익명"),
      created_at: new Date().toISOString(),
      views: 0,
    };
    try {
      if (isConnected) await supabaseRequest("posts", { method: "POST", body: JSON.stringify(post) });
      setPosts((items) => [post, ...items]);
      setShowPostForm(false);
      setNotice("게시글을 등록했어요.");
    } catch {
      setNotice("게시글을 저장하지 못했어요.");
    }
  }

  async function removePost(id: string) {
    if (!isAdmin) return setShowAdminLogin(true);
    if (!window.confirm("이 게시글을 삭제할까요?")) return;
    try {
      if (isConnected) await supabaseRequest(`posts?id=eq.${id}`, { method: "DELETE" });
      setPosts((items) => items.filter((post) => post.id !== id));
      setNotice("게시글을 삭제했어요.");
    } catch {
      setNotice("게시글을 삭제하지 못했어요.");
    }
  }

  const openEdit = (item: Restaurant) => {
    setEditing(item);
    setShowRestaurantForm(true);
    setSelected(null);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="수서한끼 홈">
          <span className="brandMark">수</span>
          <span>수서한끼</span>
        </a>
        <nav className="tabs" aria-label="주요 메뉴">
          <button className={tab === "restaurants" ? "active" : ""} onClick={() => setTab("restaurants")}>맛집 찾기</button>
          <button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}>자유게시판 <span className="navCount">{posts.length}</span></button>
        </nav>
        <div className="headerActions">
          <div className="connection"><span className={isConnected ? "dot live" : "dot"} />{isConnected ? "공용 데이터 연결됨" : "데모 모드"}</div>
          <button className={isAdmin ? "adminButton active" : "adminButton"} onClick={() => isAdmin ? logoutAdmin() : setShowAdminLogin(true)}>
            {isAdmin ? "관리자 · 로그아웃" : "관리자 로그인"}
          </button>
        </div>
      </header>

      {tab === "restaurants" ? (
        <>
          <section className="hero">
            <div className="heroCopy">
              <p className="eyebrow">OFFICE LUNCH DIRECTORY</p>
              <h1>오늘 점심,<br /><em>가까운 곳부터.</em></h1>
              <p className="heroText">광평로 281을 중심으로 동료들이 함께 채우는 수서 맛집 지도예요.</p>
              <div className="searchBox">
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="식당, 메뉴, 메모를 검색해 보세요" aria-label="맛집 검색" />
                {query && <button onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>}
              </div>
              <div className="heroStats">
                <div><strong>{restaurants.length}</strong><span>등록 맛집</span></div>
                <div><strong>{restaurants.filter((item) => item.distance <= 500).length}</strong><span>도보권</span></div>
                <div><strong>{restaurants.filter((item) => item.rating > 0).length}</strong><span>평가 완료</span></div>
              </div>
            </div>
            <div className="mapCard" aria-label="광평로 281 주변 안내">
              <div className="mapGrid" />
              <span className="road roadA">광평로</span>
              <span className="road roadB">밤고개로</span>
              <div className="place office"><span className="pin primary">●</span><b>우리 사무실</b><small>광평로 281</small></div>
              <div className="place rose"><span className="pin">●</span><b>로즈데일</b><small>광평로 280</small></div>
              <div className="place venture"><span className="pin">●</span><b>현대벤처빌</b><small>밤고개로1길 10</small></div>
              <div className="radius" />
              <span className="walkBadge">도보 약 2–7분</span>
            </div>
          </section>

          <section className="directory">
            <div className="sectionHead">
              <div>
                <p className="eyebrow dark">NEARBY PICKS</p>
                <h2>사무실 근처 맛집</h2>
                <p>{filtered.length}곳을 찾았어요 · 초기 정보는 방문 전 확인해 주세요</p>
              </div>
              <button className="primaryButton" onClick={() => requireAdmin(() => { setEditing(null); setShowRestaurantForm(true); })}>＋ 식당 추가</button>
            </div>

            <div className="toolbar">
              <div className="segmented">
                {CATEGORY_TABS.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
              <div className="selects">
                <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬">
                  <option value="distance">가까운 순</option>
                  <option value="rating">평점 높은 순</option>
                  <option value="name">이름 순</option>
                </select>
              </div>
            </div>

            {filtered.length ? (
              <div className="restaurantGrid">
                {filtered.map((item, index) => (
                  <article className="restaurantCard" key={item.id} onClick={() => setSelected(item)}>
                    <div className={`cardVisual tone${index % 5}`}>
                      <span>{item.category}</span>
                      <div className="foodGlyph" aria-hidden="true">{["◒", "◉", "◍", "◎", "◐"][index % 5]}</div>
                      <small>{item.building}</small>
                    </div>
                    <div className="cardBody">
                      <div className="cardTop">
                        <span className="distance">도보 {Math.max(1, Math.round(item.distance / 75))}분</span>
                        <span className={item.rating ? "rating" : "rating empty"}>★ {item.rating ? item.rating.toFixed(1) : "평가 전"}</span>
                      </div>
                      <h3>{item.name}</h3>
                      <p>{item.note}</p>
                      <div className="tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="emptyState"><b>조건에 맞는 식당이 없어요.</b><span>검색어나 필터를 바꿔보세요.</span></div>
            )}
          </section>
        </>
      ) : (
        <section className="boardPage">
          <div className="boardHero">
            <div>
              <p className="eyebrow">OFFICE COMMON ROOM</p>
              <h1>자유게시판</h1>
              <p>점심 번개, 새 맛집 제보, 솔직한 후기를 편하게 나눠요.</p>
            </div>
            <button className="lightButton" onClick={() => setShowPostForm(true)}>＋ 새 글 쓰기</button>
          </div>
          <div className="boardWrap">
            <div className="boardTitle">
              <div><h2>최근 이야기</h2><p>총 {posts.length}개의 이야기</p></div>
              <button className="primaryButton mobileWrite" onClick={() => setShowPostForm(true)}>글쓰기</button>
            </div>
            <div className="postList">
              {posts.map((post, index) => (
                <article className="post" key={post.id}>
                  <span className="postNumber">{String(posts.length - index).padStart(2, "0")}</span>
                  <div className="postMain"><h3>{post.title}</h3><p>{post.content}</p><div className="postMeta"><span>{post.author}</span><span>{formatDate(post.created_at)}</span><span>조회 {post.views}</span></div></div>
                  {isAdmin ? <button className="iconButton" onClick={() => removePost(post.id)} aria-label={`${post.title} 삭제`}>×</button> : <span />}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer><span className="brand footerBrand"><span className="brandMark">수</span><span>수서한끼</span></span><p>광평로 281의 더 맛있는 점심을 위해, 함께 채워가요.</p><small>매장 정보는 변동될 수 있으니 방문 전 확인해 주세요.</small></footer>

      {selected && (
        <div className="drawerBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <aside className="detailDrawer" role="dialog" aria-modal="true" aria-label={`${selected.name} 상세 정보`}>
            <div className="drawerTop">
              <div><p className="eyebrow dark">{selected.building} · {selected.distance}m</p><h2>{selected.name}</h2></div>
              <button className="drawerClose" onClick={() => setSelected(null)} aria-label="닫기">×</button>
            </div>
            <div className="drawerScroll">
              <div className="detailTags"><span>{selected.category}</span>{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <p className="detailNote">{selected.note || "아직 식당 소개가 없어요."}</p>
              <div className="addressBox"><span>위치</span><b>{selected.address}</b><small>{selected.floor}</small></div>
              <div className="rateBox"><span>평점 남기기</span><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} className={value <= selected.rating ? "filled" : ""} onClick={() => rateRestaurant(selected, value)} aria-label={`${value}점`}>★</button>)}</div></div>

              {isAdmin && <div className="adminDrawerActions"><button className="secondaryButton danger" onClick={() => removeRestaurant(selected)}>식당 삭제</button><button className="primaryButton" onClick={() => openEdit(selected)}>식당 정보 수정</button></div>}

              <section className="reviewSection">
                <div className="reviewHeading"><div><span>동료들의 메모</span><h3>리뷰 {selectedReviews.length}</h3></div><small>솔직한 한 줄을 남겨주세요.</small></div>
                <form className="reviewForm" key={editingReview?.id || "new-review"} onSubmit={saveReview}>
                  <div className="reviewFormRow">
                    <label>이름<input name="author" required defaultValue={editingReview?.author} placeholder="이름 또는 별명" /></label>
                    <label>비밀번호<input name="password" type="password" required minLength={4} placeholder="수정·삭제 시 필요" /></label>
                  </div>
                  <label>메모<textarea name="content" required rows={3} defaultValue={editingReview?.content} placeholder="추천 메뉴, 대기 시간, 분위기 등을 알려주세요." /></label>
                  <div className="reviewFormActions">
                    {editingReview && <button type="button" className="secondaryButton" onClick={() => setEditingReview(null)}>수정 취소</button>}
                    <button className="primaryButton" type="submit">{editingReview ? "리뷰 수정" : "리뷰 등록"}</button>
                  </div>
                </form>
                <div className="reviewList">
                  {selectedReviews.length ? selectedReviews.map((review) => (
                    <article className="reviewItem" key={review.id}>
                      <div className="reviewMeta"><b>{review.author}</b><span>{formatDate(review.created_at)}</span></div>
                      <p>{review.content}</p>
                      <div className="reviewActions"><button onClick={() => setEditingReview(review)}>수정</button><button onClick={() => removeReview(review)}>삭제</button></div>
                    </article>
                  )) : <div className="emptyReviews">첫 번째 리뷰를 남겨보세요.</div>}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}

      {showRestaurantForm && (
        <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowRestaurantForm(false)}>
          <section className="modal formModal" role="dialog" aria-modal="true" aria-label={editing ? "식당 수정" : "식당 추가"}>
            <button className="modalClose" onClick={() => { setShowRestaurantForm(false); setEditing(null); }} aria-label="닫기">×</button>
            <p className="eyebrow dark">RESTAURANT INFO</p><h2>{editing ? "식당 정보 수정" : "새 식당 추가"}</h2>
            <form onSubmit={saveRestaurant}>
              <label>식당 이름<input name="name" required defaultValue={editing?.name} placeholder="예: 수서식당" /></label>
              <div className="formRow">
                <label>음식 종류<select name="category" required defaultValue={editing?.category || "한식"}>{CATEGORY_TABS.filter((item) => item !== "전체").map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>위치<select name="building" defaultValue={editing?.building || "500m 이내"}><option>로즈데일</option><option>현대벤처빌</option><option>500m 이내</option></select></label>
              </div>
              <label>주소<input name="address" required defaultValue={editing?.address} placeholder="서울 강남구 ..." /></label>
              <div className="formRow">
                <label>층/호수<input name="floor" defaultValue={editing?.floor} placeholder="지하 1층" /></label>
                <label>사무실에서 거리(m)<input name="distance" type="number" min="0" max="500" required defaultValue={editing?.distance || 100} /></label>
              </div>
              <label>태그<input name="tags" defaultValue={editing?.tags.join(", ")} placeholder="혼밥, 점심, 회식" /><small>쉼표로 구분해 주세요.</small></label>
              <label>메모<textarea name="note" rows={3} defaultValue={editing?.note} placeholder="추천 메뉴, 분위기, 함께 알면 좋은 정보를 적어주세요." /></label>
              <button className="primaryButton submitButton" type="submit">{editing ? "수정 저장" : "식당 추가"}</button>
            </form>
          </section>
        </div>
      )}

      {showPostForm && (
        <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowPostForm(false)}>
          <section className="modal formModal" role="dialog" aria-modal="true" aria-label="새 글 쓰기">
            <button className="modalClose" onClick={() => setShowPostForm(false)} aria-label="닫기">×</button>
            <p className="eyebrow dark">NEW STORY</p><h2>새 글 쓰기</h2>
            <form onSubmit={savePost}>
              <label>작성자<input name="author" required placeholder="이름 또는 별명" /></label>
              <label>제목<input name="title" required placeholder="어떤 이야기를 나눌까요?" /></label>
              <label>내용<textarea name="content" required rows={6} placeholder="자유롭게 적어주세요." /></label>
              <button className="primaryButton submitButton" type="submit">게시글 등록</button>
            </form>
          </section>
        </div>
      )}

      {showAdminLogin && (
        <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowAdminLogin(false)}>
          <section className="modal adminLoginModal" role="dialog" aria-modal="true" aria-label="관리자 로그인">
            <button className="modalClose" onClick={() => setShowAdminLogin(false)} aria-label="닫기">×</button>
            <p className="eyebrow dark">ADMIN ACCESS</p>
            <h2>관리자 로그인</h2>
            <p className="loginDescription">식당 정보와 게시판을 관리하려면 비밀번호를 입력해 주세요.</p>
            <form onSubmit={loginAdmin}>
              <label>관리자 비밀번호<input name="password" type="password" required autoFocus placeholder="비밀번호 입력" /></label>
              <button className="primaryButton submitButton" type="submit">로그인</button>
            </form>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
