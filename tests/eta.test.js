// tests/eta.test.js — شبكة أمان لدالة «ينتهي الكل الساعة X» الصِّرفة (timer.js)
// taskEtaCompute: مجموع التقديرات + الراحات المتخلّلة المشتقّة من طول الجلسة → لحظة الانتهاء
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'timer.js'), 'utf8');
function loadTimer() {
  const ctx = { console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error, window: {}, document: {} };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'timer.js' });
  return ctx;
}
const T = loadTimer();

test('taskEtaCompute: مجموع + راحات مشتقّة من طول الجلسة', () => {
  assert.equal(typeof T.taskEtaCompute, 'function');
  const now = 1_000_000_000_000;
  // 25+40+15=80 د · جلسة 20 د → 4 جلسات → 3 راحات × 5 = 95 د إجمالاً
  const e = T.taskEtaCompute([25, 40, 15], now, 20, 5);
  assert.equal(e.n, 3);
  assert.equal(e.totalMin, 80);
  assert.equal(e.breaks, 3);
  assert.equal(e.endMs, now + 95 * 60000);
});

test('taskEtaCompute: الحواف — فارغ، مهمة واحدة قصيرة، قيَم فاسدة', () => {
  const now = 5_000;
  const empty = T.taskEtaCompute([], now, 20, 5);
  assert.equal(empty.n, 0); assert.equal(empty.endMs, 0);
  // مهمة 10 د ≤ جلسة 20 د → جلسة واحدة، بلا راحات
  const one = T.taskEtaCompute([10], now, 20, 5);
  assert.equal(one.breaks, 0);
  assert.equal(one.endMs, now + 10 * 60000);
  // أصفار وسوالب وقيَم غير رقمية تُرشَّح
  const junk = T.taskEtaCompute([0, -5, null, 30], now, 20, 5);
  assert.equal(junk.n, 1); assert.equal(junk.totalMin, 30);
});
