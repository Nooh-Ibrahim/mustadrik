// tests/deadline-remind.test.js — نوافذ تذكير مواعيد الترم (remind.js dlRemindWindow)
// دالة صِرفة: تحدّد أي تنبيه يستحقّه الموعد الآن بحسب الأيام المتبقّية والساعة.
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'remind.js'), 'utf8');
function load() {
  const ctx = { console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error, window: {}, document: {} };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'remind.js' });
  return ctx;
}
const R = load();
const at = (iso) => new Date(iso);
const dl = (over) => Object.assign({ id: 1, title: 'تسليم', date: '2026-09-10', time: '23:59', kind: 'assign', done: false }, over);

test('بكرة: ينبّه مساءً فقط', () => {
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-09T17:30:00')), null);          // قبل ٦م → لسه
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-09T18:00:00')).kind, 'tomorrow');
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-09T22:00:00')).flag, 'dlt_');
});

test('اليوم: ينبّه من الصبح', () => {
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-10T07:00:00')), null);
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-10T08:00:00')).kind, 'today');
  // بعد فوات ساعة الموعد نفسه لكنه لسه «اليوم» — يفضل تنبيه اليوم لا الفوات
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-10T23:59:59')).kind, 'today');
});

test('الفوات: ٣ أيام فقط ثم يسكت (الأعلام تُمسح يومياً)', () => {
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-11T09:00:00')).kind, 'over');
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-13T09:00:00')).kind, 'over');   // اليوم الثالث
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-14T09:00:00')), null);          // الرابع → صمت
  assert.equal(R.dlRemindWindow(dl(), at('2026-09-11T08:00:00')), null);          // قبل ٩ص
});

test('الامتحانات وحدها: تنبيه مبكّر قبل ٣ أيام', () => {
  assert.equal(R.dlRemindWindow(dl({ kind: 'exam' }), at('2026-09-07T09:00:00')).kind, 'exam3');
  assert.equal(R.dlRemindWindow(dl({ kind: 'assign' }), at('2026-09-07T09:00:00')), null);   // التسليم لأ
  assert.equal(R.dlRemindWindow(dl({ kind: 'exam' }), at('2026-09-06T09:00:00')), null);     // ٤ أيام → لسه
});

test('المُنجَز والفارغ لا يُنبّهان أبداً', () => {
  assert.equal(R.dlRemindWindow(dl({ done: true }), at('2026-09-10T09:00:00')), null);
  assert.equal(R.dlRemindWindow(dl({ date: '' }), at('2026-09-10T09:00:00')), null);
  assert.equal(R.dlRemindWindow(dl({ date: 'ليس تاريخاً' }), at('2026-09-10T09:00:00')), null);
  assert.equal(R.dlRemindWindow(null, at('2026-09-10T09:00:00')), null);
});
