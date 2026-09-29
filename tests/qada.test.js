// tests/qada.test.js — شبكة أمان للدوال الصِّرفة في «قضاء الفوائت» (prayer.js)
// qadaTotals (جمع + كبح done عند total) · qadaPace (متوسّط نافذة) · qadaEtaDays · qadaStreak
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'prayer.js'), 'utf8');
function loadPrayer() {
  const ctx = { console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error, window: {}, document: {},
    PRAYER_KEYS: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], S: {} };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'prayer.js' });
  return ctx;
}
const P = loadPrayer();

// مفتاح اليوم بصيغة الوحدة: Y-M-D (بلا تصفير)
function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

test('qadaTotals يجمع ويكبح done عند total', () => {
  assert.equal(typeof P.qadaTotals, 'function');
  const q = { counts: { fajr: { total: 100, done: 40 }, dhuhr: { total: 100, done: 100 }, asr: { total: 50, done: 0 } } };
  const t = P.qadaTotals(q);
  assert.equal(t.total, 250);
  assert.equal(t.done, 140);
  assert.equal(t.remain, 110);
  // done أكبر من total يُكبح (لا فوائت سالبة)
  const t2 = P.qadaTotals({ counts: { fajr: { total: 10, done: 999 } } });
  assert.equal(t2.done, 10);
  assert.equal(t2.remain, 0);
  // فارغ (مقارنة نصّية — كائن الـvm عبر-عوالم لا يوافق deepStrictEqual)
  assert.equal(JSON.stringify(P.qadaTotals({})), JSON.stringify({ total: 0, done: 0, remain: 0 }));
});

test('qadaEtaDays: 0 عند الاكتمال، ∞ بلا معدّل، تقريب لأعلى', () => {
  assert.equal(P.qadaEtaDays(0, 5), 0);
  assert.equal(P.qadaEtaDays(100, 0), Infinity);
  assert.equal(P.qadaEtaDays(100, 5), 20);
  assert.equal(P.qadaEtaDays(101, 5), 21);   // ceil
});

test('qadaPace يحسب متوسّط النافذة الأخيرة', () => {
  const now = new Date(2026, 6, 18, 12, 0, 0);   // 18 يوليو 2026
  const log = {};
  log[key(now)] = 3;                                            // اليوم
  log[key(new Date(2026, 6, 17))] = 5;                          // أمس
  log[key(new Date(2026, 6, 16))] = 2;                          // أول أمس
  log[key(new Date(2026, 6, 1))] = 100;                         // خارج نافذة الـ7 أيام → يُتجاهل
  const pace = P.qadaPace(log, 7, now.getTime());
  assert.equal(pace, (3 + 5 + 2) / 7);
});

test('qadaUnabsorbed: يعدّ «فاتت» غير المضمومة فقط', () => {
  assert.equal(typeof P.qadaUnabsorbed, 'function');
  const pt = {
    '2026-7-10': { fajr: { status: 'missed' }, dhuhr: { status: 'jama3a' } },
    '2026-7-11': { fajr: { status: 'missed', life: true }, asr: { status: 'missed' } },
    '2026-7-12': { isha: { status: 'qada' } }
  };
  const u = P.qadaUnabsorbed(pt);
  assert.equal(u.n, 2);                       // fajr 7-10 + asr 7-11 (المضمومة life:true تُستثنى)
  const keys = u.cells.map(c => c.dk + ':' + c.k).sort();
  assert.equal(JSON.stringify(keys), JSON.stringify(['2026-7-10:fajr', '2026-7-11:asr']));
});

test('qadaStreak يعدّ الأيام المتتالية ويتسامح مع اليوم غير المسجَّل', () => {
  const now = new Date(2026, 6, 18, 9, 0, 0);
  // اليوم غير مسجَّل، لكن الأمس ويومان قبله نعم → السلسلة = 3
  const log = {};
  log[key(new Date(2026, 6, 17))] = 1;
  log[key(new Date(2026, 6, 16))] = 4;
  log[key(new Date(2026, 6, 15))] = 2;
  // فجوة يوم 14 → تتوقّف السلسلة
  log[key(new Date(2026, 6, 13))] = 9;
  assert.equal(P.qadaStreak(log, now.getTime()), 3);
  // اليوم مسجَّل أيضاً → 4
  log[key(now)] = 1;
  assert.equal(P.qadaStreak(log, now.getTime()), 4);
});
