// tests/phase.test.js — كشف حالة التحوّل (courses.js phaseStateOf)
// الدرس اللي وراها: بنينا «اطوِ الصفحة السابقة» كزرّ مدفون بالضبط، فالمالك فتح التطبيق
// ولقى مواد الثانوية زي ما هي وحسّ إن مفيش حاجة اتغيّرت. الكشف ده هو اللي بيطلّع الشريط.
// تشغيل: npm test

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'courses.js'), 'utf8');
function load() {
  const ctx = {
    console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error, parseInt,
    window: {}, document: { getElementById: () => null, querySelectorAll: () => [] },
    S: { subjects: {} }, save: () => {}, esc: (s) => String(s), icons: () => {}, notify: () => {},
    undoToast: () => {}, actionToast: () => {}, navTo: () => {}, todayKey: () => '2026-8-16',
    formatIslamicDate: () => '', arN: (n) => String(n), openInputDialog: () => {}, askConfirm: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'courses.js' });
  return ctx;
}
const C = load();
const sub = (o) => Object.assign({ label: 'x', archived: false }, o);

test('legacy: كل المساقات النشطة من مواد الثانوية المكتوبة بالكود', () => {
  assert.equal(C.phaseStateOf({
    en: sub({ label: 'إنجليزي' }), bio: sub({ label: 'أحياء' }),
    chem: sub({ label: 'كيمياء' }), phy: sub({ label: 'فيزياء' }), geo: sub({ label: 'جيولوجيا' })
  }), 'legacy');
});

test('legacy حتى لو المستخدم أعاد تسميتها (المفتاح هو الدليل لا الاسم)', () => {
  assert.equal(C.phaseStateOf({ en: sub({ label: 'حاجة تانية' }), bio: sub({ label: 'برمجة' }) }), 'legacy');
});

test('ok: بمجرّد وجود مساق جديد واحد الشريط يسكت', () => {
  assert.equal(C.phaseStateOf({ en: sub({ label: 'إنجليزي' }), c1: sub({ label: 'CS50' }) }), 'ok');
  assert.equal(C.phaseStateOf({ c1: sub({ label: 'CS50' }) }), 'ok');
});

test('empty: مافيش مساقات نشطة (بعد طيّ الصفحة) → «أضِف مساق»', () => {
  assert.equal(C.phaseStateOf({}), 'empty');
  assert.equal(C.phaseStateOf({ en: sub({ archived: true }), c1: sub({ archived: true }) }), 'empty');
});

test('المؤرشفة القديمة لا تُبقي الحالة legacy', () => {
  assert.equal(C.phaseStateOf({ en: sub({ archived: true }), c1: sub({ label: 'CS50' }) }), 'ok');
});
