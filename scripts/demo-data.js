'use strict';
// scripts/demo-data.js — a fictional profile used ONLY for README screenshots (node scripts/e2e.js shots).
// Every name and number here is invented. Dates are relative to "today" so the screenshots look alive.

function dk(daysAgo) {                        // app day key: YYYY-M-D (unpadded, local)
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}
function iso(daysFromNow) {                   // <input type=date> value: YYYY-MM-DD
  const d = new Date(); d.setDate(d.getDate() + daysFromNow);
  const p = (n) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function state() {
  const now = Date.now();
  const activityLog = {};
  const minutes = [95, 60, 120, 40, 0, 75, 110, 85, 50, 130, 70, 0, 90, 105, 60, 45, 120, 80, 0, 100, 65];
  minutes.forEach((m, i) => { if (m) activityLog[dk(i + 1)] = m; });
  activityLog[dk(0)] = 55;

  const statuses = ['jama3a', 'solo', 'jama3a', 'late', 'jama3a'];
  const prayerTrack = {};
  for (let i = 1; i <= 13; i++) {
    const day = {};
    ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach((p, j) => {
      let st = statuses[(i + j) % statuses.length];
      if (i === 4 && p === 'fajr') st = 'qada';
      day[p] = { status: st, delay: st === 'late' ? 20 : 0 };
    });
    prayerTrack[dk(i)] = day;
  }
  prayerTrack[dk(0)] = { fajr: { status: 'jama3a', delay: 0 }, dhuhr: { status: 'solo', delay: 0 } };

  const habitLog = (skip) => { const l = {}; for (let i = 0; i < 20; i++) if (!skip.includes(i)) l[dk(i)] = true; return l; };
  const times = { fajr: '04:35', dhuhr: '11:52', asr: '15:14', maghrib: '17:48', isha: '19:05' };
  const week = {}; ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((d) => { week[d] = Object.assign({}, times); });

  return {
    profileName: 'سارة',
    onboarded: true,
    theme: 't-terracotta',
    sessions: 64, totalMin: 1790, streak: 6, lastStudyDate: dk(0), lastWeekTotal: 510,
    activityLog,
    hourLog: [0, 0, 0, 0, 0, 1, 2, 3, 6, 8, 5, 2, 1, 1, 2, 4, 6, 7, 5, 3, 2, 1, 0, 0],
    subjects: {
      c_prog: { label: 'البرمجة ١', color: '#0d9488', kind: 'uni', order: 0, archived: false, credits: 3, letter: '', marks: [],
        units: [{ t: 'المتغيّرات والأنواع', done: true }, { t: 'الشروط والحلقات', done: true }, { t: 'الدوال', done: true }, { t: 'المصفوفات', done: false }, { t: 'الملفات', done: false }] },
      c_calc: { label: 'تفاضل وتكامل', color: '#7c3aed', kind: 'uni', order: 1, archived: false, credits: 3, letter: '', marks: [],
        units: [{ t: 'النهايات', done: true }, { t: 'الاشتقاق', done: true }, { t: 'تطبيقات الاشتقاق', done: false }, { t: 'التكامل', done: false }] },
      c_ai: { label: 'مقدمة في الذكاء الاصطناعي', color: '#c8643c', kind: 'uni', order: 2, archived: false, credits: 2, letter: '', marks: [],
        units: [{ t: 'البحث', done: true }, { t: 'المنطق', done: false }, { t: 'التعلّم الآلي', done: false }] },
      c_cs50: { label: 'CS50 — دورة', color: '#0284c7', kind: 'online', order: 3, archived: false, credits: 0, letter: '', marks: [],
        units: [{ t: 'Week 0', done: true }, { t: 'Week 1', done: true }, { t: 'Week 2', done: false }] },
    },
    subjectLog: { gen: 120, c_prog: 640, c_calc: 520, c_ai: 310, c_cs50: 200 },
    tasks: [
      { id: now - 1000, text: 'حل تمارين الاشتقاق — الفصل الثالث', subject: 'c_calc', category: '', priority: 'high', pomo: 3, estMin: 60, actualSessions: 1,
        deadline: iso(1), repeat: 'none', lastReset: dk(0), today: true, archived: false, highYield: true, done: false, expanded: false,
        steps: [{ t: 'مراجعة القواعد', done: true }, { t: 'حل ١٠ مسائل', done: false }, { t: 'مراجعة الأخطاء', done: false }] },
      { id: now - 2000, text: 'مشروع صغير: آلة حاسبة بلغة C', subject: 'c_prog', category: '', priority: 'mid', pomo: 4, estMin: 90, actualSessions: 2,
        deadline: iso(4), repeat: 'none', lastReset: dk(0), today: true, archived: false, highYield: false, done: false, expanded: false,
        steps: [{ t: 'تصميم الواجهة النصية', done: true }, { t: 'العمليات الأربع', done: false }] },
      { id: now - 3000, text: 'مشاهدة محاضرة CS50 — Week 2', subject: 'c_cs50', category: '', priority: 'low', pomo: 2, estMin: 45, actualSessions: 0,
        deadline: '', repeat: 'none', lastReset: dk(0), today: false, archived: false, highYield: false, done: false, expanded: false, steps: [] },
      { id: now - 4000, text: 'تلخيص فصل البحث في الذكاء الاصطناعي', subject: 'c_ai', category: '', priority: 'mid', pomo: 2, estMin: 40, actualSessions: 0,
        deadline: iso(6), repeat: 'none', lastReset: dk(0), today: false, archived: false, highYield: false, done: false, expanded: false, steps: [] },
      { id: now - 5000, text: 'مراجعة محاضرة البرمجة', subject: 'c_prog', category: '', priority: 'mid', pomo: 1, estMin: 25, actualSessions: 1,
        deadline: '', repeat: 'none', lastReset: dk(0), today: false, archived: false, highYield: false, done: true, doneAt: now - 3600000, expanded: false, steps: [] },
    ],
    habits: [
      { id: 11, name: 'ورد القرآن', color: '#0d9488', freq: 'daily', cat: 'habit', log: habitLog([3]) },
      { id: 12, name: 'مشي ٢٠ دقيقة', color: '#c8643c', freq: 'daily', cat: 'habit', log: habitLog([1, 5, 9, 12]) },
      { id: 13, name: 'نوم قبل ١١', color: '#7c3aed', freq: 'daily', cat: 'habit', log: habitLog([2, 7, 8]) },
    ],
    prayerTrack,
    prayerWeek: week,
    settings: { city: 'Cairo', country: 'Egypt', method: 5, methodChosen: true, autoFetch: false, lastFetchAt: now, lastFetch: '',
      hidden: [], calm: false, taskAccordion: { 'تفاضل وتكامل': true, 'البرمجة ١': true } },
    term: { name: 'الفصل الأول', start: iso(-20), end: iso(95) },
    deadlines: [
      { id: now - 10, title: 'اختبار قصير — تفاضل', date: iso(3), time: '10:00', kind: 'exam', subject: 'c_calc', done: false },
      { id: now - 11, title: 'تسليم مشروع البرمجة', date: iso(9), time: '23:59', kind: 'assign', subject: 'c_prog', done: false },
    ],
    quran: { khatmaPages: 186, khatmaCount: 0, log: { [dk(0)]: 4, [dk(1)]: 5, [dk(2)]: 4, [dk(3)]: 6 }, reads: [] },
    niyyah: { date: dk(0), items: ['تمارين الاشتقاق', 'مشروع الآلة الحاسبة', 'ورد القرآن'] },
    energyToday: { date: dk(0), level: 'active' },
    weeklyReportShown: dk(0),
    muhasaba: { date: dk(0), done: '', note: '' },
    unlockedBadges: ['first', 'streak3', 'hour'],
    weekData: [95, 55, 120, 0, 0, 0, 110],
    lastXPLevel: 99,                              // no level-up popup in screenshots (the app lowers it silently)
    lastBackupDate: iso(0),                       // no disk-backup / export nags in screenshots
    lastExportDate: new Date().toISOString(),
  };
}

// what to capture: `setup` runs inside the app (async body), then a screenshot is taken
const SHOTS = [
  { file: 'home.png', setup: "navTo('home'); window.scrollTo(0,0); return true;" },
  { file: 'focus.png', setup: "navTo('pomodoro'); window.scrollTo(0,0); return true;" },
  { file: 'tasks.png', setup: "navTo('tasks'); window.scrollTo(0,0); return true;" },
  { file: 'prayer.png', setup: "navTo('praytrack'); window.scrollTo(0,0); return true;" },
  { file: 'stats.png', setup: "navTo('stats'); window.scrollTo(0,0); return true;" },
  { file: 'dark.png', setup: "S.dark=true; document.body.classList.add('dark'); if(typeof updateDarkBtn==='function')updateDarkBtn(); navTo('home'); window.scrollTo(0,0); return true;" },
  { file: 'onboarding.png', setup: "S.dark=false; document.body.classList.remove('dark'); navTo('home'); startOnboarding(); obStep=3; obRender(); return true;", wait: 1200 },
];

module.exports = { state, SHOTS };
