// storage.js — persistence, migration, backups, import/export
// module 2/10 of the former renderer.js — classic script (globals shared, no ES modules)

function save(){
  try{
    S.schemaVersion=SCHEMA_VERSION;
    const json=JSON.stringify(S);
    // Primary backend (v2): IndexedDB profileState — write-through, async, never blocks the UI.
    if(typeof dbReady==='function'&&dbReady()){
      try{ dbPut('profileState',{profileId:curProfileId(),state:S}).catch(function(){}); }catch(_){}
    }
    // Resilient fallback/mirror (sync) — keeps data safe if IndexedDB is blocked/unavailable.
    localStorage.setItem(LS_STATE_KEY,json);
    localStorage.setItem(LS_MIRROR_KEY,json);
    maybeBackup(json);                            // daily file backup (Electron)
  }catch(e){
    // storage full / blocked
    try{notify('تعذّر الحفظ — قد تكون الذاكرة ممتلئة','x-circle');}catch(_){}
    console.error('[الاستدراك] save failed:',e);
  }
}
function cleanupOldTasks(){
  const cutoff=Date.now()-30*24*60*60*1000; // 30 days ago
  const before=(S.tasks||[]).length;
  S.tasks=(S.tasks||[]).filter(function(t){
    if(!t.done)return true;          // keep all pending tasks
    return (t.id||0)>cutoff;         // keep done tasks < 30 days old
  });
  const removed=before-S.tasks.length;
  if(removed>0){save();console.info('[Noah] cleanupOldTasks: removed '+removed+' old done tasks');}
}
function parseState(raw){var o=JSON.parse(raw);if(!o||typeof o!=='object'||Array.isArray(o))throw new Error('bad shape');return o;}
// read state from localStorage (primary key → mirror) — returns {loaded, recovered}
function loadFromLocal(){
  let loaded=null,recovered=false;
  try{
    const raw=localStorage.getItem(LS_STATE_KEY)||localStorage.getItem(LS_LEGACY_V3_KEY);
    if(raw)loaded=parseState(raw);
  }catch(e){console.warn('[الاستدراك] primary store corrupt:',e.message);}
  if(!loaded){
    try{
      const m=localStorage.getItem(LS_MIRROR_KEY);
      if(m){loaded=parseState(m);recovered=true;}
    }catch(e){console.warn('[الاستدراك] mirror also corrupt:',e.message);}
  }
  return {loaded:loaded,recovered:recovered};
}
// apply a loaded state into S and render (shared by both sync + async load paths)
function applyState(loaded,recovered){
  if(loaded)S=Object.assign(S,loaded);
  migrate(S);
  cleanupOldTasks();
  if(typeof rolloverRecurring==='function')rolloverRecurring();   // reset due daily/weekly tasks
  document.body.className=S.theme;
  if(S.dark)document.body.classList.add('dark');
  if(typeof applyFontScale==='function')applyFontScale();   // حجم الخط (لقِصَر النظر)
  if(typeof applyHeadFont==='function')applyHeadFont();      // خط العناوين (نمط هادئ اختياري)
  if(typeof applyFeatureVisibility==='function')applyFeatureVisibility();   // وضع التخصيص (إخفاء المزايا)
  if(typeof applyProUI==='function')applyProUI();           // واجهة Pro
  if(typeof applyReduceMotion==='function')applyReduceMotion();   // تقليل الحركة (اختياري — راحة ADHD)
  if(typeof applyCalm==='function')applyCalm();                   // نمط هادئ (اختياري)
  if(typeof applyCustomAccent==='function')applyCustomAccent();   // لون ثيم مخصّص
  if(typeof applyTemplatePattern==='function')applyTemplatePattern();   // زخرفة القالب
  updateDarkBtn();renderThemeDots();refreshAll();
  if(typeof renderSa3iSettings==='function')renderSa3iSettings();   // sync السعي inputs to hydrated config
  if(typeof applyLogo==='function')applyLogo();                     // paint custom app logo (Blob from IndexedDB)
  if(typeof applyBrandLogo==='function')applyBrandLogo();           // الشعار المتفرّع الافتراضي (إن لم يُرفع شعار مخصّص)
  if(typeof adhkarRollover==='function')adhkarRollover();           // reset adhkar daily counters on a new day
  if(typeof refreshProfiles==='function')refreshProfiles();         // load profile list + active name
  // post-load notices (after UI exists)
  setTimeout(function(){
    if(typeof maybeAutoSnapshot==='function'){try{maybeAutoSnapshot();}catch(e){}}   // one auto restore-point per day
    if(typeof checkPrayerReminders==='function'){try{checkPrayerReminders();}catch(e){}}   // fire any due prayer reminder right after load
    var firstRun=!S.onboarded;
    if(firstRun&&typeof startOnboarding==='function'){try{startOnboarding();}catch(e){}}   // first-run / new profile wizard
    if(recovered)notify('تم استرجاع بياناتك من النسخة الاحتياطية ✓','shield-check');
    // طقوس اليوم والتقارير لا تُعرض فوق الجولة التعريفية (مستخدم جديد بلا «أمس» ولا أسبوع سابق)
    if(!firstRun){
      if(typeof maybeShowNiyyah==='function'){try{maybeShowNiyyah();}catch(e){}}
      if(typeof maybeShowMuhasaba==='function'){try{maybeShowMuhasaba();}catch(e){}}
      if(typeof maybeShowWeeklyReport==='function'){try{maybeShowWeeklyReport();}catch(e){}}
      if(typeof recoveryNightCheck==='function'){try{recoveryNightCheck();}catch(e){}}   // تنبيه ليلي لطيف (إن فُعّل رفيق الطُّهر)
    }
    requestNotifyPermission();
    checkExportReminder();
    maybeOfferDiskRestore(!loaded);
    // weekly prayer auto-fetch runs ONCE at boot here (decoupled from theme/re-renders)
    if(S.settings&&S.settings.autoFetch&&S.settings.city&&S.settings.country){ try{fetchPrayerTimes(false);}catch(e){} }
  },400);
}
// sync fallback (kept for safety / non-IDB environments)
function load(){ var r=loadFromLocal(); applyState(r.loaded,r.recovered); }
// async primary path (v2): hydrate from IndexedDB profileState, else fall back to localStorage
function loadAsync(){
  return dbGet('profileState',curProfileId()).then(function(rec){
    if(rec&&rec.state){ applyState(rec.state,false); return; }
    // no IDB record yet → use localStorage, then seed IDB so it becomes the source of truth
    var r=loadFromLocal(); applyState(r.loaded,r.recovered);
    if(r.loaded&&typeof dbReady==='function'&&dbReady()){ try{ dbPut('profileState',{profileId:activeProfileId,state:S}); }catch(e){} }
  }).catch(function(e){
    console.warn('[الاستدراك] loadAsync failed; using localStorage:',e&&e.message);
    var r=loadFromLocal(); applyState(r.loaded,r.recovered);
  });
}
// ---- migration: make any older saved state v10-complete ----
function migrate(s){
  if(!s.habits)s.habits=[];
  if(!s.tasks)s.tasks=[];
  // (أُزيل s.exams — بصفر استخدام؛ المواعيد صارت في s.deadlines)
  if(!s.activityLog)s.activityLog={};
  if(!s.prayerWeek)s.prayerWeek=JSON.parse(JSON.stringify(emptyWeek));
  if(!s.prayerTrack)s.prayerTrack={};
  if(!s.theme)s.theme='t-indigo';
  if(!s.subjectLog)s.subjectLog={gen:0};
  if(typeof s.subjectLog.gen!=='number')s.subjectLog.gen=0;
  // ---- نموذج المساقات (بدل المواد الخمس الثابتة): حقول جديدة تُضاف كسولاً بلا فقدان بيانات ----
  if(!s.subjects||typeof s.subjects!=='object')s.subjects={};
  Object.keys(s.subjects).forEach(function(k,i){
    var c=s.subjects[k]; if(!c||typeof c!=='object'){ delete s.subjects[k]; return; }
    if(typeof c.label!=='string')c.label=k;
    if(typeof c.prog!=='number')c.prog=0;
    if(typeof c.color!=='string')c.color='#64748b';
    if(typeof c.archived!=='boolean')c.archived=false;      // الأرشفة = إخفاء بلا فقدان
    if(typeof c.kind!=='string')c.kind='uni';               // uni | online | self
    if(typeof c.order!=='number')c.order=i;
    if(!Array.isArray(c.units))c.units=[];                  // أسابيع/محاضرات — منها يُحسب التقدّم
    if(typeof s.subjectLog[k]!=='number')s.subjectLog[k]=0;
  });
  if(!s.unlockedBadges)s.unlockedBadges=[];
  if(!s.settings)s.settings={city:'',country:'',method:4,autoFetch:true,lastFetch:''};
  if(!s.goals)s.goals={dailyItems:[],weeklyItems:[],dailyMin:120,weeklyMin:600};
  if(!Array.isArray(s.goals.dailyItems))s.goals.dailyItems=[];
  if(!Array.isArray(s.goals.weeklyItems))s.goals.weeklyItems=[];
  if(!Array.isArray(s.hourLog)||s.hourLog.length!==24)s.hourLog=new Array(24).fill(0);
  if(typeof s.lastWeekTotal!=='number')s.lastWeekTotal=0;
  if(!s.streakMercy||typeof s.streakMercy!=='object')s.streakMercy={week:'',used:false};   // رحمة السلسلة (غفران انقطاع يوم/أسبوع)
  if(!s.taskSortMode)s.taskSortMode='auto';
  // ---- v2 «الاستدراك» customization defaults (gradient/cards, سعي durations, dashboard order, accordion) ----
  if(s.settings){
    if(!s.settings.gradient)s.settings.gradient={on:false,c1:'#5750d8',c2:'#0d9488',intensity:0.16,both:false,target:'bg',angle:135,animate:false};
    else{ if(s.settings.gradient.target==null)s.settings.gradient.target='bg'; if(s.settings.gradient.angle==null)s.settings.gradient.angle=135; if(s.settings.gradient.animate==null)s.settings.gradient.animate=false; }
    if(!s.settings.sa3i)s.settings.sa3i={work:20,brk:5,longBreak:15,rounds:4,autoStart:true,block:100};
    if(s.settings.sa3i&&s.settings.sa3i.block==null)s.settings.sa3i.block=100;   // كتلة السعي
    if(!s.settings.taskAccordion)s.settings.taskAccordion={};
    if(!s.settings.habitView)s.settings.habitView='week';
    // نظام البطاقة الموحّد: حالة الطيّ + ترتيب البطاقات لكل حاوية
    if(!s.settings.cardCollapsed||typeof s.settings.cardCollapsed!=='object')s.settings.cardCollapsed={};
    if(!s.settings.cardOrder||typeof s.settings.cardOrder!=='object')s.settings.cardOrder={};
    if(!s.settings.cardSpan||typeof s.settings.cardSpan!=='object')s.settings.cardSpan={};
    // وضع التركيز: ملء شاشة البرنامج (app) أو ملء شاشة الويندوز (os)
    if(typeof s.settings.focusFullscreen!=='string')s.settings.focusFullscreen='app';
    if(!s.settings.courseOpen||typeof s.settings.courseOpen!=='object')s.settings.courseOpen={};   // أي مساق مفتوح بمدير المساقات
    if(typeof s.settings.showArchivedCourses!=='boolean')s.settings.showArchivedCourses=false;
    if(typeof s.settings.lightLoad!=='boolean')s.settings.lightLoad=false;   // «وضع الإجازة» — اختياري مُطفأ
  }
  // ---- الفصل الدراسي + المواعيد المتعددة (بدل عدّاد امتحان واحد) ----
  if(!s.term||typeof s.term!=='object')s.term={name:'',start:'',end:''};
  if(!Array.isArray(s.deadlines))s.deadlines=[];
  s.deadlines.forEach(function(d){
    if(typeof d.kind!=='string')d.kind='exam';    // exam | assign | other
    if(typeof d.time!=='string')d.time='08:00';
    if(typeof d.done!=='boolean')d.done=false;
    if(typeof d.subject!=='string')d.subject='';
  });
  // ترحيل لمرّة واحدة: عدّاد «الثانوية العامة» القديم → موعد ضمن القائمة الجديدة (بلا فقدان)
  if(s.settings&&!s.settings.examMigrated){
    if(s.settings.examDay){
      s.deadlines.push({
        id:Date.now(), title:s.settings.examName||'امتحان',
        date:s.settings.examDay, time:s.settings.examTime||'08:00',
        kind:'exam', subject:'', done:false
      });
    }
    s.settings.examMigrated=true;
  }
  // ---- Phase 4 «الغاية» defaults (Quran/Qiyam/Adhkar/prayer reminders) ----
  if(!s.quran)s.quran={khatmaPages:0,khatmaCount:0,log:{}};
  if(!s.quran.log)s.quran.log={};
  if(!Array.isArray(s.quran.reads))s.quran.reads=[];   // تسجيل القرآن بالسورة والآيات
  if(!s.qiyam)s.qiyam={log:{}};
  if(!s.qiyam.log)s.qiyam.log={};
  if(!Array.isArray(s.adhkar))s.adhkar=[];
  if(!s.adhkarLog||typeof s.adhkarLog!=='object')s.adhkarLog={};   // سجلّ يومي إجمالي للأذكار
  if(!s.prayerNotified)s.prayerNotified={};
  if(!s.worship)s.worship={preReminder:true,preMin:10,adhanOn:false};
  // ---- الدرجات وجدول المحاضرات (صارا مُستعمَلين فعلاً في 10.9.0: grades.js + schedule.js) ----
  // الدرجات المجمّعة والتقدير والساعات تعيش على كائن المساق نفسه (marks/letter/credits) — تُهيّأ كسولاً.
  if(!s.schedule||typeof s.schedule!=='object'||Array.isArray(s.schedule))s.schedule={};
  DAYS.forEach(function(d){ if(!Array.isArray(s.schedule[d]))s.schedule[d]=[]; });
  Object.keys(s.subjects||{}).forEach(function(k){
    var c=s.subjects[k]; if(!c||typeof c!=='object')return;
    if(typeof c.credits!=='number')c.credits=3;      // ساعات معتمدة
    if(typeof c.letter!=='string')c.letter='';       // التقدير النهائي (سُلّم ٤٫٠)
    if(!Array.isArray(c.marks))c.marks=[];           // تقييمات الترم بأوزانها
  });
  // ---- Phase 7 (onboarding + profiles): infer onboarded from real data so existing users skip the wizard ----
  // ---- مِنهاج اليوم: طقس اليوم ----
  if(!s.niyyah||typeof s.niyyah!=='object')s.niyyah={date:'',items:['','','']};
  if(!Array.isArray(s.niyyah.items)||s.niyyah.items.length!==3)s.niyyah.items=['','',''];
  if(!s.muhasaba||typeof s.muhasaba!=='object')s.muhasaba={date:'',done:'',note:''};
  if(!s.energyToday||typeof s.energyToday!=='object')s.energyToday={date:'',level:''};
  if(typeof s.weeklyReportShown!=='string')s.weeklyReportShown='';
  // ---- جولة 2: مرشد دراسي + سكينة ----
  if(!s.srs||typeof s.srs!=='object')s.srs={};                 // المراجعة المتباعدة لكل مادة
  Object.keys(s.subjects||{}).forEach(function(k){ if(!s.srs[k])s.srs[k]={mastery:3,lastReview:''}; });
  if(!s.deepTip||typeof s.deepTip!=='object')s.deepTip={week:'',text:''};
  (s.tasks||[]).forEach(function(t){ if(typeof t.highYield!=='boolean')t.highYield=false; });   // وسم 80/20
  // ---- جولة 3 ----
  if(!s.dayPlan||typeof s.dayPlan!=='object')s.dayPlan={date:'',periods:{}};
  if(!s.dayPlan.periods||typeof s.dayPlan.periods!=='object')s.dayPlan.periods={};
  if(typeof s.lastXPLevel!=='number')s.lastXPLevel=1;
  if(!s.recovery||typeof s.recovery!=='object')s.recovery={enabled:false,startDate:'',bestStreak:0,totalResets:0,lastReset:'',plan:{triggers:'',actions:''}};
  if(!s.recovery.plan||typeof s.recovery.plan!=='object')s.recovery.plan={triggers:'',actions:''};
  if(!Array.isArray(s.recovery.urges))s.recovery.urges=[];                 // D: سجل المحفّزات
  if(!s.recovery.lessons||typeof s.recovery.lessons!=='object')s.recovery.lessons={lastDate:'',streak:0};  // E
  if(!s.confidence||typeof s.confidence!=='object')s.confidence={wins:[]}; // C: استعادة الثقة
  if(!Array.isArray(s.confidence.wins))s.confidence.wins=[];
  if(!s.sport||typeof s.sport!=='object')s.sport={entries:[]};            // الرياضة: تمارين (اسم + عدّات)
  if(!Array.isArray(s.sport.entries))s.sport.entries=[];
  if(s.settings&&typeof s.settings.companion!=='boolean')s.settings.companion=false; // F: الرفيق الصامت
  if(s.settings){
    if(typeof s.settings.examDay!=='string')s.settings.examDay='';      // تاريخ أول امتحان ثانوية (للعدّاد)
    if(typeof s.settings.examName!=='string')s.settings.examName='الثانوية العامة';
    if(typeof s.settings.examTime!=='string')s.settings.examTime='08:00';   // ساعة الامتحان (للعدّ بالأيام والساعات)
    if(typeof s.settings.fontScale!=='string')s.settings.fontScale='normal'; // normal|large|xlarge
    if(typeof s.settings.headFont!=='string')s.settings.headFont='sans';      // sans|serif — خط العناوين (نمط هادئ اختياري)
    if(typeof s.settings.calm!=='boolean')s.settings.calm=false;               // نمط هادئ (مساحات + بطاقات أهدأ) — اختياري مُطفأ
    if(typeof s.settings.timerStyle!=='string')s.settings.timerStyle='ring';  // ring|disc|hourglass|clock
    if(typeof s.settings.timerShowNum!=='boolean')s.settings.timerShowNum=true;
    if(typeof s.settings.template!=='string')s.settings.template='';     // قالب الهوية البصرية
    if(!Array.isArray(s.settings.hidden))s.settings.hidden=[];           // مزايا مخفية (وضع التخصيص)
    if(typeof s.settings.proUI!=='boolean')s.settings.proUI=false;       // واجهة Pro الاحترافية
    if(typeof s.settings.customAccent!=='string')s.settings.customAccent='';   // لون ثيم مخصّص
    if(typeof s.settings.gridDense!=='boolean')s.settings.gridDense=true;      // الرصّ التلقائي للبطاقات
    if(!s.settings.tileHidden||typeof s.settings.tileHidden!=='object')s.settings.tileHidden={};   // بنك الأيقونات
    // تنظيف tileHidden: (أ) مفاتيح قديمة بلا بادئة pageId:: · (ب) عناوين بطاقات محذوفة نهائياً
    var _rmLbls={'الصلاة القادمة':1,'بطاقة المراجعة':1,'نظرة سريعة على اليوم':1,'كلمة اليوم':1,'سجل الجلسات':1,'تسجيل بالسورة والآيات':1,'تنبيهات الصلاة':1,'نور اليوم':1,'التقويم والقبلة':1};
    Object.keys(s.settings.tileHidden).forEach(function(k){
      if(k.indexOf('::')===-1||_rmLbls[s.settings.tileHidden[k]])delete s.settings.tileHidden[k];
    });
    // تنظيف settings.hidden: حذف معرّفات مزايا غير معروفة (وقاية من اختفاء عناصر حيّة كعدّاد الامتحان والطاقة/النية)
    if(Array.isArray(s.settings.hidden)){
      var _vf={'praytrack':1,'quran':1,'qiyam':1,'habits':1,'pomodoro':1,'tasks':1,'sport':1,'braindump':1,'progress':1,'stats':1,'xp':1,'exam-countdown':1,'rituals':1,'prayerbar':1,'sakina':1};
      s.settings.hidden=s.settings.hidden.filter(function(id){return !!_vf[id];});
    }
    // تنظيف cardOrder: حذف مفاتيح بلا :: أو مصفوفات فارغة (تمنع حشو البيانات القديمة)
    if(s.settings.cardOrder&&typeof s.settings.cardOrder==='object'){
      Object.keys(s.settings.cardOrder).forEach(function(c){
        var a=s.settings.cardOrder[c];
        if(!Array.isArray(a)){delete s.settings.cardOrder[c];return;}
        s.settings.cardOrder[c]=a.filter(function(k){return k&&k.indexOf('::')>=0;});
        if(!s.settings.cardOrder[c].length)delete s.settings.cardOrder[c];
      });
    }
  }
  if(typeof s.profileName!=='string')s.profileName='';
  if(s.onboarded==null){
    var hasData=(s.sessions>0)||(s.totalMin>0)||((s.tasks||[]).length>0)||((s.habits||[]).length>0)||(Object.keys(s.activityLog||{}).length>0);
    s.onboarded=!!hasData;
  }
  s.schemaVersion=SCHEMA_VERSION;
}
function exportData(){
  const json=JSON.stringify(S,null,2);
  const fname='noah-study-'+new Date().toISOString().slice(0,10)+'.json';
  S.lastExportDate=new Date().toISOString();save();
  if(window.noahAPI&&window.noahAPI.exportDialog){
    window.noahAPI.exportDialog(json,fname).then(function(res){
      if(res&&res.ok)notify('تم حفظ النسخة ✓','check-circle');
      else if(res&&!res.canceled)notify('تعذّر الحفظ','x-circle');
    }).catch(function(){ notify('تعذّر الحفظ','x-circle'); });
  }else{
    const blob=new Blob([json],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=fname;a.click();
    notify('تم الحفظ المحلي','check-circle');
  }
}
function importData(e){
  var f=e.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(ev){
    try{
      var obj=parseState(ev.target.result);
      S=Object.assign({},S,obj);migrate(S);save();
      document.body.className=S.theme;document.body.classList.toggle('dark',!!S.dark);
      updateDarkBtn();renderThemeDots();refreshAll();
      notify('تم الاستيراد بنجاح','check-circle');
    }catch(err){notify('ملف غير صالح','x-circle');}
  };
  r.readAsText(f);
}

// ===== BACKUPS (Electron disk) + REMINDERS =====
function maybeBackup(json){
  try{
    if(!(window.noahAPI&&window.noahAPI.backupData))return;
    const today=new Date().toISOString().slice(0,10);
    if(S.lastBackupDate===today)return;       // one disk backup per day
    S.lastBackupDate=today;                    // set in-memory (persists on next save)
    window.noahAPI.backupData(json).catch(function(){});
  }catch(e){}
}
function backupNow(){
  if(!(window.noahAPI&&window.noahAPI.backupData)){ notify('النسخ على القرص متاح في تطبيق سطح المكتب فقط','info'); return; }
  window.noahAPI.backupData(JSON.stringify(S)).then(function(res){
    if(res&&res.ok){ S.lastBackupDate=new Date().toISOString().slice(0,10); updateBackupStatus(); notify('تم حفظ نسخة احتياطية على جهازك ✓','shield-check'); }
    else notify('تعذّر النسخ الاحتياطي','x-circle');
  }).catch(function(){ notify('تعذّر النسخ الاحتياطي','x-circle'); });
}
function openBackupsFolder(){ if(window.noahAPI&&window.noahAPI.openBackupsFolder)window.noahAPI.openBackupsFolder(); else notify('متاح في تطبيق سطح المكتب فقط','info'); }
function doRestore(){
  if(!(window.noahAPI&&window.noahAPI.readBackup)){ notify('متاح في تطبيق سطح المكتب فقط','info'); return; }
  window.noahAPI.readBackup(null).then(function(res){
    if(!res||!res.ok){ notify('لا توجد نسخ احتياطية محفوظة','x-circle'); return; }
    try{
      const obj=parseState(res.content);
      S=Object.assign({},S,obj);migrate(S);save();
      document.body.className=S.theme;document.body.classList.toggle('dark',!!S.dark);
      updateDarkBtn();renderThemeDots();refreshAll();
      notify('تمت الاستعادة من '+(res.name||'النسخة')+' ✓','shield-check');
    }catch(e){ notify('النسخة الاحتياطية تالفة','x-circle'); }
  }).catch(function(){ notify('تعذّرت الاستعادة','x-circle'); });
}
function restoreFromBackup(){
  if(!(window.noahAPI&&window.noahAPI.readBackup)){ notify('متاح في تطبيق سطح المكتب فقط','info'); return; }
  askConfirm('استعادة أحدث نسخة احتياطية؟ سيتم استبدال بياناتك الحالية بها.',doRestore,{confirmText:'نعم، استعد',danger:false});
}
function updateBackupStatus(){
  const el=document.getElementById('backup-status'); if(!el)return;
  el.textContent=S.lastBackupDate?('آخر نسخة تلقائية: '+S.lastBackupDate):'يحفظ نسخة يومية تلقائياً على جهازك';
}
function maybeOfferDiskRestore(wasEmpty){
  if(!wasEmpty)return;
  if(!(window.noahAPI&&window.noahAPI.readBackup))return;
  // only offer if the newest backup actually contains real data (avoids prompting over empty/test backups)
  window.noahAPI.readBackup(null).then(function(res){
    if(!res||!res.ok)return;
    try{
      const o=parseState(res.content);
      const hasData=(o.sessions||0)>0||(o.totalMin||0)>0||(o.tasks&&o.tasks.length)||(o.habits&&o.habits.length);
      if(hasData)askConfirm('وُجدت نسخة احتياطية على جهازك تحتوي على بياناتك. هل تريد استعادتها؟',doRestore,{confirmText:'استعادة',danger:false});
    }catch(e){}
  }).catch(function(){});
}
function checkExportReminder(){
  if(exportReminderShown)return; exportReminderShown=true;
  const last=S.lastExportDate?new Date(S.lastExportDate):null;
  const days=last?((Date.now()-last.getTime())/86400000):999;
  const hasData=(S.sessions||0)>0||(S.tasks||[]).length>0||(S.habits||[]).length>0;
  if(hasData&&days>7){
    setTimeout(function(){ notify('💾 لم تُصدّر نسخة منذ أكثر من أسبوع — يُنصح بحفظ نسخة','info'); },3000);
  }
}
