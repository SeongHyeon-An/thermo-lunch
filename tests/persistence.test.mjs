import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// Runs the real page component and DOM events against a deterministic API double.
// No production data or credentials are used.
const source = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
} }).outputText;
const require = createRequire(import.meta.url);
const initialRestaurant = { id: 'r-test', name: '기존 식당', category: '한식', building: '현대벤처빌', address: '테스트 주소', floor: '1층', distance: 100, rating: 0, note: '기존 소개', tags: [] };
const initialPost = { id: 'p-test', title: '기존 글', content: '기존 본문', author: '작성자', created_at: '2026-11-04T01:00:00Z', views: 0 };
const initialReview = { id: 'v-test', restaurant_id: 'r-test', content: '기존 리뷰', author: '작성자', created_at: '2026-11-04T01:00:00Z' };

async function harness({ configured = true, admin = true, initialRating = 0, otherRatings = [], secondRating = null } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local/' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const db = { restaurants: [structuredClone(initialRestaurant)], posts: [structuredClone(initialPost)], reviews: [structuredClone(initialReview)] };
  if (secondRating !== null) db.restaurants.push({ ...structuredClone(initialRestaurant), id: 'r-other', name: '다른 식당' });
  const writes = [];
  let failure = null;
  const storedRatings = new Map([['r-test', initialRating], ['r-other', secondRating || 0]]);
  const readRequests = [];
  const delayedReads = [];
  const delayedSaves = [];
  const delay = (queue) => {
    let resolve, reject;
    const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
    queue.push({ promise });
    return {
      resolve: async value => { await act(async () => resolve(value)); await flush(); },
      reject: async error => { await act(async () => reject(error)); await flush(); },
    };
  };
  let hasRatingReply = false;
  let ratingReply;
  const ratingSummary = (restaurantId = 'r-test') => {
    const storedRating = storedRatings.get(restaurantId) || 0;
    const ratings = [...(restaurantId === 'r-test' ? otherRatings : []), ...(storedRating ? [storedRating] : [])];
    return { average: ratings.length ? Math.round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length * 100) / 100 : null, count: ratings.length };
  };
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const fetch = async (url, init = {}) => {
    const parsed = new URL(url);
    const path = parsed.pathname.replace('/rest/v1/', '');
    const method = init.method || 'GET';
    if (path === 'rpc/get_rating_summaries') return response(db.restaurants.flatMap(row => ratingSummary(row.id).count ? [{ restaurant_id: row.id, ...ratingSummary(row.id) }] : []));
    if (path === 'rpc/get_my_rating') {
      const restaurantId = JSON.parse(init.body).p_restaurant_id;
      readRequests.push(restaurantId);
      const heldRead = delayedReads.shift();
      return response(heldRead ? await heldRead.promise : storedRatings.get(restaurantId) || 0);
    }
    if (method === 'GET') return response(db[path]);
    writes.push({ path, method, body: init.body ? JSON.parse(init.body) : null });
    if (failure === 'network') throw new TypeError('Network unavailable');
    if (failure === 'http') return response({ message: 'Service unavailable' }, 503);
    if (failure === 'empty') return response(path.startsWith('rpc/') ? false : []);
    const body = init.body ? JSON.parse(init.body) : null;
    if (path === 'rpc/save_rating') {
      assert.ok(db.restaurants.some(row => row.id === body.p_restaurant_id));
      assert.match(body.p_voter_hash, /^[0-9a-f]{64}$/);
      if (hasRatingReply) return response(ratingReply);
      storedRatings.set(body.p_restaurant_id, body.p_rating);
      const summary = [ratingSummary(body.p_restaurant_id)];
      const heldSave = delayedSaves.shift();
      return response(heldSave ? (await heldSave.promise) ?? summary : summary);
    }
    if (path.startsWith('rpc/')) {
      const [, operation, entity] = path.match(/rpc\/(update|delete)_(post|review)/);
      const table = `${entity}s`;
      const row = db[table].find(item => item.id === body.p_id);
      if (!row) return response(false);
      if (operation === 'delete') db[table] = db[table].filter(item => item.id !== row.id);
      else {
        row.author = body.p_author; row.content = body.p_content;
        if (entity === 'post') row.title = body.p_title;
      }
      return response(true);
    }
    if (method === 'POST') { db[path].push(body); return response([body]); }
    const id = parsed.searchParams.get('id')?.replace('eq.', '');
    const row = db[path].find(item => item.id === id);
    if (!row) return response([]);
    if (method === 'PATCH') Object.assign(row, body);
    if (method === 'DELETE') db[path] = db[path].filter(item => item.id !== id);
    return response([row]);
  };
  dom.window.confirm = () => true;
  dom.window.prompt = () => 'test-password';
  if (admin) dom.window.sessionStorage.setItem('suseo-admin', '1');
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, require,
    process: { env: configured ? { NEXT_PUBLIC_SUPABASE_URL: 'https://db.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-only-key' } : {} },
    window: dom.window, sessionStorage: dom.window.sessionStorage, localStorage: dom.window.localStorage,
    FormData: dom.window.FormData, crypto: webcrypto, TextEncoder, fetch, setTimeout, clearTimeout, console,
  });
  const Home = module.exports.default;
  let root;
  const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); };
  const mount = async () => {
    if (root) await act(async () => root.unmount());
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Home)));
    await flush();
  };
  const click = async (text, scope = document) => {
    const element = [...scope.querySelectorAll('button')].find(el => typeof text === 'string' ? el.textContent === text : text.test(el.textContent));
    assert.ok(element, `Missing button: ${text}`);
    await act(async () => element.click()); await flush();
  };
  const openReview = async (name = '기존 식당') => {
    const heading = [...document.querySelectorAll('.restaurantCard h3')].find(el => el.textContent === name);
    assert.ok(heading);
    await act(async () => heading.click()); await flush();
  };
  const form = () => document.querySelector('.formModal form, .reviewForm');
  const fill = (values) => {
    for (const [name, value] of Object.entries(values)) {
      const input = form().elements.namedItem(name); assert.ok(input, name); input.value = value;
    }
  };
  const submit = async () => {
    await act(async () => form().dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await flush();
  };
  const rate = async (value) => {
    const button = [...document.querySelectorAll('.ratingButtons button')].find(el => el.getAttribute('aria-label')?.split(',')[0] === `${value}점`);
    assert.ok(button, `Missing rating: ${value}`);
    await act(async () => button.click()); await flush();
  };
  await mount();
  return { db, writes, readRequests, mount, click, openReview, form, fill, submit, rate, flush, fail: value => { failure = value; },
    deferRatingRead: () => delay(delayedReads), deferRatingSave: () => delay(delayedSaves),
    ratingReply: value => { hasRatingReply = true; ratingReply = value; },
    notice: () => document.querySelector('[role="status"]')?.textContent || '',
    close: async () => { await act(async () => root.unmount()); dom.window.close(); },
  };
}

