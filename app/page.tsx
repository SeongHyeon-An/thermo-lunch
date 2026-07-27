"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
  password_hash?: string;
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

type RatingSummary = {
  restaurant_id: string;
  average: number;
  count: number;
};

type ConnectionStatus = "loading" | "connected" | "partial" | "offline";

const ADMIN_PASSWORD_HASH = "c7680b18671c306147e947131d5a66e56f5a07c6a5de74d2d7773b48412ea24d";
const CATEGORY_TABS = ["전체", "한식", "중식", "양식", "일식", "기타"];
const CATEGORY_PHOTOS: Record<string, string> = {
  한식: "https://images.unsplash.com/photo-1562749606-0a9eb5a8a0f3?auto=format&fit=crop&w=900&q=78",
  중식: "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=900&q=78",
  일식: "https://images.unsplash.com/photo-1709984110217-57d7d18e5299?auto=format&fit=crop&w=900&q=78",
  양식: "https://images.unsplash.com/photo-1625643263399-2c6c860a583f?auto=format&fit=crop&w=900&q=78",
  기타: "https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=900&q=78",
};
const RESTAURANT_PHOTOS: Record<string, string> = {
  r1: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260312012430274_photo_.webp",
  r2: "https://d12zq4w4guyljn.cloudfront.net/750_750_20251028013848_photo1_b4762f00408c.webp",
  r3: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250826001723_photo1_4c8f2d0c7a9b.webp",
  r4: "https://d12zq4w4guyljn.cloudfront.net/750_750_20201121131640_photo1_pWpyRZAUvccH.webp",
  r6: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260307143502_photo1_fe4411605ada.webp",
  r7: "https://d12zq4w4guyljn.cloudfront.net/750_750_20240527095815_photo1_6ddefe95c889.webp",
  r8: "https://d12zq4w4guyljn.cloudfront.net/750_750_20230701115607873_photo_dea771de1115.webp",
  r9: "https://d12zq4w4guyljn.cloudfront.net/750_750_20251205073649470_photo_a0fababd222c.webp",
  r10: "https://d12zq4w4guyljn.cloudfront.net/750_750_20251004002300_photo1_hkRAhLEW5gil.webp",
  r12: "https://d12zq4w4guyljn.cloudfront.net/750_750_20251204002727_photo1_172b41b9d6a5.webp",
  r14: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260227080320363_photo_24585c8e1d1a.webp",
  r15: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250404063604_photo1_172b41b9d6a5.webp",
  r16: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260401110939_photo1_3b14a0a776a9.webp",
  a01: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260219063040106_photo_a0fababd222c.webp",
  a02: "https://d12zq4w4guyljn.cloudfront.net/750_750_20251121110919_photo1_16b95099b083.webp",
  a03: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250225010943_photo1_172b41b9d6a5.webp",
  a04: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260322094537_photo1_1b27d7f85552.webp",
  a06: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250825010530_photo1_175bfe5fc0e5.webp",
  a08: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250508085731086_photo_39953508d1f5.webp",
  a09: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250204120857_photo1_172b41b9d6a5.webp",
  a11: "https://d12zq4w4guyljn.cloudfront.net/750_750_20240310060241_photo1_60cdb9cdc3f5.webp",
  a15: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260328082539714_photo_0caf5de8a3e4.webp",
  a17: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260101143740_photo1_172b41b9d6a5.webp",
  a19: "https://d12zq4w4guyljn.cloudfront.net/750_750_20251019194204_profile_photo1_a2e1b1990f36.webp",
  a20: "https://d12zq4w4guyljn.cloudfront.net/750_750_20240407112845_photo1_0606f2bc4179.webp",
  a21: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260505025732_photo1_5b7e5d6beeda.webp",
  a22: "https://d12zq4w4guyljn.cloudfront.net/750_750_20230506175414_profile_photo1_a2e1b1990f36.webp",
  a23: "https://d12zq4w4guyljn.cloudfront.net/750_750_20251014213242_photo1_172b41b9d6a5.webp",
  a28: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250124133459_photo1_a2e1b1990f36.webp",
  a29: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250811114218_photo1_e1c95d040167.webp",
  a32: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260420221654_photo1_a2e1b1990f36.webp",
  a33: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260522091138287_photo_bb7366057614.webp",
  a34: "https://d12zq4w4guyljn.cloudfront.net/750_750_20250204234055_photo1_172b41b9d6a5.webp",
  a36: "https://d12zq4w4guyljn.cloudfront.net/750_750_20240810160045_photo1_a2e1b1990f36.webp",
  a38: "https://d12zq4w4guyljn.cloudfront.net/750_750_20260415101501498_photo_88b0f2635c8e.webp",
};

