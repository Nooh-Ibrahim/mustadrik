// tests/data-safety.test.js — حماية بيانات المستخدم الحالي:
// ترحيل حالة بشكل «مستخدم قديم» بلا فقدان، الحفظ لا يسبق التحميل، الاستيراد يستبدل ولا يدمج ويأخذ لقطة،
// تنظيف المهام بتاريخ الإنجاز. البيانات في tests/fixtures اصطناعية بالكامل.
// تشغيل: npm test

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'js', f), 'utf8');
const FIXTURE = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-state.json'), 'utf8');
const fixture = () => JSON.parse(FIXTURE);

function load() {
  const writes = [];
  const snapshots = [];
  const ctx = {
    console: { info() {}, warn() {}, error() {}, log() {} },
    JSON, Object, Array, Date, Math, Promise, String, Number, Boolean, Error, RegExp, parseInt,
    window: { addEventListener() {} },
    document: { getElementById: () => null, querySelector: () => null, body: { className: '', classList: { add() {}, toggle() {} } } },
    localStorage: { getItem: () => null, setItem: (k, v) => writes.push(k) },
    setTimeout: () => 0, setInterval: () => 0, requestAnimationFrame: () => 0,
    notify: () => {}, icons: () => {},
    createSnapshot: (label) => { snapshots.push(label); return Promise.resolve(); },
  };
  vm.createContext(ctx);
  vm.runInContext(JS('core.js'), ctx, { filename: 'core.js' });
  vm.runInContext(JS('storage.js'), ctx, { filename: 'storage.js' });
  // storage.js يستدعي دوال عرض من وحدات أخرى — stubs
  vm.runInContext('function updateDarkBtn(){} function renderThemeDots(){} function refreshAll(){}', ctx);
  return { ctx, writes, snapshots };
}
const get = (ctx, expr) => JSON.parse(vm.runInContext('JSON.stringify(' + expr + ')', ctx));

test('a legacy-shaped state migrates without losing or changing any existing value', () => {
  const { ctx } = load();
  const before = fixture();
  vm.runInContext('var __s=' + FIXTURE + '; migrate(__s);', ctx);
  const after = get(ctx, '__s');
  // كل مفتاح أصلي ما زال موجوداً
  for (const k of Object.keys(before)) assert.ok(k in after, 'key lost: ' + k);
  // القيم التي لا يملك migrate سبباً لتغييرها تبقى كما هي حرفياً
  for (const k of ['sessions', 'totalMin', 'activityLog', 'weekData', 'streak', 'prayerTrack', 'habits', 'quran',
                   'adhkarLog', 'adhkarDayLog', 'term', 'profileName', 'onboarded', 'unlockedBadges', 'qadaLife', 'exams', 'coreHabits']) {
    assert.deepEqual(after[k], before[k], 'value changed: ' + k);
  }
  assert.equal(after.tasks.length, 2);
  assert.equal(after.tasks[0].text, before.tasks[0].text);
  assert.deepEqual(after.subjects.c_demo1.units, before.subjects.c_demo1.units);
  assert.equal(after.subjects.c_demo2.archived, true);
  // إعدادات المستخدم لا تُمسّ
  assert.equal(after.settings.method, 5);
  assert.equal(after.settings.calm, true);
  assert.equal(after.settings.fontScale, 'large');
  assert.deepEqual(after.settings.hidden, ['sport']);
  assert.deepEqual(after.settings.cardSpan, before.settings.cardSpan);
});

test('migrate() is idempotent on a legacy state', () => {
  const { ctx } = load();
  vm.runInContext('var __a=' + FIXTURE + '; migrate(__a); var __once=JSON.stringify(__a); migrate(__a);', ctx);
  assert.equal(vm.runInContext('JSON.stringify(__a)===__once', ctx), true);
});

test('save() is a no-op until the saved state has been loaded (boot is async)', () => {
  const { ctx, writes } = load();
  ctx.save();
  assert.equal(writes.length, 0, 'nothing may be written before hydration');
  vm.runInContext('stateHydrated=true', ctx);
  ctx.save();
  assert.ok(writes.length >= 1);
});

test('sanitizeState() drops wrongly-typed containers and junk list items, keeps unknown keys', () => {
  const { ctx } = load();
  vm.runInContext('var __x={tasks:"oops", habits:[1,null,{id:1}], settings:[], deadlines:{}, streak:5, futureKey:{a:1}, subjects:{}};' +
                  'var __dropped=sanitizeState(__x);', ctx);
  const x = get(ctx, '__x');
  const dropped = get(ctx, '__dropped');
  assert.equal('tasks' in x, false);
  assert.equal('settings' in x, false);
  assert.equal('deadlines' in x, false);
  assert.deepEqual(x.habits, [{ id: 1 }]);
  assert.equal(x.streak, 5);
  assert.deepEqual(x.futureKey, { a: 1 });
  assert.deepEqual(dropped.sort(), ['deadlines', 'settings', 'tasks']);
});

test('import/restore REPLACES the state (no merge) and snapshots the current one first', () => {
  const { ctx, snapshots } = load();
  vm.runInContext('stateHydrated=true; S=freshState(); S.onlyInOldState=123; S.sessions=7;', ctx);
  vm.runInContext('replaceState(' + FIXTURE + ', "قبل الاستيراد")', ctx);
  assert.equal(snapshots.length, 1);
  assert.match(snapshots[0], /^قبل الاستيراد/);
  assert.equal(vm.runInContext("'onlyInOldState' in S", ctx), false, 'keys absent from the file must not survive');
  assert.equal(get(ctx, 'S.sessions'), 42);
  assert.equal(get(ctx, 'S.profileName'), 'مستخدم تجريبي');
});

test('a sync-envelope file ({v, data}) is accepted by import', () => {
  const { ctx } = load();
  vm.runInContext('stateHydrated=true; replaceState({v:1, updatedAt:1, device:"d", data:JSON.stringify(' + FIXTURE + ')}, "x")', ctx);
  assert.equal(get(ctx, 'S.totalMin'), 1260);
});

test('cleanupOldTasks() uses the completion date, not the creation date', () => {
  const { ctx } = load();
  const day = 86400000, now = Date.now();
  const tasks = [
    { id: now - 40 * day, text: 'old but finished today', done: true, doneAt: now },
    { id: now - 60 * day, text: 'finished 40 days ago', done: true, doneAt: now - 40 * day },
    { id: now - 40 * day, text: 'legacy: no doneAt, old id', done: true },
    { id: now - 90 * day, text: 'pending', done: false },
  ];
  vm.runInContext('stateHydrated=true; S=freshState(); S.tasks=' + JSON.stringify(tasks) + '; cleanupOldTasks();', ctx);
  assert.deepEqual(get(ctx, 'S.tasks.map(function(t){return t.text;})'), ['old but finished today', 'pending']);
});