const entities = {
  restaurant: {
    table: 'restaurants', field: 'name', initial: '기존 식당',
    open: async h => h.click('＋ 식당 추가'),
    values: { name: '새 식당', address: '새 주소', distance: '100', note: '새 소개' },
    edit: async h => { await h.openReview(); await h.click('식당 정보 수정'); },
    remove: async (h, name) => { await h.openReview(name); await h.click('식당 삭제'); },
  },
  post: {
    table: 'posts', field: 'title', initial: '기존 글',
    open: async h => { await h.click(/^자유게시판/); await h.click('＋ 새 글 쓰기'); },
    values: { title: '새 글', content: '새 본문', author: '작성자', password: 'test-password' },
    edit: async h => { await h.click(/^자유게시판/); await h.click('수정', document.querySelector('.post')); },
    remove: async h => { await h.click(/^자유게시판/); await h.click('삭제', document.querySelector('.post')); },
  },
  review: {
    table: 'reviews', field: 'content', initial: '기존 리뷰',
    open: async h => { await h.openReview(); await h.click('리뷰 쓰기 ＋'); },
    values: { content: '새 리뷰', author: '작성자', password: 'test-password' },
    edit: async h => { await h.openReview(); await h.click('수정', document.querySelector('.reviewItem')); },
    remove: async h => { await h.openReview(); await h.click('삭제', document.querySelector('.reviewItem')); },
  },
};

for (const name of ['restaurant', 'post']) test(`${name}: missing configuration blocks create and retains input`, async () => {
  const h = await harness({ configured: false });
  try {
    const entity = entities[name]; await entity.open(h); h.fill(entity.values); await h.submit();
    assert.match(h.notice(), /데이터베이스 연결이 필요/); assert.ok(h.form());
    assert.equal(h.form().elements.namedItem(entity.field).value, entity.values[entity.field]);
    assert.equal(h.writes.length, 0);
  } finally { await h.close(); }
});

