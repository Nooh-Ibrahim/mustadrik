// tests/migrate.test.js — شبكة أمان لدالة migrate() في storage.js
// تمنع تكرار فئة باغ «الاختفاء الصامت» (بطاقات حيّة تختفي بسبب مفاتيح إعدادات فاسدة).
// تشغيل: npm test  (node --test — بلا أي تبعيات خارجية)

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'storage.js'), 'utf8');

// storage.js سكربت كلاسيكي بدوال عامة — نشغّله في سياق معزول مع stubs للعوامّ التي يلمسها.
function loadStorage() {
  const ctx = {
    console, JSON, Object, Array, Date, Math, Promise, String, Number, Boolean, Error,
    SCHEMA_VERSION: 99,
    emptyWeek: { days: {} },
    DAYS: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],   // يلمسها migrate عند تهيئة جدول المحاضرات
    S: {},
    exportReminderShown: false,
    window: {},
    document: { getElementById: () => null, body: { className: '', classList: { add(){}, toggle(){} } }, createElement: () => ({ set href(_){}, click(){} }) },
    localStorage: { getItem: () => null, setItem: () => {} },
    setTimeout: () => 0,
    notify: () => {},
    FileReader: function(){},
    Blob: function(){},
    URL: { createObjectURL: () => '' },
    askConfirm: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'storage.js' });
  return ctx;
}

const { migrate } = loadStorage();
assert.equal(typeof migrate, 'function', 'migrate() must be defined in storage.js');

// ١) حالة فارغة → كل الافتراضيات تُبنى دون رمي أخطاء
test('empty state gets all defaults', () => {
  const s = {};
  migrate(s);
  assert.ok(Array.isArray(s.tasks));
  assert.ok(Array.isArray(s.habits));
  assert.equal(typeof s.settings, 'object');
  assert.equal(typeof s.settings.tileHidden, 'object');
  assert.equal(typeof s.settings.cardOrder, 'object');
  assert.ok(Array.isArray(s.settings.hidden));
  assert.equal(s.settings.headFont, 'sans');
  assert.equal(s.settings.calm, false);
  assert.deepEqual(JSON.parse(JSON.stringify(s.streakMercy)), { week: '', used: false });
  assert.equal(s.schemaVersion, 99);
});

// ٢) tileHidden: مفاتيح الصيغة القديمة (بلا ::) تُحذف — الصحيحة تبقى
test('tileHidden drops legacy keys without pageId:: prefix', () => {
  const s = { settings: { tileHidden: {
    'عنوان قديم بلا بادئة': 'عنوان قديم بلا بادئة',
    'page-home::بطاقة حيّة': 'بطاقة حيّة',
  } } };
  migrate(s);
  assert.deepEqual(Object.keys(s.settings.tileHidden), ['page-home::بطاقة حيّة']);
});

// ٣) tileHidden: قيم عناوين البطاقات المحذوفة نهائياً تُحذف حتى لو مفتاحها سليم
test('tileHidden drops REMOVED_TILES labels', () => {
  const s = { settings: { tileHidden: {
    'page-home::كلمة اليوم': 'كلمة اليوم',
    'page-home::نور اليوم': 'نور اليوم',
    'page-home::عدّاد الامتحان': 'عدّاد الامتحان',
  } } };
  migrate(s);
  assert.deepEqual(Object.keys(s.settings.tileHidden), ['page-home::عدّاد الامتحان']);
});

// ٤) settings.hidden: معرّفات مزايا غير معروفة تُرشَّح (سبب اختفاء عدّاد الامتحان والطاقة/النية)
test('settings.hidden filters unknown feature ids', () => {
  const s = { settings: { hidden: ['praytrack', 'exam-countdown', 'feature-that-never-existed', 'rituals'] } };
  migrate(s);
  assert.deepEqual(s.settings.hidden, ['praytrack', 'exam-countdown', 'rituals']);
});

// ٥) cardOrder: غير المصفوفات تُحذف، مداخل بلا :: تُرشَّح، الفارغ يُحذف
test('cardOrder cleanup', () => {
  const s = { settings: { cardOrder: {
    'page-home': ['page-home::أ', 'مدخل فاسد', 'page-home::ب'],
    'bad-container': 'ليست مصفوفة',
    'empties': ['فاسد فقط'],
  } } };
  migrate(s);
  assert.deepEqual(s.settings.cardOrder, { 'page-home': ['page-home::أ', 'page-home::ب'] });
});

// ٦) العصامة (idempotency): تشغيل migrate مرتين = نفس النتيجة تماماً
test('migrate is idempotent', () => {
  const s = { tasks: [{ id: 1, txt: 'مهمة', done: false }], settings: { tileHidden: { 'قديم': 'قديم' } } };
  migrate(s);
  const once = JSON.stringify(s);          // مقارنة نصية — كائنات vm لها prototypes من عالم آخر
  migrate(s);
  assert.equal(JSON.stringify(s), once);
});

// ٧) صيانة البيانات الحيّة: migrate لا يمسّ مهام/عادات المستخدم
test('user data is preserved untouched', () => {
  const tasks = [{ id: 5, txt: 'حل فيزياء', done: false, subject: 'phy' }];
  const habits = [{ id: 9, name: 'قراءة', color: '#0d9488' }];
  const s = { tasks: JSON.parse(JSON.stringify(tasks)), habits: JSON.parse(JSON.stringify(habits)) };
  migrate(s);
  assert.equal(s.tasks[0].txt, tasks[0].txt);
  assert.equal(s.tasks[0].highYield, false);        // يُضاف الوسم فقط — لا يغيّر شيئاً آخر
  assert.deepEqual(s.habits, habits);
});

// ٩) مفاتيح الصيغة الثابتة الجديدة pageId::@cid تنجو من كل تنظيفات migrate
test('stable @cid keys survive migrate cleanups', () => {
  const s = { settings: {
    tileHidden: { 'page-home::@med': 'الدواء' },
    cardOrder: { 'page-home': ['page-home::@cmd-center', 'page-home::@daily-recap'] },
    cardCollapsed: { 'page-settings::@sett-data': true },
    cardSpan: { 'page-stats::@analytics': 'wide' },
  } };
  migrate(s);
  assert.deepEqual(Object.keys(s.settings.tileHidden), ['page-home::@med']);
  assert.deepEqual(JSON.parse(JSON.stringify(s.settings.cardOrder['page-home'])), ['page-home::@cmd-center', 'page-home::@daily-recap']);
  assert.equal(s.settings.cardCollapsed['page-settings::@sett-data'], true);
  assert.equal(s.settings.cardSpan['page-stats::@analytics'], 'wide');
});

// ٨) إعدادات جزئية قديمة لا تُكسر (gradient ناقص الحقول الجديدة)
test('partial legacy settings are upgraded not replaced', () => {
  const s = { settings: { gradient: { on: true, c1: '#111111', c2: '#222222', intensity: 0.3 } } };
  migrate(s);
  assert.equal(s.settings.gradient.on, true);        // اختيار المستخدم باقٍ
  assert.equal(s.settings.gradient.c1, '#111111');
  assert.equal(s.settings.gradient.target, 'bg');    // الحقول الجديدة أُكملت
  assert.equal(s.settings.gradient.angle, 135);
});