async function hashText(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingSummaries, setRatingSummaries] = useState<RatingSummary[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(isConnected ? "loading" : "offline");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState("distance");
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [ratingFormOpen, setRatingFormOpen] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notice, setNotice] = useState("");
  const restaurantResultsRef = useRef<HTMLElement>(null);

  async function loadData() {
    if (!isConnected) {
      setConnectionStatus("offline");
      setNotice("Supabase 연결 정보가 없어 데이터를 불러올 수 없어요.");
      return;
    }

    setConnectionStatus("loading");
    const results = await Promise.allSettled([
      supabaseRequest("restaurants?select=*&order=distance.asc"),
      supabaseRequest("posts?select=id,title,content,author,created_at,views&order=created_at.desc"),
      supabaseRequest("reviews?select=id,restaurant_id,author,content,created_at&order=created_at.desc"),
      supabaseRequest("rpc/get_rating_summaries", { method: "POST", body: "{}" }),
    ]);
    const [restaurantResult, postResult, reviewResult, ratingResult] = results;

    if (restaurantResult.status === "fulfilled") setRestaurants(Array.isArray(restaurantResult.value) ? restaurantResult.value : []);
    if (postResult.status === "fulfilled") setPosts(Array.isArray(postResult.value) ? postResult.value : []);
    if (reviewResult.status === "fulfilled") setReviews(Array.isArray(reviewResult.value) ? reviewResult.value : []);
    if (ratingResult.status === "fulfilled") setRatingSummaries(Array.isArray(ratingResult.value) ? ratingResult.value : []);

    const hasFailure = results.some((result) => result.status === "rejected");
    setConnectionStatus(hasFailure ? "partial" : "connected");
    if (hasFailure) setNotice("일부 데이터를 불러오지 못했어요. 연결 재시도를 눌러 주세요.");
  }

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("suseo-admin") === "1");
    void loadData();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const ratingStats = useMemo(() => {
    const stats: Record<string, { average: number; count: number }> = {};
    for (const summary of ratingSummaries) {
      stats[summary.restaurant_id] = { average: Number(summary.average), count: Number(summary.count) };
    }
    return stats;
  }, [ratingSummaries]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return restaurants
      .filter((item) => category === "전체" || item.category === category)
      .filter((item) => !normalized || [item.name, item.category, item.address, item.note, ...item.tags].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => sort === "rating" ? (ratingStats[b.id]?.average || 0) - (ratingStats[a.id]?.average || 0) : sort === "name" ? a.name.localeCompare(b.name, "ko") : a.distance - b.distance);
  }, [restaurants, query, category, sort, ratingStats]);

  const selectedReviews = useMemo(() => reviews.filter((review) => review.restaurant_id === selected?.id), [reviews, selected]);

  const showSearchResults = () => {
    restaurantResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      setReviewFormOpen(false);
      event.currentTarget.reset();
    } catch {
      setNotice("리뷰를 저장하지 못했어요.");
    }
  }

  async function saveRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const author = String(form.get("author") || "").trim();
    const password = String(form.get("password") || "");
    const rating = Number(form.get("rating") || 0);
    const voterHash = await hashText(`${author.toLocaleLowerCase("ko-KR")}:${password}`);

    try {
      if (isConnected) {
        const result = await supabaseRequest("rpc/save_rating", {
          method: "POST",
          body: JSON.stringify({ p_restaurant_id: selected.id, p_author: author, p_rating: rating, p_voter_hash: voterHash }),
        });
        const summary = result?.[0];
        if (summary) {
          setRatingSummaries((items) => [
            ...items.filter((item) => item.restaurant_id !== selected.id),
            { restaurant_id: selected.id, average: Number(summary.average), count: Number(summary.count) },
          ]);
        }
      } else {
        setNotice("별점 저장은 공용 데이터가 연결된 사이트에서 사용할 수 있어요.");
        return;
      }
      setRatingFormOpen(false);
      event.currentTarget.reset();
      setNotice("별점을 반영했어요. 같은 이름과 비밀번호로 다시 주면 기존 별점이 변경돼요.");
    } catch {
      setNotice("별점을 저장하지 못했어요.");
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
    const title = String(form.get("title") || "").trim();
    const content = String(form.get("content") || "").trim();
    const author = String(form.get("author") || "익명").trim();
    const passwordHash = await hashText(String(form.get("password") || ""));
    try {
      if (editingPost) {
        if (isConnected) {
          const updated = await supabaseRequest("rpc/update_post", {
            method: "POST",
            body: JSON.stringify({ p_id: editingPost.id, p_author: author, p_title: title, p_content: content, p_password_hash: passwordHash }),
          });
          if (!updated) return setNotice("비밀번호가 맞지 않아요.");
        } else if (editingPost.password_hash !== passwordHash) {
          return setNotice("비밀번호가 맞지 않아요.");
        }
        setPosts((items) => items.map((post) => post.id === editingPost.id ? { ...post, title, content, author } : post));
        setNotice("게시글을 수정했어요.");
      } else {
        const post: Post = {
          id: crypto.randomUUID(),
          title,
          content,
          author,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
          views: 0,
        };
        if (isConnected) await supabaseRequest("posts", { method: "POST", body: JSON.stringify(post) });
        setPosts((items) => [post, ...items]);
        setNotice("게시글을 등록했어요.");
      }
      setShowPostForm(false);
      setEditingPost(null);
    } catch {
      setNotice("게시글을 저장하지 못했어요.");
    }
  }

  async function removePost(post: Post) {
    if (!window.confirm("이 게시글을 삭제할까요?")) return;
    try {
      if (isAdmin) {
        if (isConnected) await supabaseRequest(`posts?id=eq.${post.id}`, { method: "DELETE" });
      } else {
        const password = window.prompt("글 작성 시 입력한 비밀번호를 입력해 주세요.");
        if (!password) return;
        const passwordHash = await hashText(password);
        if (isConnected) {
          const removed = await supabaseRequest("rpc/delete_post", {
            method: "POST",
            body: JSON.stringify({ p_id: post.id, p_password_hash: passwordHash }),
          });
          if (!removed) return setNotice("비밀번호가 맞지 않아요.");
        } else if (post.password_hash !== passwordHash) {
          return setNotice("비밀번호가 맞지 않아요.");
        }
      }
      setPosts((items) => items.filter((item) => item.id !== post.id));
      if (editingPost?.id === post.id) {
        setEditingPost(null);
        setShowPostForm(false);
      }
      setNotice("게시글을 삭제했어요.");
    } catch {
      setNotice("게시글을 삭제하지 못했어요.");
    }
  }

  const openNewPost = () => {
    setEditingPost(null);
    setShowPostForm(true);
  };

  const openPostEdit = (post: Post) => {
    setEditingPost(post);
    setShowPostForm(true);
  };

  const openEdit = (item: Restaurant) => {
    setEditing(item);
    setShowRestaurantForm(true);
    setSelected(null);
  };

  const openRestaurant = (item: Restaurant) => {
    setSelected(item);
    setEditingReview(null);
    setReviewFormOpen(false);
    setRatingFormOpen(false);
  };

  const pickRandomRestaurant = () => {
    const candidates = filtered.filter((item) => ![item.name, ...item.tags].some((value) => /(카페|커피|coffee|cafe)/i.test(value)));
    if (!candidates.length) return setNotice("현재 조건에서 추천할 식당이 없어요.");
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    openRestaurant(picked);
    setNotice(`오늘의 추천은 ${picked.name}!`);
  };

  return (
    <main>
      <header className={tab === "board" ? "topbar solid" : "topbar"}>
        <a className="brand" href="#" aria-label="수서한끼 홈">
          <span className="brandMark">수</span>
          <span>수서한끼</span>
        </a>
        <nav className="tabs" aria-label="주요 메뉴">
          <button className={tab === "restaurants" ? "active" : ""} onClick={() => setTab("restaurants")}>맛집 찾기</button>
          <button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}>자유게시판 <span className="navCount">{posts.length}</span></button>
        </nav>
        <div className="headerActions">
          <div className={`connection ${connectionStatus}`}>
            <span className={connectionStatus === "connected" ? "dot live" : "dot"} />
            {connectionStatus === "loading" && "데이터 연결 확인 중"}
            {connectionStatus === "connected" && "공용 데이터 연결됨"}
            {connectionStatus === "partial" && "일부 데이터 연결 실패"}
            {connectionStatus === "offline" && "데이터 연결 안 됨"}
            {(connectionStatus === "partial" || connectionStatus === "offline") && <button type="button" onClick={() => void loadData()}>연결 재시도</button>}
          </div>
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
              <h1>점메추 <em>in 써모</em></h1>
              <p className="heroText">수서오피스를 중심으로 동료들이 함께 채우는 맛집 리스트에요.</p>
              <form className="searchBox" onSubmit={(event) => { event.preventDefault(); showSearchResults(); }}>
                <button className="searchSubmit" type="submit" aria-label="검색 결과 보기">⌕</button>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="식당, 메뉴, 메모를 검색해 보세요" aria-label="맛집 검색" />
                {query && <button className="searchClear" type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>}
              </form>
              {query.trim() && <button className="searchResultLink" onClick={showSearchResults}>검색 결과 {filtered.length}곳 보기 ↓</button>}
              <div className="heroStats">
                <div><strong>{restaurants.length}</strong><span>등록 맛집</span></div>
                <div><strong>{restaurants.filter((item) => item.distance <= 500).length}</strong><span>도보권</span></div>
                <div><strong>{Object.keys(ratingStats).length}</strong><span>평가 완료</span></div>
              </div>
            </div>
          </section>

          <section className="directory" ref={restaurantResultsRef}>
            <div className="sectionHead">
              <div>
                <p className="eyebrow dark">NEARBY PICKS</p>
                <h2>사무실 근처 맛집</h2>
                <p>{filtered.length}곳을 찾았어요 · 초기 정보는 방문 전 확인해 주세요</p>
              </div>
              <div className="sectionActions">
                <button className="primaryButton" onClick={() => requireAdmin(() => { setEditing(null); setShowRestaurantForm(true); })}>＋ 식당 추가</button>
              </div>
            </div>

            <div className="randomPickRow">
              <button className="randomButton" onClick={pickRandomRestaurant}>↻ 랜덤뽑기</button>
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
                {filtered.map((item, index) => {
                  const stat = ratingStats[item.id];
                  const naverQuery = encodeURIComponent(`${item.name} ${item.address}`);
                  return (
                  <article className="restaurantCard" key={item.id} onClick={() => openRestaurant(item)}>
                    <div className={`cardVisual tone${index % 5}`}>
                      <img
                        className="cardPhoto"
                        src={RESTAURANT_PHOTOS[item.id] || CATEGORY_PHOTOS[item.category] || CATEGORY_PHOTOS.기타}
                        alt={RESTAURANT_PHOTOS[item.id] ? `${item.name} 매장 대표 사진` : `${item.category} 대표 음식`}
                        loading="lazy"
                        onError={(event) => {
                          if (event.currentTarget.dataset.fallback) return;
                          event.currentTarget.dataset.fallback = "true";
                          event.currentTarget.src = CATEGORY_PHOTOS[item.category] || CATEGORY_PHOTOS.기타;
                        }}
                      />
                      <span>{item.category}</span>
                      <div className="foodGlyph" aria-hidden="true">{["◒", "◉", "◍", "◎", "◐"][index % 5]}</div>
                      <small>{item.building}</small>
                    </div>
                    <div className="cardBody">
                      <div className="cardTop">
                        <span className="distance">도보 {Math.max(1, Math.round(item.distance / 75))}분</span>
                        <span className={stat ? "rating" : "rating empty"}>★ {stat ? `${stat.average.toFixed(1)} (${stat.count})` : "평가 전"}</span>
                      </div>
                      <h3>{item.name}</h3>
                      <p>{item.note}</p>
                      <div className="cardFooter">
                        <div className="tags">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                        <a className="detailLink" href={`https://map.naver.com/p/search/${naverQuery}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>상세정보 ↗</a>
                      </div>
                    </div>
                  </article>
                )})}
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
            <button className="lightButton" onClick={openNewPost}>＋ 새 글 쓰기</button>
          </div>
          <div className="boardWrap">
            <div className="boardTitle">
              <div><h2>최근 이야기</h2><p>총 {posts.length}개의 이야기</p></div>
              <button className="primaryButton mobileWrite" onClick={openNewPost}>글쓰기</button>
            </div>
            <div className="postList">
              {posts.map((post, index) => (
                <article className="post" key={post.id}>
                  <span className="postNumber">{String(posts.length - index).padStart(2, "0")}</span>
                  <div className="postMain"><h3>{post.title}</h3><p>{post.content}</p><div className="postMeta"><span>{post.author}</span><span>{formatDate(post.created_at)}</span><span>조회 {post.views}</span></div></div>
                  <div className="postActions">
                    <button onClick={() => openPostEdit(post)}>수정</button>
                    <button className="danger" onClick={() => removePost(post)}>삭제</button>
                  </div>
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
              <div className="averageBox">
                <span>사용자 평균</span>
                <b>★ {ratingStats[selected.id] ? ratingStats[selected.id].average.toFixed(1) : "평가 전"}</b>
                <small>{ratingStats[selected.id]?.count || 0}개의 평가</small>
                <button className="ratingToggleButton" onClick={() => setRatingFormOpen((open) => !open)}>{ratingFormOpen ? "별점 입력 접기" : "별점 주기"}</button>
              </div>
              {ratingFormOpen && <form className="ratingForm" onSubmit={saveRating}>
                <p>별점은 한 사람당 식당별 1개만 반영돼요. 같은 이름과 비밀번호로 다시 제출하면 기존 별점이 변경됩니다.</p>
                <div className="reviewFormRow">
                  <label>이름<input name="author" required placeholder="이름 또는 별명" /></label>
                  <label>비밀번호<input name="password" type="password" required minLength={4} placeholder="내 별점 확인용" /></label>
                </div>
                <fieldset className="ratingField">
                  <legend>별점</legend>
                  <div>{[5, 4, 3, 2, 1].map((value) => <label key={value}><input type="radio" name="rating" value={value} required /><span>★</span></label>)}</div>
                </fieldset>
                <div className="reviewFormActions"><button className="primaryButton" type="submit">별점 저장</button></div>
              </form>}

              {isAdmin && <div className="adminDrawerActions"><button className="secondaryButton danger" onClick={() => removeRestaurant(selected)}>식당 삭제</button><button className="primaryButton" onClick={() => openEdit(selected)}>식당 정보 수정</button></div>}

              <section className="reviewSection">
                <div className="reviewHeading">
                  <div><span>동료들의 메모</span><h3>리뷰 {selectedReviews.length}</h3></div>
                  <button className="reviewToggleButton" onClick={() => { setEditingReview(null); setReviewFormOpen((open) => !open); }}>{reviewFormOpen ? "접기 ↑" : "리뷰 쓰기 ＋"}</button>
                </div>
                {reviewFormOpen && <form className="reviewForm" key={editingReview?.id || "new-review"} onSubmit={saveReview}>
                  <div className="reviewFormRow">
                    <label>이름<input name="author" required defaultValue={editingReview?.author} placeholder="이름 또는 별명" /></label>
                    <label>비밀번호<input name="password" type="password" required minLength={4} placeholder="수정·삭제 시 필요" /></label>
                  </div>
                  <label>메모<textarea name="content" required rows={3} defaultValue={editingReview?.content} placeholder="추천 메뉴, 대기 시간, 분위기 등을 알려주세요." /></label>
                  <div className="reviewFormActions">
                    {editingReview && <button type="button" className="secondaryButton" onClick={() => { setEditingReview(null); setReviewFormOpen(false); }}>수정 취소</button>}
                    <button className="primaryButton" type="submit">{editingReview ? "리뷰 수정" : "리뷰 등록"}</button>
                  </div>
                </form>}
                <div className="reviewList">
                  {selectedReviews.length ? selectedReviews.map((review) => (
                    <article className="reviewItem" key={review.id}>
                      <div className="reviewMeta"><b>{review.author}</b><span>{formatDate(review.created_at)}</span></div>
                      <p>{review.content}</p>
                      <div className="reviewActions"><button onClick={() => { setEditingReview(review); setReviewFormOpen(true); }}>수정</button><button onClick={() => removeReview(review)}>삭제</button></div>
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
        <div className="modalBackdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setShowPostForm(false);
            setEditingPost(null);
          }
        }}>
          <section className="modal formModal" role="dialog" aria-modal="true" aria-label={editingPost ? "게시글 수정" : "새 글 쓰기"}>
            <button className="modalClose" onClick={() => { setShowPostForm(false); setEditingPost(null); }} aria-label="닫기">×</button>
            <p className="eyebrow dark">{editingPost ? "EDIT STORY" : "NEW STORY"}</p><h2>{editingPost ? "게시글 수정" : "새 글 쓰기"}</h2>
            <form onSubmit={savePost}>
              <label>작성자<input name="author" required defaultValue={editingPost?.author} placeholder="이름 또는 별명" /></label>
              <label>비밀번호<input name="password" type="password" required placeholder={editingPost ? "작성할 때 사용한 비밀번호" : "수정·삭제할 때 사용해요"} /></label>
              <label>제목<input name="title" required defaultValue={editingPost?.title} placeholder="어떤 이야기를 나눌까요?" /></label>
              <label>내용<textarea name="content" required rows={6} defaultValue={editingPost?.content} placeholder="자유롭게 적어주세요." /></label>
              <button className="primaryButton submitButton" type="submit">{editingPost ? "수정 저장" : "게시글 등록"}</button>
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