// Other offline edit/delete paths are unreachable after a fresh mount (no DB data).
// Check their entry guards too, including rating and review handlers.
test('every mutation handler guards missing configuration before any prompt or write', () => {
  const tree = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const expected = new Set(['saveRestaurant', 'removeRestaurant', 'saveReview', 'removeReview', 'savePost', 'removePost', 'toggleRating']);
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && expected.has(node.name?.text)) {
      const body = node.body.getText(tree);
      const guard = body.indexOf('requireConnection()');
      assert.ok(guard >= 0, node.name.text);
      for (const action of ['supabaseRequest(', 'window.prompt(', 'window.confirm(', 'new FormData(']) {
        if (body.includes(action)) assert.ok(guard < body.indexOf(action), node.name.text);
      }
      expected.delete(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.equal(expected.size, 0);
});

for (const [name, entity] of Object.entries(entities)) {
  for (const failure of ['http', 'network', 'empty']) test(`${name}: ${failure} failure retains create/edit input and does not delete`, async () => {
    const h = await harness({ admin: name !== 'post' });
    try {
      h.fail(failure);
      await entity.open(h); h.fill(entity.values); await h.submit();
      assert.ok(h.form()); assert.equal(h.form().elements.namedItem(entity.field).value, entity.values[entity.field]);
      assert.equal(h.db[entity.table].length, 1); assert.doesNotMatch(h.notice(), /등록했어요|추가됐어요|남겼어요/);
      await h.mount(); await entity.edit(h);
      h.fill({ [entity.field]: '변경 시도', ...(name !== 'restaurant' ? { password: 'test-password' } : {}) });
      await h.submit(); assert.ok(h.form()); assert.equal(h.form().elements.namedItem(entity.field).value, '변경 시도');
      assert.equal(h.db[entity.table][0][entity.field], entity.initial);
      await h.mount(); await entity.remove(h);
      assert.equal(h.db[entity.table].length, 1); assert.doesNotMatch(h.notice(), /삭제했어요/);
      const visibleText = document.body.textContent;
      assert.ok(visibleText.includes(entity.initial));
    } finally { await h.close(); }
  });
  test(`${name}: confirmed create/edit/delete survive a fresh mount from API`, async () => {
    const h = await harness({ admin: name !== 'post' });
    try {
      await entity.open(h); h.fill(entity.values); await h.submit();
      assert.equal(h.db[entity.table].length, 2); assert.equal(h.form(), null);
      assert.match(h.notice(), /추가됐어요|등록했어요|남겼어요/);
      await h.mount();
      if (name === 'post') await h.click(/^자유게시판/);
      if (name === 'review') await h.openReview();
      assert.ok(document.body.textContent.includes(entity.values[entity.field]));
      await h.mount(); await entity.edit(h);
      h.fill({ [entity.field]: '수정 완료', ...(name !== 'restaurant' ? { password: 'test-password' } : {}) });
      await h.submit(); assert.equal(h.form(), null); assert.match(h.notice(), /수정/);
      await h.mount();
      if (name === 'post') await h.click(/^자유게시판/);
      if (name === 'review') await h.openReview();
      assert.ok(document.body.textContent.includes('수정 완료'));
      assert.equal(h.db[entity.table].find(row => row.id.startsWith(name === 'restaurant' ? 'r-' : name === 'post' ? 'p-' : 'v-'))[entity.field], '수정 완료');
      await h.mount(); await entity.remove(h, '수정 완료'); assert.equal(h.db[entity.table].length, 1);
      await h.mount();
      if (name === 'post') await h.click(/^자유게시판/);
      if (name === 'review') await h.openReview();
      assert.ok(!document.body.textContent.includes('수정 완료'));
    } finally { await h.close(); }
  });
}

for (const failure of ['http', 'network', 'empty', null]) test(`admin post deletion: ${failure || 'confirmed'} response`, async () => {
  const h = await harness();
  try {
    h.fail(failure); await entities.post.remove(h);
    assert.equal(h.db.posts.length, failure ? 1 : 0);
    if (failure) assert.doesNotMatch(h.notice(), /삭제했어요/);
    else assert.match(h.notice(), /삭제했어요/);
    await h.mount(); await h.click(/^자유게시판/);
    assert.equal(document.body.textContent.includes('기존 글'), Boolean(failure));
  } finally { await h.close(); }
});

function assertRatingSelection(value) {
  const buttons = [...document.querySelectorAll('.ratingButtons button')];
  const selected = buttons.filter(button => button.getAttribute('aria-pressed') === 'true');
  assert.deepEqual(selected.map(button => button.getAttribute('aria-label')), value ? [`${value}점, 선택됨`] : []);
  assert.ok(buttons.every(button => !button.disabled), 'saving lock must be released');
}

for (const value of [0.5, 4.5, 5]) test(`rating: ${value} save updates selection/average and survives API reload`, async () => {
  const h = await harness({ otherRatings: [2, 3] });
  try {
    await h.openReview(); await h.rate(value);
    assertRatingSelection(value); assert.equal(h.notice(), `${value}점으로 반영했어요.`);
    const expectedAverage = (Math.round((2 + 3 + value) / 3 * 100) / 100).toFixed(1);
    assert.equal(document.querySelector('.averageBox > b').textContent, `★ ${expectedAverage}`);
    assert.equal(document.querySelector('.averageBox > small').textContent, '3개의 평가');
    await h.mount(); await h.openReview();
    assertRatingSelection(value);
    assert.equal(document.querySelector('.averageBox > b').textContent, `★ ${expectedAverage}`);
  } finally { await h.close(); }
});

for (const others of [[], [2, 3]]) test(`rating: cancellation succeeds with ${others.length} remaining votes`, async () => {
  const h = await harness({ initialRating: 4.5, otherRatings: others });
  try {
    await h.openReview(); assertRatingSelection(4.5);
    await h.rate(4.5); assertRatingSelection(0);
    assert.equal(h.notice(), '내 별점을 취소했어요.');
    const expected = others.length ? '★ 2.5' : '★ 평가 전';
    assert.equal(document.querySelector('.averageBox > b').textContent, expected);
    assert.equal(document.querySelector('.averageBox > small').textContent, `${others.length}개의 평가`);
    await h.mount(); await h.openReview(); assertRatingSelection(0);
    assert.equal(document.querySelector('.averageBox > b').textContent, expected);
  } finally { await h.close(); }
});

test('rating: PostgreSQL numeric strings are valid, including zero-count cancellation', async () => {
  const h = await harness();
  try {
    await h.openReview();
    h.ratingReply([{ average: '4.5', count: '1' }]); await h.rate(4.5);
    assertRatingSelection(4.5); assert.equal(h.notice(), '4.5점으로 반영했어요.');
    assert.equal(document.querySelector('.averageBox > b').textContent, '★ 4.5');
    h.ratingReply([{ average: null, count: '0' }]); await h.rate(4.5);
    assertRatingSelection(0); assert.equal(h.notice(), '내 별점을 취소했어요.');
  } finally { await h.close(); }
});

const invalidRatingReplies = [
  ['null', null], ['empty array', []], ['object instead of array', { average: 4.5, count: 1 }],
  ['null row', [null]], ['missing fields', [{}]], ['array row', [[4.5, 1]]],
  ['multiple rows', [{ average: 4.5, count: 1 }, { average: 4.5, count: 1 }]],
  ['non-numeric count', [{ average: 4.5, count: 'invalid' }]],
  ['negative count', [{ average: 4.5, count: -1 }]],
  ['fractional count', [{ average: 4.5, count: 1.5 }]],
  ['unsafe count', [{ average: 4.5, count: Number.MAX_SAFE_INTEGER + 1 }]],
  ['boolean count', [{ average: 4.5, count: true }]],
  ['null average with votes', [{ average: null, count: 1 }]],
  ['low average', [{ average: 0, count: 1 }]], ['high average', [{ average: 5.5, count: 1 }]],
  ['blank average', [{ average: '', count: 1 }]], ['boolean average', [{ average: true, count: 1 }]],
  ['array average', [{ average: [4.5], count: 1 }]],
  ['non-finite average', [{ average: 'Infinity', count: 1 }]],
  ['average with zero votes', [{ average: 4.5, count: 0 }]],
];

for (const action of ['save', 'cancel']) {
  for (const [label, payload] of invalidRatingReplies) test(`rating ${action}: ${label} restores previous selection and preserves averages`, async () => {
    const h = await harness({ initialRating: 3.5, otherRatings: [2] });
    try {
      await h.openReview();
      const previousAverage = document.querySelector('.averageBox > b').textContent;
      const previousCount = document.querySelector('.averageBox > small').textContent;
      h.ratingReply(payload); await h.rate(action === 'save' ? 4.5 : 3.5);
      assertRatingSelection(3.5);
      assert.equal(document.querySelector('.averageBox > b').textContent, previousAverage);
      assert.equal(document.querySelector('.averageBox > small').textContent, previousCount);
      assert.match(h.notice(), /결과를 확인하지 못/);
      assert.doesNotMatch(h.notice(), /반영했어요|취소했어요/);
    } finally { await h.close(); }
  });
  for (const failure of ['network', 'http']) test(`rating ${action}: ${failure} failure rolls back and allows retry`, async () => {
    const h = await harness({ initialRating: 3.5 });
    try {
      await h.openReview(); h.fail(failure);
      await h.rate(action === 'save' ? 4.5 : 3.5);
      assertRatingSelection(3.5); assert.match(h.notice(), /결과를 확인하지 못/);
      assert.equal(document.querySelector('.averageBox > b').textContent, '★ 3.5');
      assert.equal(document.querySelector('.averageBox > small').textContent, '1개의 평가');
      h.fail(null); await h.rate(action === 'save' ? 4.5 : 3.5);
      assertRatingSelection(action === 'save' ? 4.5 : 0);
      assert.match(h.notice(), /반영했어요|취소했어요/);
    } finally { await h.close(); }
  });
}

test('rating save: an empty aggregate is not proof of a successful save', async () => {
  const h = await harness({ initialRating: 3.5 });
  try {
    await h.openReview(); h.ratingReply([{ average: null, count: 0 }]); await h.rate(4.5);
    assertRatingSelection(3.5); assert.match(h.notice(), /결과를 확인하지 못/);
    assert.equal(document.querySelector('.averageBox > b').textContent, '★ 3.5');
  } finally { await h.close(); }
});

function assertRatingLocked(label) {
  const buttons = [...document.querySelectorAll('.ratingButtons button')];
  assert.equal(buttons.length, 10);
  assert.ok(buttons.every(button => button.disabled));
  assert.match(document.querySelector('.inlineRatingControl > strong').textContent, label);
}

async function closeRatingDrawer(h) {
  await h.click('×', document.querySelector('.detailDrawer'));
}

test('rating race: initial read delay blocks all clicks until the saved score is known', async () => {
  const h = await harness({ initialRating: 3.5 });
  try {
    const read = h.deferRatingRead();
    await h.openReview(); assert.equal(h.readRequests.length, 1);
    assertRatingLocked(/조회 중/);
    await h.rate(4.5); await h.rate(3.5);
    assert.equal(h.writes.length, 0, 'no speculative writes before initial read');
    await read.resolve(3.5); assertRatingSelection(3.5);
    await h.rate(4.5); assertRatingSelection(4.5);
    assert.equal(h.writes.at(-1).body.p_rating, 4.5);
  } finally { await h.close(); }
});

test('rating race: clicking an existing score after delayed load sends cancellation, not a duplicate save', async () => {
  const h = await harness({ initialRating: 4.5 });
  try {
    const read = h.deferRatingRead(); await h.openReview();
    await h.rate(4.5); assert.equal(h.writes.length, 0);
    await read.resolve('4.5'); assertRatingSelection(4.5);
    await h.rate(4.5); assertRatingSelection(0);
    assert.equal(h.writes.at(-1).body.p_rating, 0);
    assert.equal(h.notice(), '내 별점을 취소했어요.');
  } finally { await h.close(); }
});

test('rating race: an old read arriving after reopen and successful save cannot overwrite the latest score', async () => {
  const h = await harness({ initialRating: 1 });
  try {
    const oldRead = h.deferRatingRead(); await h.openReview();
    await closeRatingDrawer(h); await h.openReview();
    assertRatingSelection(1); assert.equal(h.readRequests.length, 2);
    await h.rate(4.5); assertRatingSelection(4.5);
    await oldRead.resolve(1);
    assertRatingSelection(4.5);
    assert.equal(document.querySelector('.averageBox > b').textContent, '★ 4.5');
    assert.equal(h.notice(), '4.5점으로 반영했어요.');
  } finally { await h.close(); }
});

for (const outcome of ['success', 'failure']) test(`rating race: old read ${outcome} is ignored after switching restaurants`, async () => {
  const h = await harness({ initialRating: 1, secondRating: 2.5 });
  try {
    const oldRead = h.deferRatingRead(); await h.openReview();
    await closeRatingDrawer(h); await h.openReview('다른 식당'); assertRatingSelection(2.5);
    if (outcome === 'success') await oldRead.resolve(1);
    else await oldRead.reject(new TypeError('Old read failed'));
    assertRatingSelection(2.5);
    assert.equal(document.querySelector('.drawerTop h2').textContent, '다른 식당');
    assert.equal(document.querySelector('.averageBox > b').textContent, '★ 2.5');
    assert.doesNotMatch(h.notice(), /불러오지 못/);
  } finally { await h.close(); }
});

test('rating race: stale save success cannot overwrite a newer restaurant selection or success notice', async () => {
  const h = await harness({ initialRating: 1, secondRating: 2.5 });
  try {
    await h.openReview(); const oldSave = h.deferRatingSave();
    await h.rate(4.5); assertRatingLocked(/저장 중/);
    await closeRatingDrawer(h); await h.openReview('다른 식당'); assertRatingSelection(2.5);
    await h.rate(0.5); assertRatingSelection(0.5);
    await oldSave.resolve();
    assertRatingSelection(0.5);
    assert.equal(document.querySelector('.averageBox > b').textContent, '★ 0.5');
    assert.equal(h.notice(), '0.5점으로 반영했어요.');
  } finally { await h.close(); }
});

test('rating race: stale save failure cannot roll back or unlock a different pending save', async () => {
  const h = await harness({ initialRating: 1, secondRating: 2.5 });
  try {
    await h.openReview(); const oldSave = h.deferRatingSave(); await h.rate(4.5);
    await closeRatingDrawer(h); await h.openReview('다른 식당');
    const newSave = h.deferRatingSave(); await h.rate(0.5); assertRatingLocked(/저장 중/);
    await oldSave.reject(new TypeError('Old save failed'));
    assertRatingLocked(/저장 중/);
    assert.doesNotMatch(h.notice(), /결과를 확인하지 못/);
    assert.equal(document.querySelector('[aria-pressed="true"]').getAttribute('aria-label'), '0.5점, 선택됨');
    await newSave.resolve(); assertRatingSelection(0.5);
    assert.equal(h.notice(), '0.5점으로 반영했어요.');
  } finally { await h.close(); }
});

test('rating read: failure keeps writes locked and successful retry restores cancellation behavior', async () => {
  const h = await harness({ initialRating: 4.5 });
  try {
    const read = h.deferRatingRead(); await h.openReview();
    await read.reject(new TypeError('Read failed')); assertRatingLocked(/조회 실패/);
    await h.rate(4.5); assert.equal(h.writes.length, 0);
    await h.click('별점 조회 재시도'); assertRatingSelection(4.5);
    await h.rate(4.5); assertRatingSelection(0);
    assert.equal(h.writes.at(-1).body.p_rating, 0);
  } finally { await h.close(); }
});

for (const invalid of [null, 'invalid', 2.25, 6]) test(`rating read: invalid initial score ${JSON.stringify(invalid)} never enables writes`, async () => {
  const h = await harness();
  try {
    const read = h.deferRatingRead(); await h.openReview(); await read.resolve(invalid);
    assertRatingLocked(/조회 실패/);
    await h.rate(4.5); assert.equal(h.writes.length, 0);
  } finally { await h.close(); }
});

test('rating race: synchronous double click sends only one pending mutation', async () => {
  const h = await harness({ initialRating: 1 });
  try {
    await h.openReview(); const save = h.deferRatingSave();
    const button = document.querySelector('[aria-label="4.5점"]');
    await act(async () => { button.click(); button.click(); }); await h.flush();
    assert.equal(h.writes.length, 1); assertRatingLocked(/저장 중/);
    await save.resolve(); assertRatingSelection(4.5);
  } finally { await h.close(); }
});

test('rating race: reselecting the same restaurant starts a new read instead of leaving input locked', async () => {
  const h = await harness({ initialRating: 2.5 });
  try {
    await h.openReview(); assertRatingSelection(2.5);
    const nextRead = h.deferRatingRead(); await h.openReview();
    assert.equal(h.readRequests.length, 2); assertRatingLocked(/조회 중/);
    await nextRead.resolve(2.5); assertRatingSelection(2.5);
  } finally { await h.close(); }
});
