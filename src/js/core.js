// core.js — state, constants & shared helpers (icons/notify/esc/todayKey) — LOAD FIRST
// module 1/10 of the former renderer.js — classic script (globals shared, no ES modules)

// اسم التطبيق المعروض للمستخدم — مصدر واحد لكل العناوين والتقارير
var APP_NAME='مُستدرِك';

const DAYS=['sun','mon','tue','wed','thu','fri','sat'];
const DAYS_AR=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const PRAYER_KEYS=['fajr','dhuhr','asr','maghrib','isha'];
const PRAYER_AR={fajr:'الفجر',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
const THEMES=[
  {id:'t-terracotta',c:'#c8643c'},{id:'t-sage',c:'#2e6b4a'},{id:'t-lavender',c:'#7a72d8'},
  {id:'t-indigo',c:'#4f46e5'},{id:'t-emerald',c:'#0d9488'},{id:'t-rose',c:'#e11d48'},
  {id:'t-sunset',c:'#ea580c'},{id:'t-sky',c:'#0284c7'},{id:'t-violet',c:'#7c3aed'},
  {id:'t-teal',c:'#14b8a6'},{id:'t-amber',c:'#f59e0b'},{id:'t-coral',c:'#f43f5e'},
  {id:'t-ocean',c:'#0891b2'},{id:'t-plum',c:'#a21caf'},{id:'t-forest',c:'#15803d'},
  {id:'t-slate',c:'#64748b'},{id:'t-gold',c:'#ca8a04'}
];
const emptyWeek={};DAYS.forEach(function(d){emptyWeek[d]={fajr:'',dhuhr:'',asr:'',maghrib:'',isha:''};});

// freshState() — factory returning a brand-new default profile state (used at boot + for new profiles)
function freshState(){ return {
  sessions:0,totalMin:0,tasks:[],habits:[],
  // المساقات تبدأ فارغة — المستخدم يضيف مواد ترمه أو كورساته (كانت خمس مواد ثانوية مكتوبة بالكود)
  subjects:{},
  activityLog:{},weekData:[0,0,0,0,0,0,0],weekStart:'',dark:false,streak:0,lastStudyDate:'',
  theme:'t-terracotta',prayerWeek:JSON.parse(JSON.stringify(emptyWeek)),
  prayerTrack:{},
  goals:{dailyItems:[],weeklyItems:[],dailyMin:120,weeklyMin:600},
  subjectLog:{gen:0},
  unlockedBadges:[],
  settings:{city:'',country:'',method:4,autoFetch:true,lastFetch:''},
  // ---- v10 ----
  schemaVersion:10,
  hourLog:new Array(24).fill(0),  // sessions completed per hour-of-day
  lastWeekTotal:0,                // minutes from the previous calendar week
  taskSortMode:'auto',            // 'auto' | 'manual'
  lastBackupDate:'',              // YYYY-MM-DD of last on-disk backup
  lastExportDate:'',              // ISO date of last manual export
  // ---- مِنهاج اليوم: طقس اليوم ----
  niyyah:{date:'',items:['','','']},        // النية الصباحية (3 أولويات)
  muhasaba:{date:'',done:'',note:''},       // المحاسبة المسائية
  energyToday:{date:'',level:''},           // مقياس الطاقة: نشيط / متعب / مرهق
  weeklyReportShown:'',                     // آخر أسبوع عُرض فيه التقرير الأسبوعي
  // ---- جولة 2: مرشد دراسي + سكينة ----
  srs:{},                                   // المراجعة المتباعدة لكل مادة {subjKey:{mastery:1-5,lastReview:'YYYY-M-D'}}
  deepTip:{week:'',text:''},                // نصيحة أسبوعية مشتقّة (تُحسب مرة كل أسبوع)
  // ---- جولة 3: مؤقت/روتين/تخطيط/هوية ----
  // (أُزيل exams وroutines — كانا معرَّفين ومُرحَّلين بصفر استخدام في الكود كله)
  dayPlan:{date:'',periods:{}},             // تخطيط اليوم حسب فترات الصلاة
  lastXPLevel:1,                            // لكشف ترقّي المستوى (احتفال)
  // ---- رفيق الطُّهر (خاص، opt-in) ----
  recovery:{enabled:false,startDate:'',bestStreak:0,totalResets:0,lastReset:'',plan:{triggers:'',actions:''},urges:[],lessons:{lastDate:'',streak:0}},
  // ---- النهوض / استعادة الثقة ----
  confidence:{wins:[]}
}; }
var S=freshState();
const SCHEMA_VERSION=10;
let taskSearch='';
let timerInterval=null,isRunning=false,isBreak=false,timeLeft=1200,focusMode=false;
let expectedEndTime=0;
let audioCtx=null,ambientNode=null,ambientType='none',curVol=0.5;
let taskFilter='all',calOffset=0;
let currentTaskName='';
// المعرّف الداخلي للملف الأساسي. قيمته تاريخية ومخزّنة في قواعد بيانات المستخدمين الحاليين
// (IndexedDB profileState/mediaBlobs) — لا تغيّرها أبداً وإلا تتيتّم بياناتهم. لا يظهر للمستخدم.
var PRIMARY_PROFILE_ID='noah';
var activeProfileId=PRIMARY_PROFILE_ID;   // active data profile (IndexedDB)
function curProfileId(){ return activeProfileId||PRIMARY_PROFILE_ID; }
// مفاتيح localStorage — أسماؤها تاريخية ومحفوظة عند المستخدمين الحاليين؛ لا تُغيَّر (مرآة احتياطية لـ IndexedDB).
var LS_STATE_KEY='noah_v4', LS_MIRROR_KEY='noah_v4_mirror', LS_LEGACY_V3_KEY='noah_v3';
var LS_DEVICE_ID_KEY='noah_device_id', LS_SYNC_STAMP_KEY='noah_sync_stamp';
var taskShowArchived=false;   // بنك المهام: show archived tasks
var currentTaskId=null;       // links a running سعي session to a task (estimated vs actual)
var currentStepIdx=null;      // links a running session to a specific sub-step (for per-step actual count)

const quotes=[
  "«وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا» — الطلاق:2",
  "«إِنَّ مَعَ الْعُسْرِ يُسْرًا» — الشرح:6",
  "«وَقُل رَّبِّ زِدْنِي عِلْمًا» — طه:114",
  "العلم في الصغر كالنقش على الحجر",
  "من جدَّ وجد، ومن زرع حصد",
  "كل خطوة صغيرة تُقرّبك من الهدف",
  "الصبر مفتاح الفرج",
  "ما أخذته اليوم لا يسرقه منك أحد غداً",
  "النجاح ليس نهاية الطريق — بل بداية جديدة"
];
let todayQuote=quotes[Math.floor(Math.random()*quotes.length)];

// التقاط أخطاء الواجهة → سجلّ محلي على القرص (خصوصية أولاً — لا يُرفع لأي خادم أبداً)
window.addEventListener('error',function(e){
  try{ if(window.noahAPI&&noahAPI.logError)noahAPI.logError((e.message||'error')+' @ '+(e.filename||'?')+':'+(e.lineno||0)); }catch(_){}
});
window.addEventListener('unhandledrejection',function(e){
  try{ var r=e.reason; if(window.noahAPI&&noahAPI.logError)noahAPI.logError('promise: '+((r&&r.stack)||r)); }catch(_){}
});

// ===== الأيقونات: نداء واحد مُجمَّع بدل ١٩ نداءً في كل إعادة رسم =====
// lucide بيسيب خاصية data-lucide على الـSVG بعد التحويل، فكل نداء بيعيد معالجة كل الأيقونات
// الموجودة (٤٨٦ وقت القياس) — مش الجديدة بس. قياس فعلي: icons() كانت ٣٦٦ من أصل ٤٠٠ ملّي
// في refreshAll (٩١٪ من زمنها). التجميع في نداء واحد آخر الإطار: ٤٠٣ ملّي ← ~٧ ملّي.
// setTimeout احتياطي لأن requestAnimationFrame ما بيشتغلش والنافذة مخفيّة (وضع الخلفية/التراي).
var _iconsPending=false;
function iconsFlush(){ if(!_iconsPending)return; _iconsPending=false; iconsNow(); }
function icons(){
  if(_iconsPending)return;
  _iconsPending=true;
  try{ requestAnimationFrame(iconsFlush); }catch(e){}
  setTimeout(iconsFlush,50);
}
// نداء فوري متزامن — لِمن يحتاج الأيقونات مرسومة قبل قياس/قراءة الـDOM
function iconsNow(){ if(window.lucide){ try{ lucide.createIcons(); }catch(e){} } }
function notify(msg,ic){var n=document.getElementById('notif');n.innerHTML='<i data-lucide="'+(ic||'info')+'"></i>'+msg;icons();n.classList.add('show');setTimeout(function(){n.classList.remove('show');},2500);}

// toast «تراجَع»: الحذف يحدث فوراً + مهلة تراجُع ٦ ثوانٍ — بديل رسائل التأكيد (أسرع وأرحم)
var _undoT=null,_undoFn=null;
function undoToast(msg,undoFn){
  var n=document.getElementById('notif'); if(!n)return;
  _undoFn=undoFn;
  n.innerHTML='<i data-lucide="trash-2"></i>'+msg+'<button class="undo-btn" onclick="undoNow()"><i data-lucide="undo-2"></i> تراجَع</button>';
  icons(); n.classList.add('show');
  clearTimeout(_undoT); _undoT=setTimeout(function(){ n.classList.remove('show'); _undoFn=null; },6000);
}
function undoNow(){
  var f=_undoFn; _undoFn=null; clearTimeout(_undoT);
  var n=document.getElementById('notif'); if(n)n.classList.remove('show');
  if(f){ try{f();}catch(e){} }
}
// toast بزرّ فعلٍ مخصّص (تلميح لطيف قابل للتنفيذ بنقرة) — يشارك آلية undoToast/undoNow نفسها
function actionToast(msg,btnLabel,ic,fn){
  var n=document.getElementById('notif'); if(!n)return;
  _undoFn=fn;
  n.innerHTML='<i data-lucide="'+(ic||'sparkles')+'"></i>'+msg+'<button class="undo-btn" onclick="undoNow()"><i data-lucide="check"></i> '+btnLabel+'</button>';
  icons(); n.classList.add('show');
  clearTimeout(_undoT); _undoT=setTimeout(function(){ n.classList.remove('show'); _undoFn=null; },7000);
}

function pad2(n){ return (n<10?'0':'')+n; }
// تاريخ محلي YYYY-MM-DD — بدل toISOString().slice(0,10) الذي يُرجع يوم UTC (يتأخر يوماً بعد منتصف الليل محلياً)
function localDateKey(d){ d=d||new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function todayKey(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
// بداية الأسبوع = السبت (إصلاح: كان الأحد — والأسبوع المصري يبدأ السبت)
function weekStartKey(){var d=new Date();d.setDate(d.getDate()-((d.getDay()+1)%7));return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
var WEEK_ORDER=[6,0,1,2,3,4,5];   // ترتيب العرض: السبت أولاً (فهارس getDay)
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// أرقام عربية في كل نصوص الواجهة (الخلط بين ١٢٣ و123 كان يتكرر — وحّدناه في دالة واحدة)
function arN(n){ try{ return Number(n).toLocaleString('ar-EG'); }catch(e){ return String(n); } }
// تاريخ ميلادي نظيف بالعربية (يوم شهر سنة) — بأرقام عربية متناسقة مع روح التصميم.
function formatIslamicDate(d){
  d = d ? (d instanceof Date ? d : new Date(d)) : new Date();
  if(isNaN(d)) d=new Date();
  try{ return d.toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}); }
  catch(e){ return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear(); }
}
