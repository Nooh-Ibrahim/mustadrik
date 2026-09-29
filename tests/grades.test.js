// tests/grades.test.js — الدرجات والمعدّل (grades.js) + جدول المحاضرات (schedule.js)
// دوال صِرفة: gradePts · pctToLetter · marksTotal · gpaOf · hhmmToMin · schedSortDay · nextClassIn
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, state) {
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', file), 'utf8');
  const ctx = {
    console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error, parseInt, parseFloat, isNaN,
    window: {}, document: { getElementById: () => null, querySelectorAll: () => [] },
    S: state, save: () => {}, esc: (s) => String(s), icons: () => {}, notify: () => {},
    undoToast: () => {}, arN: (n) => String(n), subjLabel: (k) => k, subjColor: () => '#000',
    courseOptionsHtml: () => '', flashDone: () => {}, courseActive: () => Object.keys(state.subjects || {}),
    courseObj: (k) => (state.subjects || {})[k] || null,
    DAYS: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    DAYS_AR: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    WEEK_ORDER: [6, 0, 1, 2, 3, 4, 5]
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: file });
  return ctx;
}
const course = (o) => Object.assign({ label: 'x', prog: 0, color: '#0', archived: false, kind: 'uni', order: 0, units: [] }, o);

test('gradePts: سُلّم ٤٫٠ + null لغير المُقدَّر', () => {
  const G = load('grades.js', { subjects: {} });
  assert.equal(G.gradePts('A'), 4.0);
  assert.equal(G.gradePts('B+'), 3.3);
  assert.equal(G.gradePts('F'), 0);
  assert.equal(G.gradePts(''), null);
  assert.equal(G.gradePts('Z'), null);
});

test('pctToLetter: حدود التقدير المقترَح', () => {
  const G = load('grades.js', { subjects: {} });
  assert.equal(G.pctToLetter(95), 'A');
  assert.equal(G.pctToLetter(93), 'A');
  assert.equal(G.pctToLetter(92.9), 'A-');
  assert.equal(G.pctToLetter(80), 'B');
  assert.equal(G.pctToLetter(49), 'F');
});

test('marksTotal: موزونة لو فيه أوزان، وبالمجموع لو مفيش', () => {
  const G = load('grades.js', { subjects: {} });
  // ميدتيرم 18/20 بوزن 30 · نهائي 45/60 بوزن 50 → (0.9*30 + 0.75*50)/80 = 80.6%
  const w = G.marksTotal([{ score: 18, max: 20, weight: 30 }, { score: 45, max: 60, weight: 50 }]);
  assert.equal(w.pct, 80.6);
  assert.equal(w.weightLogged, 80);   // 20% لسه ما اترصدتش
  assert.equal(w.counted, 2);
  // بلا أوزان → مجموع بسيط 63/80
  const s = G.marksTotal([{ score: 18, max: 20, weight: 0 }, { score: 45, max: 60, weight: 0 }]);
  assert.equal(s.pct, 78.8);
  assert.equal(s.weightLogged, 0);
});

test('marksTotal: يتجاهل الدرجات بلا «من» ولا ينهار على الفراغ', () => {
  const G = load('grades.js', { subjects: {} });
  assert.equal(G.marksTotal([]).pct, 0);
  assert.equal(G.marksTotal(null).counted, 0);
  assert.equal(G.marksTotal([{ score: 5, max: 0, weight: 10 }]).counted, 0);
});

test('gpaOf: يحسب المُقدَّر فقط ويوزن بالساعات', () => {
  const S = {
    subjects: {
      a: course({ label: 'ذكاء اصطناعي', credits: 3, letter: 'A' }),      // 4.0 × 3 = 12
      b: course({ label: 'تفاضل', credits: 2, letter: 'B' }),             // 3.0 × 2 = 6
      c: course({ label: 'بلا تقدير', credits: 3, letter: '' }),          // تُستثنى
      d: course({ label: 'بلا ساعات', credits: 0, letter: 'A' })          // تُستثنى
    }
  };
  const G = load('grades.js', S);
  const r = G.gpaOf(['a', 'b', 'c', 'd']);
  assert.equal(r.gpa, 3.6);      // 18 / 5
  assert.equal(r.credits, 5);
  assert.equal(r.counted, 2);
  assert.equal(G.gpaOf([]).gpa, null);
});

test('gpaOf: التراكمي يشمل المؤرشفة، الفصلي لا', () => {
  const S = {
    subjects: {
      a: course({ credits: 3, letter: 'A', archived: false }),
      b: course({ credits: 3, letter: 'F', archived: true })
    }
  };
  const G = load('grades.js', S);
  G.courseActive = () => ['a'];
  assert.equal(G.gpaOf(['a']).gpa, 4);              // الفصلي
  assert.equal(G.gpaOf(['a', 'b']).gpa, 2);         // التراكمي (4+0)/2
});

test('hhmmToMin: يقرأ الصحيح ويرفض الفاسد', () => {
  const C = load('schedule.js', { schedule: {} });
  assert.equal(C.hhmmToMin('09:30'), 570);
  assert.equal(C.hhmmToMin('00:00'), 0);
  assert.equal(C.hhmmToMin('23:59'), 1439);
  assert.equal(C.hhmmToMin('24:00'), null);
  assert.equal(C.hhmmToMin('9:5'), null);
  assert.equal(C.hhmmToMin(''), null);
});

test('schedSortDay: يرتّب بالوقت ويدفع الفاسد للآخر', () => {
  const C = load('schedule.js', { schedule: {} });
  const out = C.schedSortDay([{ from: '13:00' }, { from: '' }, { from: '08:00' }, { from: '10:30' }]);
  assert.equal(JSON.stringify(out.map(x => x.from)), JSON.stringify(['08:00', '10:30', '13:00', '']));
});

test('nextClassIn: الجارية أولاً ثم الجاية ثم null', () => {
  const C = load('schedule.js', { schedule: {} });
  const day = [{ id: 1, from: '09:00', to: '10:30' }, { id: 2, from: '11:00', to: '12:30' }];
  const before = C.nextClassIn(day, 8 * 60);            // 08:00 → الجاية بعد ساعة
  assert.equal(before.state, 'next'); assert.equal(before.item.id, 1); assert.equal(before.mins, 60);
  const during = C.nextClassIn(day, 9 * 60 + 45);       // 09:45 → جارية، باقي 45
  assert.equal(during.state, 'now'); assert.equal(during.item.id, 1); assert.equal(during.mins, 45);
  const gap = C.nextClassIn(day, 10 * 60 + 45);         // 10:45 → الجاية 11:00
  assert.equal(gap.state, 'next'); assert.equal(gap.item.id, 2);
  assert.equal(C.nextClassIn(day, 13 * 60), null);      // خلص اليوم
  assert.equal(C.nextClassIn([], 9 * 60), null);
});
