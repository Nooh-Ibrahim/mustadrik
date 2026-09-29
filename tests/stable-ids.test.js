// tests/stable-ids.test.js — شبكة أمان لنظام المفاتيح الثابتة في cards.js
// المفتاح الجديد pageId::@cid لا يتأثر بإعادة تسمية العناوين، وremapCardKey ترحّل إعدادات المفاتيح العنوانية القديمة.
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'cards.js'), 'utf8');

// cards.js سكربت كلاسيكي بدوال عامة — أعلاه لا يلمس DOM، فيكفي سياق بسيط
function loadCards() {
  const ctx = {
    console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error,
    S: { settings: {} },
    save: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: () => 0,
    window: {},
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'cards.js' });
  return ctx;
}

const C = loadCards();
assert.equal(typeof C.cardKey, 'function', 'cardKey() must be defined');
assert.equal(typeof C.remapCardKey, 'function', 'remapCardKey() must be defined');

// بطاقة زائفة تكفي مسارات cardKey/legacyCardKey (getAttribute/closest/children/parentNode)
function fakeCard(attrs, titleText) {
  return {
    _a: attrs || {},
    getAttribute(n) { return this._a[n] != null ? this._a[n] : null; },
    closest() { return { id: 'page-home' }; },
    parentNode: { children: [] },
    children: titleText ? [{ classList: { contains: (c) => c === 'card-title' }, textContent: titleText }] : [],
  };
}

// ١) بطاقة بـ data-cid → المفتاح الثابت pageId::@cid (لا علاقة له بالعنوان)
test('cardKey uses data-cid when present', () => {
  const card = fakeCard({ 'data-cid': 'med' }, 'الدواء');
  assert.equal(C.cardKey(card), 'page-home::@med');
});

// ٢) بلا data-cid → السقوط للمفتاح العنواني القديم (مع تجريد الأرقام)
test('cardKey falls back to legacy title key', () => {
  const card = fakeCard({}, 'صندوق الوارد ٣');
  assert.equal(C.cardKey(card), 'page-home::صندوق الوارد');
});

// ٣) الصيغة الجديدة تحمل :: دائماً — شرط بقاء المفاتيح في تنظيفات migrate() وفلترة «تنظيم الصفحة»
test('stable key always contains :: separator', () => {
  assert.ok(C.cardKey(fakeCard({ 'data-cid': 'x' })).indexOf('page-home::') === 0);
});

// ٤) remapCardKey ينقل الطيّ والسبان والإخفاء من المفتاح القديم للجديد
test('remapCardKey moves collapsed/span/tileHidden', () => {
  const s = {
    cardCollapsed: { 'page-home::الدواء': true },
    cardSpan: { 'page-home::الدواء': 'wide' },
    tileHidden: { 'page-home::الدواء': 'الدواء' },
    cardOrder: {},
  };
  const moved = C.remapCardKey(s, 'page-home::الدواء', 'page-home::@med');
  assert.equal(moved, true);
  assert.equal(s.cardCollapsed['page-home::@med'], true);
  assert.equal(s.cardSpan['page-home::@med'], 'wide');
  assert.equal(s.tileHidden['page-home::@med'], 'الدواء');
  assert.ok(!('page-home::الدواء' in s.cardCollapsed));
  assert.ok(!('page-home::الدواء' in s.cardSpan));
  assert.ok(!('page-home::الدواء' in s.tileHidden));
});

// ٥) الترتيب يُستبدل في موضعه داخل مصفوفات cardOrder (لا يقفز لآخر القائمة)
test('remapCardKey replaces cardOrder entries in place', () => {
  const s = { cardOrder: { 'page-home': ['page-home::أ', 'page-home::الدواء', 'page-home::ب'] } };
  C.remapCardKey(s, 'page-home::الدواء', 'page-home::@med');
  assert.deepEqual(JSON.parse(JSON.stringify(s.cardOrder['page-home'])),
    ['page-home::أ', 'page-home::@med', 'page-home::ب']);
});

// ٦) لا سحق: قيمة موجودة تحت المفتاح الجديد لا تُستبدل، والمكرَّر في الترتيب يُحذف لا يُكرَّر
test('remapCardKey never clobbers existing new-key config', () => {
  const s = {
    cardSpan: { 'page-home::الدواء': 'wide', 'page-home::@med': '2' },
    cardOrder: { 'page-home': ['page-home::@med', 'page-home::الدواء'] },
  };
  C.remapCardKey(s, 'page-home::الدواء', 'page-home::@med');
  assert.equal(s.cardSpan['page-home::@med'], '2');                       // اختيار المستخدم الأحدث باقٍ
  assert.deepEqual(JSON.parse(JSON.stringify(s.cardOrder['page-home'])), ['page-home::@med']);
});

// ٧) العصامة: إعادة التشغيل بعد الترحيل لا تغيّر شيئاً (يعمل عند كل decorateCard بلا أثر)
test('remapCardKey is idempotent (no-op on second run)', () => {
  const s = { cardCollapsed: { 'page-home::الدواء': true }, cardOrder: {} };
  assert.equal(C.remapCardKey(s, 'page-home::الدواء', 'page-home::@med'), true);
  const once = JSON.stringify(s);
  assert.equal(C.remapCardKey(s, 'page-home::الدواء', 'page-home::@med'), false);
  assert.equal(JSON.stringify(s), once);
});
