// tests/courses.test.js — شبكة أمان لدوال المساقات/الترم/المواعيد الصِّرفة (courses.js)
// courseProg (وحدات vs شريط يدوي) · courseActive (الأرشفة) · termInfo (أسبوع كذا من كذا) · nextDeadline · dlTone
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'courses.js'), 'utf8');
function loadCourses(state) {
  const ctx = {
    console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error,
    window: {}, document: { getElementById: () => null, querySelectorAll: () => [] },
    S: state, save: () => {}, esc: (s) => String(s), icons: () => {},
    notify: () => {}, undoToast: () => {}, actionToast: () => {}, navTo: () => {},
    todayKey: () => '2026-8-7', formatIslamicDate: () => '', arN: (n) => String(n),
    openInputDialog: () => {}, askConfirm: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'courses.js' });
  return ctx;
}

test('courseProg: الوحدات تَغلِب الشريط اليدوي', () => {
  const C = loadCourses({
    subjects: {
      a: { label: 'CS50', prog: 90, color: '#000', archived: false, kind: 'online', order: 0,
           units: [{ t: 'w0', done: true }, { t: 'w1', done: true }, { t: 'w2', done: false }, { t: 'w3', done: false }] },
      b: { label: 'رياضة بحتة', prog: 35, color: '#111', archived: false, kind: 'uni', order: 1, units: [] }
    }
  });
  assert.equal(C.courseProg('a'), 50);   // 2/4 — والشريط اليدوي 90 يُتجاهَل
  assert.equal(C.courseProg('b'), 35);   // بلا وحدات → الشريط اليدوي
});

test('courseActive/courseArchivedKeys: الأرشفة تُخفي بلا فقدان + الترتيب مُحترَم', () => {
  const S = {
    subjects: {
      a: { label: 'أ', prog: 0, color: '#0', archived: false, kind: 'uni', order: 2, units: [] },
      b: { label: 'ب', prog: 0, color: '#0', archived: true,  kind: 'uni', order: 0, units: [] },
      c: { label: 'ج', prog: 0, color: '#0', archived: false, kind: 'uni', order: 1, units: [] }
    }
  };
  const C = loadCourses(S);
  assert.equal(JSON.stringify(C.courseActive()), JSON.stringify(['c', 'a']));
  assert.equal(JSON.stringify(C.courseArchivedKeys()), JSON.stringify(['b']));
  assert.equal(C.subjLabel('b'), 'ب');   // المؤرشف يحتفظ باسمه (المهام القديمة تفضل مقروءة)
  assert.equal(C.subjLabel('gen'), 'عام');
});

test('termInfo: الأسبوع الحالي من الإجمالي + نسبة الانقضاء', () => {
  const C = loadCourses({ subjects: {}, term: { name: 'ترم أول', start: '2026-09-19', end: '2027-01-08' } });
  const RealDate = Date;
  // نثبّت «الآن» في منتصف الترم تقريباً (بعد ٥ أسابيع بالضبط من البداية)
  const fixed = new RealDate('2026-10-24T12:00:00Z').getTime();
  C.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  const i = C.termInfo();
  assert.equal(i.totalWeeks, 16);        // ١٩ سبتمبر → ٨ يناير = ١١٢ يوماً = ١٦ أسبوعاً بالضبط (كان ١٧ بسبب ساعة التوقيت الصيفي)
  assert.equal(i.curWeek, 6);            // الأسبوع السادس (٥ أسابيع كاملة انقضت)
  assert.equal(i.started, true);
  assert.equal(i.ended, false);
  assert.ok(i.pct > 25 && i.pct < 40);
  C.Date = RealDate;
});

test('termInfo: يرجع null بلا تواريخ أو بمدى مقلوب', () => {
  assert.equal(loadCourses({ subjects: {}, term: { name: '', start: '', end: '' } }).termInfo(), null);
  assert.equal(loadCourses({ subjects: {}, term: { name: 'x', start: '2027-01-08', end: '2026-09-19' } }).termInfo(), null);
});

test('nextDeadline: أقرب موعد قادم — يتخطّى الفائت والمُنجَز', () => {
  const C = loadCourses({
    subjects: {},
    deadlines: [
      { id: 1, title: 'فات',    date: '2020-01-01', time: '08:00', kind: 'exam',   done: false, subject: '' },
      { id: 2, title: 'مُنجَز',  date: '2099-01-01', time: '08:00', kind: 'assign', done: true,  subject: '' },
      { id: 3, title: 'الأقرب', date: '2099-02-01', time: '09:00', kind: 'exam',   done: false, subject: '' },
      { id: 4, title: 'أبعد',   date: '2099-03-01', time: '09:00', kind: 'exam',   done: false, subject: '' }
    ]
  });
  assert.equal(C.nextDeadline().title, 'الأقرب');
  assert.equal(JSON.stringify(C.deadlineSorted(false).map(d => d.title)), JSON.stringify(['فات', 'الأقرب', 'أبعد']));
});

test('nextDeadline: null لمّا مافيش مواعيد قادمة', () => {
  assert.equal(loadCourses({ subjects: {}, deadlines: [] }).nextDeadline(), null);
});

test('dlTone: درجات القرب من الموعد', () => {
  const C = loadCourses({ subjects: {} });
  assert.equal(C.dlTone(-1), 'over');
  assert.equal(C.dlTone(0), 'urgent');
  assert.equal(C.dlTone(2), 'urgent');
  assert.equal(C.dlTone(3), 'soon');
  assert.equal(C.dlTone(7), 'soon');
  assert.equal(C.dlTone(8), 'ok');
});
