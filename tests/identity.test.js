// tests/identity.test.js — لا اسم مكتوب في الكود، وأدوات التاريخ/المواقيت الجديدة
// تشغيل: npm test

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'js', f), 'utf8');

function load(files) {
  const ctx = {
    console, JSON, Object, Array, Date, Math, Promise, String, Number, Boolean, Error, RegExp, parseInt,
    window: { addEventListener() {} },
    document: { getElementById: () => null, querySelector: () => null, body: { className: '', classList: { add() {}, toggle() {} } } },
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout: () => 0, setInterval: () => 0, requestAnimationFrame: () => 0,
    notify: () => {}, icons: () => {},
  };
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(JS(f), ctx, { filename: f });
  return ctx;
}

const ctx = load(['core.js', 'profiles.js', 'prayer.js']);

test('no default user name: userName() is empty until the user picks one', () => {
  assert.equal(ctx.userName(), '');
  assert.equal(ctx.withName('أحسنت'), 'أحسنت');
});

test('withName() addresses the user only when a name exists', () => {
  vm.runInContext("activeProfileName='سارة'", ctx);
  assert.equal(ctx.withName('أحسنت'), 'أحسنت يا سارة');
  assert.equal(ctx.withName('أهلاً', ' '), 'أهلاً سارة');
  vm.runInContext("activeProfileName=''", ctx);
});

test('the primary profile id stays the legacy value (existing databases depend on it)', () => {
  assert.equal(ctx.PRIMARY_PROFILE_ID, 'noah');
  assert.equal(ctx.curProfileId(), 'noah');
});

test('localDateKey() uses the LOCAL calendar day, zero-padded', () => {
  assert.equal(ctx.localDateKey(new Date(2026, 0, 5, 0, 30)), '2026-01-05');
  assert.equal(ctx.localDateKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('parseLocalDate() reads <input type=date> values as LOCAL midnight (not UTC)', () => {
  const d = ctx.parseLocalDate('2026-10-10');
  assert.equal(d.getFullYear(), 2026); assert.equal(d.getMonth(), 9); assert.equal(d.getDate(), 10);
  assert.equal(d.getHours(), 0);
  assert.equal(ctx.parseLocalDate('2026-1-5').getDate(), 5);
  assert.ok(isNaN(ctx.parseLocalDate('')));
  assert.equal(ctx.parseLocalDate(1790000000000).getTime(), 1790000000000);
});

test('methodForCountry() suggests the local authority, MWL otherwise', () => {
  assert.equal(ctx.methodForCountry('Egypt'), 5);
  assert.equal(ctx.methodForCountry('مصر'), 5);
  assert.equal(ctx.methodForCountry('Saudi Arabia'), 4);
  assert.equal(ctx.methodForCountry('الأردن'), 23);
  assert.equal(ctx.methodForCountry('Morocco'), 21);
  assert.equal(ctx.methodForCountry(''), ctx.DEFAULT_PRAYER_METHOD);
  assert.equal(ctx.methodForCountry('Iceland'), ctx.DEFAULT_PRAYER_METHOD);
});

test('prayer method ids match api.aladhan.com (2=ISNA, 3=MWL — they were swapped before)', () => {
  const byId = Object.fromEntries(ctx.PRAYER_METHODS.map((m) => [m.id, m.ar]));
  assert.match(byId[2], /ISNA/);
  assert.match(byId[3], /رابطة العالم الإسلامي/);
  assert.match(byId[5], /مصر/);
  assert.equal(new Set(ctx.PRAYER_METHODS.map((m) => m.id)).size, ctx.PRAYER_METHODS.length, 'ids are unique');
});

test('no hard-coded owner name remains in user-facing source', () => {
  const files = fs.readdirSync(path.join(__dirname, '..', 'src', 'js')).map((f) => 'js/' + f).concat(['index.html', 'capture.html', 'hud.html']);
  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    src.split('\n').forEach((line, i) => {
      // سورة نوح في فهرس السور مشروعة
      if (/نوح/.test(line) && !/\['نوح',\s*28\]/.test(line)) offenders.push(f + ':' + (i + 1));
    });
  }
  assert.deepEqual(offenders, []);
});
