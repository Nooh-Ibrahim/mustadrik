// tests/widget.test.js — شبكة أمان للدوال الصِّرفة في ويدجت المؤقّت (widget.js)
// twMinLeft: دقائق الشارة/التلميح (تقريب لأعلى) · twComputeActive: هل الجلسة جارية أو موقوفة في المنتصف
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'widget.js'), 'utf8');

// widget.js سكربت كلاسيكي بدوال عامة؛ لا يلمس DOM إلا داخل الدوال، فيكفي سياق بسيط
function loadWidget() {
  const ctx = { console, JSON, Object, Array, Date, Math, String, Number, Boolean, Error, window: {} };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'widget.js' });
  return ctx;
}
const W = loadWidget();

test('twMinLeft يقرّب الدقائق لأعلى', () => {
  assert.equal(typeof W.twMinLeft, 'function');
  assert.equal(W.twMinLeft(0), 0);        // لا شيء متبقٍّ
  assert.equal(W.twMinLeft(1), 1);        // 1ث → دقيقة كاملة على الشارة
  assert.equal(W.twMinLeft(60), 1);       // دقيقة بالضبط
  assert.equal(W.twMinLeft(61), 2);       // 1:01 → 2
  assert.equal(W.twMinLeft(1200), 20);    // 20 دقيقة (جلسة سعي افتراضية)
  assert.equal(W.twMinLeft(-5), 0);       // سالب يُحمى إلى 0
  assert.equal(W.twMinLeft(null), 0);     // قيمة غائبة
});

test('twComputeActive: جارية أو موقوفة في المنتصف فقط', () => {
  assert.equal(typeof W.twComputeActive, 'function');
  assert.equal(W.twComputeActive(true, 900, 1200), true);    // جارية
  assert.equal(W.twComputeActive(false, 900, 1200), true);   // موقوفة في المنتصف → لا يزال HUD ظاهراً
  assert.equal(W.twComputeActive(false, 1200, 1200), false); // في البداية بلا تقدّم (خمول) → مخفي
  assert.equal(W.twComputeActive(false, 0, 1200), false);    // انتهت/صُفّرت → مخفي
  assert.equal(W.twComputeActive(true, 1200, 1200), true);   // بدأت للتوّ (جارية) → ظاهرة
});
