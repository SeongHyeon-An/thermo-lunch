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

async function harness({ configured = true, admin = true } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local/' });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const db = { restaurants: [structuredClone(initialRestaurant)], posts: [structuredClone(initialPost)], reviews: [structuredClone(initialReview)] };
  const writes = [];
  let failure = null;
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const fetch = async (url, init = {}) => {
    const parsed = new URL(url);
    const path = parsed.pathname.replace('/rest/v1/', '');
    const method = init.method || 'GET';
    if (path === 'rpc/get_rating_summaries') return response([]);
    if (path === 'rpc/get_my_rating') return response(0);
    if (method === 'GET') return response(db[path]);
    writes.push({ path, method });
    if (failure === 'network') throw new TypeError('Network unavailable');
    if (failure === 'http') return response({ message: 'Service unavailable' }, 503);
    if (failure === 'empty') return response(path.startsWith('rpc/') ? false : []);
    const body = init.body ? JSON.parse(init.body) : null;
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
  await mount();
  return { db, writes, mount, click, openReview, form, fill, submit, fail: value => { failure = value; },
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
