// stats.js — progress, heatmap, calendar, XP, achievements, analytics, exams
// module 7/10 of the former renderer.js — classic script (globals shared, no ES modules)


// XP
// رحلة العلم — مسارات الارتقاء (درجات)
// عتبات أصعب (~٣×) كي لا تُبلغ القمة في شهر — القمة تستحق سنة من السعي
const XP_LEVELS=[
  {min:0,     max:500,   label:'طالب',    lv:1},
  {min:500,   max:1400,  label:'متعلّم',  lv:2},
  {min:1400,  max:3200,  label:'مجتهد',   lv:3},
  {min:3200,  max:6500,  label:'درّاسة',  lv:4},
  {min:6500,  max:12000, label:'حافظ',    lv:5},
  {min:12000, max:20000, label:'راسخ',    lv:6},
  {min:20000, max:32000, label:'عالِم',   lv:7},
  {min:32000, max:999999,label:'متفقّه', lv:8}
];
// رحلة العلم — درجات موزّعة بعدلٍ عبر أبعاد حياة المستخدم (دراسة + عبادة + التزام)
// رحلة السعي — «الصلاة في القمة»: درجات مفصّلة بحسب حال الصلاة، ثم باقي أبعاد الحياة
var PRAYER_XP={jama3a:15,solo:10,late:6,qada:4,missed:0};
function getXP(){
  var habitDone=0;(S.habits||[]).forEach(function(h){habitDone+=Object.keys(h.log||{}).length;});
  // الصلاة بالتفصيل: جماعة 15 · فذّ 10 · متأخر 6 · قضاء 4 + مكافأة يومٍ كامل جماعةً (+25)
  var prayerXP=0, fullJamaaDays=0; var pt=S.prayerTrack||{};
  Object.keys(pt).forEach(function(dk){
    var dayJ=0;
    PRAYER_KEYS.forEach(function(k){ var v=pt[dk]&&pt[dk][k]; if(v&&PRAYER_XP[v.status]!=null){ prayerXP+=PRAYER_XP[v.status]; if(v.status==='jama3a')dayJ++; } });
    if(dayJ>=5)fullJamaaDays++;
  });
  prayerXP+=fullJamaaDays*25;
  var quranPages=0; var ql=(S.quran&&S.quran.log)||{}; Object.keys(ql).forEach(function(dk){quranPages+=(ql[dk]||0);});
  var qiyamNights=Object.keys((S.qiyam&&S.qiyam.log)||{}).length;
  var sportSessions=((S.sport&&S.sport.entries)||[]).length;
  var doneTasks=(S.tasks||[]).filter(function(t){return t.done;}).length;
  return Math.round(
    prayerXP +                 // الصلاة أولاً وفي القمة
    (S.totalMin||0)*1 +        // دقيقة دراسة (الساعة = 60)
    (S.sessions||0)*4 +        // جلسة جِدّ مكتملة
    doneTasks*8 +              // واجب مُنجَز
    habitDone*4 +              // عادة مُسجَّلة
    quranPages*3 +             // صفحة قرآن (أقل من أي صلاة — منطقية النِّسب)
    qiyamNights*8 +            // ليلة قيام
    sportSessions*2 +          // تمرين رياضي
    (S.streak||0)*10           // مكافأة السلسلة
  );
}
function xpLevelOf(xp){ var lvl=XP_LEVELS[0]; for(var i=0;i<XP_LEVELS.length;i++){if(xp>=XP_LEVELS[i].min)lvl=XP_LEVELS[i];} return lvl; }
// صفحة «رحلة العلم» — شرح كامل لنظام الدرجات
function renderXP(){
  var el=document.getElementById('xp-page-body'); if(!el)return;
  var xp=getXP(), lvl=xpLevelOf(xp), pct=Math.min(100,Math.round((xp-lvl.min)/(lvl.max-lvl.min)*100));
  var sources=[
    ['check-circle-2','صلاة جماعة','15 درجة'],['check-circle-2','صلاة فذّ (في وقتها)','10 درجات'],
    ['clock','صلاة متأخرة','6 درجات'],['rotate-ccw','قضاء صلاة فائتة','4 درجات'],
    ['star','يوم كامل جماعةً (الخمس)','+25 درجة'],
    ['moon','ليلة قيام','8 درجات'],['book','صفحة قرآن','3 درجات'],
    ['check-square','واجب مُنجَز','8 درجات'],['timer','جلسة جِدّ مكتملة','4 درجات'],
    ['book-open','دقيقة دراسة','1 درجة'],['repeat','عادة مُسجَّلة','4 درجات'],
    ['dumbbell','تمرين رياضي','2 درجة'],['flame','كل يوم في السلسلة','10 درجات']
  ];
  var srcHtml=sources.map(function(s){ return '<div class="xps-row"><i data-lucide="'+s[0]+'"></i><span class="xps-act">'+s[1]+'</span><span class="xps-pts">+'+s[2]+'</span></div>'; }).join('');
  var lvlHtml=XP_LEVELS.map(function(L){
    var cur=L.lv===lvl.lv;
    var mx=L.max>=999999?'∞':L.max;
    return '<div class="xpl-row'+(cur?' cur':'')+'"><span class="xpl-badge">'+L.lv+'</span>'+
      '<span class="xpl-name">'+L.label+'</span>'+
      '<span class="xpl-range">'+L.min+' – '+mx+'</span>'+(cur?'<span class="xpl-here">أنت هنا</span>':'')+'</div>';
  }).join('');
  el.innerHTML=
    '<div class="card xp-hero" data-cid="xp-hero"><div class="xp-hero-badge">'+lvl.lv+'</div>'+
      '<div class="xp-hero-main"><div class="xp-hero-label">'+lvl.label+'</div>'+
        '<div class="xp-hero-bar"><div class="xp-hero-fill" style="width:'+pct+'%"></div></div>'+
        '<div class="xp-hero-text">'+xp+' درجة · '+(lvl.max>=999999?'أعلى مرتبة 🌟':('باقٍ '+(lvl.max-xp)+' للمستوى التالي'))+'</div></div></div>'+
    '<div class="card" data-cid="xp-earn"><div class="card-title"><i data-lucide="plus-circle"></i> كيف تكسب الدرجات؟</div><div class="xps-list">'+srcHtml+'</div>'+
      '<div class="setting-sub" style="margin-top:.6rem">درجاتك تشمل حياتك كلها — لا الدراسة وحدها. العبادة والالتزام جزءٌ من رحلتك.</div></div>'+
    '<div class="card" data-cid="xp-levels"><div class="card-title"><i data-lucide="trophy"></i> مراتب الرحلة (٨ مستويات)</div><div class="xpl-list">'+lvlHtml+'</div></div>';
  icons();
}
function updateXP(){
  var xp=getXP(), lvl=xpLevelOf(xp);
  var pct=Math.min(100,Math.round((xp-lvl.min)/(lvl.max-lvl.min)*100));
  var _b=document.getElementById('xp-badge'); if(_b)_b.textContent=lvl.lv;
  var _l=document.getElementById('xp-label'); if(_l)_l.textContent=lvl.label;
  var _bar=document.getElementById('xp-bar'); if(_bar)_bar.style.width=pct+'%';
  var _t=document.getElementById('xp-text'); if(_t)_t.textContent=xp+' / '+lvl.max+' درجة';
  // احتفال ترقّي المستوى (مرّة واحدة)
  if(typeof S.lastXPLevel==='number'){
    if(lvl.lv>S.lastXPLevel){ S.lastXPLevel=lvl.lv; try{save();}catch(e){}
      try{ showBadgePopup({emoji:'🎓',name:'ارتقيتَ في رحلة السعي!',desc:'أصبحتَ الآن: '+lvl.label+' — '+withName('واصِل')}); }catch(e){}
    } else if(lvl.lv<S.lastXPLevel){ S.lastXPLevel=lvl.lv; }
  } else { S.lastXPLevel=lvl.lv; }
}
function _setTxt(id,v){ var el=document.getElementById(id); if(el)el.textContent=arDigits(v); }
function updateStats(){
  try{updateXP();}catch(e){}
  var tk=todayKey();
  // اليوم
  _setTxt('st-time',(S.activityLog&&S.activityLog[tk])||0);            // إصلاح: «دقائق اليوم» كانت تعرض الإجمالي الكلّي (totalMin)
  var hd=(S.habits||[]).filter(function(h){return h.log&&h.log[tk];}).length;
  _setTxt('st-habits',hd);
  var pt=(S.prayerTrack&&S.prayerTrack[tk])||{}, onT=0;
  PRAYER_KEYS.forEach(function(k){ var st=(pt[k]&&pt[k].status); if(st==='jama3a'||st==='solo')onT++; });
  _setTxt('st-pray-today',onT+'/5');
  // الأسبوع
  _setTxt('st-week',(S.weekData||[0,0,0,0,0,0,0]).reduce(function(a,b){return a+b;},0));
  // الإجمالي
  _setTxt('st-pomo',S.sessions||0);
  _setTxt('st-streak',S.streak||0);
  _setTxt('st-tasks',(S.tasks||[]).filter(function(t){return t.done;}).length);
  if(typeof applyWarmth==='function')applyWarmth();   // دفء بصري يتزايد مع إنجاز اليوم
}
/* updateGoalBar is defined once in the GOALS section below (uses goal-daily-min) */


// Progress — انتقل بالكامل إلى courses.js (نموذج المساقات الديناميكي):
// renderProgress/progHeatColor + editSubject→courseRename + updateProg→courseSetProg + clickProg→courseClickProg

// Heatmap / Week / Calendar
function renderHeatmap(){var hm=document.getElementById('heatmap');hm.innerHTML='';var now=new Date();for(var i=90;i>=0;i--){var d=new Date(now);d.setDate(d.getDate()-i);var key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();var v=S.activityLog[key]||0,lvl=v===0?0:v<20?1:v<40?2:v<60?3:4;var cell=document.createElement('div');cell.className='hm-cell hm-'+lvl;cell.title=d.toLocaleDateString('ar-EG')+': '+v+' دقيقة';hm.appendChild(cell);}}
function renderWeekChart(){var chart=document.getElementById('week-chart');if(!chart)return;var days=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];var wd=S.weekData||[0,0,0,0,0,0,0],max=Math.max(1,...wd);chart.innerHTML=WEEK_ORDER.map(function(i){var v=wd[i]||0;var h=Math.round(v/max*80);return '<div class="week-bar-wrap"><div class="week-val">'+v+'</div><div class="week-bar" style="height:'+h+'px"></div><div class="week-lbl">'+days[i]+'</div></div>';}).join('');}
function renderCalendar(){var today=new Date(),sow=new Date(today);sow.setDate(today.getDate()-((today.getDay()+1)%7)+calOffset*7);var _cwl=document.getElementById('cal-week-label');if(_cwl)_cwl.innerHTML='<bdi>'+sow.toLocaleDateString('ar-EG',{month:'long',year:'numeric'})+'</bdi>';var grid=document.getElementById('cal-grid');if(!grid)return;grid.innerHTML='';for(var i=0;i<7;i++){var d=new Date(sow);d.setDate(sow.getDate()+i);var key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();var isT=key===todayKey(),mins=(S.activityLog[key]||0),has=mins>0;var future=d>today&&!isT;var cell=document.createElement('div');cell.className='cal-day'+(isT?' today':'')+(has?' study':'')+(future?' future':'');cell.innerHTML='<span>'+d.getDate()+'</span>'+(has?'<span class="cal-dot"></span>':'');cell.title=mins+' دقيقة — اضغط لتعديل اليوم كاملاً';if(!future){cell.style.cursor='pointer';cell.setAttribute('onclick','openDayEditor(\''+key+'\')');}grid.appendChild(cell);}}
/* (حُذف editDayLog — حلّ محلّه محرّر اليوم الشامل openDayEditor) */
// (حُذف prevWeek/nextWeek — كانا ميتين؛ تقويم calOffset/renderCalendar القديم أُزيل)

// ===== محرّر اليوم الشامل («آلة الزمن»): دراسة + قرآن + أذكار + قيام + صلوات + عادات بأثر رجعي =====
var PT_STATUS_OPTS=[['none','—'],['jama3a','جماعة'],['solo','فذّ'],['late','متأخر'],['qada','قضاء'],['missed','فاتت']];
function openDayEditor(dk){
  var ov=document.getElementById('dayedit-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='dayedit-overlay'; ov.className='ritual-overlay'; document.body.appendChild(ov);
    ov.addEventListener('click',function(e){ if(e.target===ov)closeDayEditor(); }); }
  var mins=(S.activityLog&&S.activityLog[dk])||0;
  var quran=(S.quran&&S.quran.log&&S.quran.log[dk])||0;
  var qy=(S.qiyam&&S.qiyam.log&&S.qiyam.log[dk]); var rak=qy?(qy.rakahs||0):0;
  // الأذكار: تعديل كل ذِكر على حدة (بطلب المستخدم) — وإلا الإجمالي إن لم توجد أذكار معرّفة
  var adkList=(S.adhkar||[]), adkDay=(S.adhkarDayLog&&S.adhkarDayLog[dk])||{};
  var adkRows=adkList.length?adkList.map(function(a){
    return '<label class="de-field"><span style="border-inline-start:3px solid '+a.color+';padding-inline-start:6px">'+esc(a.name)+'</span><input type="number" min="0" id="de-adk-'+a.id+'" value="'+(adkDay[a.id]||0)+'"></label>';
  }).join(''):'<label class="de-field"><span><i data-lucide="heart"></i> إجمالي تسبيحات الأذكار</span><input type="number" min="0" id="de-adhkar" value="'+((S.adhkarLog&&S.adhkarLog[dk])||0)+'"></label>';
  var pt=(S.prayerTrack&&S.prayerTrack[dk])||{};
  var prayRows=PRAYER_KEYS.map(function(k){
    var st=(pt[k]&&pt[k].status)||'none';
    var opts=PT_STATUS_OPTS.map(function(o){ return '<option value="'+o[0]+'"'+(st===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('');
    return '<div class="de-pray-row"><span>'+PRAYER_AR[k]+'</span><select id="de-pray-'+k+'">'+opts+'</select></div>';
  }).join('');
  var habRows=(S.habits||[]).map(function(h){
    var on=!!(h.log&&h.log[dk]);
    return '<label class="de-habit"><input type="checkbox" id="de-hab-'+h.id+'"'+(on?' checked':'')+'> '+esc(h.name)+'</label>';
  }).join('')||'<span class="setting-sub">لا عادات بعد</span>';
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal ritual-modal-wide"><div class="ritual-header">'+
      '<div class="ritual-icon">🕰️</div><div class="ritual-title">تعديل يوم '+dk+'</div>'+
      '<div class="ritual-sub">عدّل أي شيء بأثر رجعي — نسيت تسجّل؟ لا بأس، ينعكس فوراً على كل الإحصائيات</div></div>'+
    '<div class="ritual-body de-body">'+
      '<div class="de-grid">'+
        '<label class="de-field"><span><i data-lucide="clock"></i> دقائق الدراسة</span><input type="number" min="0" id="de-mins" value="'+mins+'"></label>'+
        '<label class="de-field"><span><i data-lucide="book-open"></i> صفحات القرآن</span><input type="number" min="0" id="de-quran" value="'+quran+'"></label>'+
        '<label class="de-field"><span><i data-lucide="moon"></i> ركعات القيام</span><input type="number" min="0" id="de-qiyam" value="'+rak+'"></label>'+
      '</div>'+
      '<div class="de-sec"><i data-lucide="heart"></i> الأذكار</div><div class="de-grid de-grid-adk">'+adkRows+'</div>'+
      '<div class="de-sec"><i data-lucide="check-circle-2"></i> الصلوات الخمس</div><div class="de-prays">'+prayRows+'</div>'+
      '<div class="de-sec"><i data-lucide="repeat"></i> العادات</div><div class="de-habits">'+habRows+'</div>'+
    '</div>'+
    '<div class="ritual-foot"><button class="btn pri" onclick="saveDayEditor(\''+dk+'\')"><i data-lucide="check"></i> حفظ اليوم</button>'+
      '<button class="btn ghost" onclick="closeDayEditor()">إلغاء</button></div></div>';
  icons();
}
function closeDayEditor(){ var ov=document.getElementById('dayedit-overlay'); if(ov)ov.style.display='none'; }
function saveDayEditor(dk){
  function num(id){ var el=document.getElementById(id); return Math.max(0,parseInt(el&&el.value)||0); }
  var mins=num('de-mins'); if(mins===0)delete S.activityLog[dk]; else S.activityLog[dk]=mins;
  var qp=num('de-quran'); if(!S.quran)S.quran={khatmaPages:0,khatmaCount:0,log:{}}; if(!S.quran.log)S.quran.log={};
  if(qp===0)delete S.quran.log[dk]; else S.quran.log[dk]=qp;
  // الأذكار: لكل ذِكر (يحدّث الإجمالي تلقائياً) — وإلا الإجمالي المباشر
  if((S.adhkar||[]).length&&typeof adhkarDayLogObj==='function'){
    var L=adhkarDayLogObj(); if(!L[dk])L[dk]={};
    (S.adhkar||[]).forEach(function(a){ var el=document.getElementById('de-adk-'+a.id); var n=Math.max(0,parseInt(el&&el.value)||0); if(n<=0)delete L[dk][a.id]; else L[dk][a.id]=n; });
    if(typeof adhkarRecomputeDay==='function')adhkarRecomputeDay(dk);
  } else { var ad=num('de-adhkar'); if(!S.adhkarLog)S.adhkarLog={}; if(ad===0)delete S.adhkarLog[dk]; else S.adhkarLog[dk]=ad; }
  var rk=num('de-qiyam'); if(!S.qiyam)S.qiyam={log:{}}; if(!S.qiyam.log)S.qiyam.log={};
  var oldQ=S.qiyam.log[dk]||{}; if(rk===0&&!(oldQ.witr))delete S.qiyam.log[dk]; else S.qiyam.log[dk]={rakahs:rk,witr:oldQ.witr||0};
  if(!S.prayerTrack)S.prayerTrack={};
  PRAYER_KEYS.forEach(function(k){
    var sel=document.getElementById('de-pray-'+k); var v=sel?sel.value:'none';
    if(v==='none'){ if(S.prayerTrack[dk])delete S.prayerTrack[dk][k]; }
    else { if(!S.prayerTrack[dk])S.prayerTrack[dk]={}; S.prayerTrack[dk][k]={status:v}; }
  });
  if(S.prayerTrack[dk]&&!Object.keys(S.prayerTrack[dk]).length)delete S.prayerTrack[dk];
  (S.habits||[]).forEach(function(h){
    var chk=document.getElementById('de-hab-'+h.id); if(!chk)return;
    if(!h.log)h.log={};
    if(chk.checked)h.log[dk]=true; else delete h.log[dk];
  });
  save(); closeDayEditor();
  try{ refreshAll(); }catch(e){}
  notify('حُفظ يوم '+dk+' — انعكس على كل الإحصائيات ✓','check-circle');
}

// (حُذف نظام الامتحانات المتعدّدة بالكامل — العدّاد الرئيسي renderExamCountdown يكفي.
//  كان setInterval له يدور كل ثانية على الفاضي.)

// ===== تقرير PDF شامل (نُقل من study.js المحذوفة — يُستدعى من Ctrl+K) =====
function renderStudyReport(){
  var el=document.getElementById('print-report'); if(!el)return;
  var totalMin=S.totalMin||0, sessions=S.sessions||0, streak=S.streak||0;
  var weekMin=(S.weekData||[0,0,0,0,0,0,0]).reduce(function(a,b){return a+b;},0);
  var doneTasks=(S.tasks||[]).filter(function(t){return t.done;}).length;
  var c={ok:0,total:0},pt=S.prayerTrack||{};
  Object.keys(pt).forEach(function(dk){PRAYER_KEYS.forEach(function(k){if(pt[dk][k]){var st=pt[dk][k].status;if(st&&st!=='none'){c.total++;if(st==='jama3a'||st==='solo')c.ok++;}}});});
  var prayerRate=c.total?Math.round(c.ok/c.total*100):0;
  var _sk=(typeof courseActive==='function')?courseActive():Object.keys(S.subjects||{});
  var subjRows=_sk.map(function(k){var p=(typeof courseProg==='function')?courseProg(k):(S.subjects[k].prog||0);return '<tr><td>'+esc(subjLabel(k))+'</td><td>'+p+'%</td><td>'+((S.subjectLog&&S.subjectLog[k])||0)+' د</td></tr>';}).join('');
  var d=new Date();
  el.innerHTML=
    '<div class="pr-head"><h1>تقرير «'+APP_NAME+'»'+(userName()?' — '+esc(userName()):'')+'</h1><div class="pr-date">'+formatIslamicDate(d)+'</div></div>'+
    '<div class="pr-cards">'+
      '<div class="pr-card"><b>'+totalMin+'</b><span>إجمالي دقائق السعي</span></div>'+
      '<div class="pr-card"><b>'+sessions+'</b><span>جلسات السعي</span></div>'+
      '<div class="pr-card"><b>'+streak+'</b><span>أيام متتالية</span></div>'+
      '<div class="pr-card"><b>'+weekMin+'</b><span>دقائق الأسبوع</span></div>'+
      '<div class="pr-card"><b>'+doneTasks+'</b><span>مهام منجزة</span></div>'+
      '<div class="pr-card"><b>'+prayerRate+'%</b><span>صلاة في وقتها</span></div>'+
    '</div>'+
    '<h2>تقدّم المواد</h2><table class="pr-table"><tr><th>المادة</th><th>الإنجاز</th><th>وقت الدراسة</th></tr>'+subjRows+'</table>'+
    '<div class="pr-foot">تقرير مولّد محلياً من تطبيق «'+APP_NAME+'» · '+d.toLocaleString('ar-EG')+'</div>';
}
function exportReport(){ renderStudyReport(); document.body.classList.add('printing'); setTimeout(function(){ window.print(); setTimeout(function(){document.body.classList.remove('printing');},400); },120); }

// ===== ACHIEVEMENTS =====
var ACHIEVEMENTS=[
  {id:'first_session',emoji:'🎯',name:'الجلسة الأولى',desc:'أكملت أول جلسة سعي',check:function(s){return s.sessions>=1;}},
  {id:'sessions_10',emoji:'🔥',name:'عشر جلسات',desc:'أكملت ١٠ جلسات',check:function(s){return s.sessions>=10;}},
  {id:'sessions_50',emoji:'💎',name:'خمسون جلسة',desc:'أكملت ٥٠ جلسة',check:function(s){return s.sessions>=50;}},
  {id:'hour_study',emoji:'⏰',name:'ساعة كاملة',desc:'درست ساعة في يوم واحد',check:function(s){var today=Object.keys(s.activityLog||{}).find(function(k){return (s.activityLog[k]||0)>=60;});return !!today;}},
  {id:'streak_3',emoji:'🌟',name:'٣ أيام متتالية',desc:'حافظت على السلسلة ٣ أيام',check:function(s){return s.streak>=3;}},
  {id:'streak_7',emoji:'🏆',name:'أسبوع كامل',desc:'حافظت على السلسلة ٧ أيام',check:function(s){return s.streak>=7;}},
  {id:'streak_30',emoji:'👑',name:'الملك',desc:'٣٠ يوم دراسة متتالية',check:function(s){return s.streak>=30;}},
  {id:'tasks_10',emoji:'✅',name:'منجز',desc:'أتممت ١٠ مهام',check:function(s){return (s.tasks||[]).filter(function(t){return t.done;}).length>=10;}},
  {id:'tasks_50',emoji:'🚀',name:'عملاق المهام',desc:'أتممت ٥٠ مهمة',check:function(s){return (s.tasks||[]).filter(function(t){return t.done;}).length>=50;}},
  {id:'all_habits',emoji:'💪',name:'يوم مثالي',desc:'أنجزت كل عاداتك في يوم واحد',check:function(s){var tk=todayKey();var total=s.habits&&s.habits.length;if(!total)return false;var done=(s.habits||[]).filter(function(h){return h.log&&h.log[tk];}).length;return done>=total&&done>0;}},
  {id:'xp_500',emoji:'⭐',name:'نجمة',desc:'وصلت إلى ٥٠٠ نقطة XP',check:function(s){return getXP()>=500;}},
  {id:'xp_2000',emoji:'🌠',name:'نجم ساطع',desc:'وصلت إلى ٢٠٠٠ نقطة XP',check:function(s){return getXP()>=2000;}}
];
function checkAchievements(){
  if(!S.unlockedBadges)S.unlockedBadges=[];
  ACHIEVEMENTS.forEach(function(a){
    if(S.unlockedBadges.indexOf(a.id)===-1&&a.check(S)){
      S.unlockedBadges.push(a.id);save();
      showBadgePopup(a);
    }
  });
}
function showBadgePopup(a){
  document.getElementById('bp-emoji').textContent=a.emoji;
  document.getElementById('bp-title').textContent=a.name;
  document.getElementById('bp-desc').textContent=a.desc;
  document.getElementById('badge-popup').classList.add('show');
  document.getElementById('badge-overlay').classList.add('show');
  icons();
}
function closeBadgePopup(){
  document.getElementById('badge-popup').classList.remove('show');
  document.getElementById('badge-overlay').classList.remove('show');
}
function renderAchievements(){
  var el=document.getElementById('achievements-grid');if(!el)return;
  if(!S.unlockedBadges)S.unlockedBadges=[];
  el.innerHTML=ACHIEVEMENTS.map(function(a){
    var unlocked=S.unlockedBadges.indexOf(a.id)!==-1;
    return '<div class="badge-item'+(unlocked?'':' locked')+'" title="'+(unlocked?a.desc:'مقفل')+'">'+
      '<div class="bi-emoji">'+(unlocked?a.emoji:'🔒')+'</div>'+
      '<div class="bi-name">'+a.name+'</div></div>';
  }).join('');
}

// ===== SUBJECT TIME CHART =====
function renderSubjChart(){
  var el=document.getElementById('subj-time-chart');if(!el)return;
  if(!S.subjectLog)S.subjectLog={gen:0};
  // المساقات النشطة + «عام» + أي مساق مؤرشف له وقت مسجَّل (التاريخ لا يضيع بالأرشفة)
  var act=(typeof courseActive==='function')?courseActive():Object.keys(S.subjects||{});
  var subjs=act.concat(['gen']);
  Object.keys(S.subjects||{}).forEach(function(k){
    if(subjs.indexOf(k)<0&&(S.subjectLog[k]||0)>0)subjs.push(k);
  });
  var max=Math.max(1,...subjs.map(function(k){return S.subjectLog[k]||0;}));
  el.innerHTML=subjs.map(function(k){
    var info=S.subjects[k]||{label:'عام',color:'#888'};
    var v=S.subjectLog[k]||0;
    var pct=Math.round(v/max*100);
    var arch=!!(S.subjects[k]&&S.subjects[k].archived);
    return '<div class="subj-bar-row'+(arch?' arch':'')+'">'+
      '<div class="subj-bar-label">'+esc(info.label)+(arch?' <i data-lucide="archive"></i>':'')+'</div>'+
      '<div class="subj-bar-track"><div class="subj-bar-fill" style="width:'+pct+'%;background:'+(info.color||'var(--accent)')+'"></div></div>'+
      '<div class="subj-bar-val">'+arN(v)+' د</div></div>';
  }).join('');
  icons();
}

// ===== SMART ANALYTICS =====
function partOfDay(h){
  if(h>=5&&h<=7)return 'وقت الفجر 🌅';
  if(h>=8&&h<=11)return 'الصباح ☀️';
  if(h>=12&&h<=15)return 'الظهيرة 🌤️';
  if(h>=16&&h<=18)return 'العصر 🌇';
  if(h>=19&&h<=23)return 'المساء 🌙';
  return 'وقت متأخر 🌌';
}
function renderAnalytics(){
  const el=document.getElementById('analytics-box'); if(!el)return;
  const sessions=S.sessions||0, totalMin=S.totalMin||0;
  const avg=sessions?Math.round(totalMin/sessions):0;
  const hourLog=Array.isArray(S.hourLog)?S.hourLog:[];
  let peakHour=-1,peakVal=0; hourLog.forEach(function(v,h){ if(v>peakVal){peakVal=v;peakHour=h;} });
  const thisWeek=(S.weekData||[]).reduce(function(a,b){return a+b;},0);
  const lastWeek=S.lastWeekTotal||0;
  let trendHtml;
  if(!lastWeek){ trendHtml='<span class="analytic-val trend-flat">— أول أسبوع</span>'; }
  else{
    const pct=Math.round((thisWeek-lastWeek)/lastWeek*100);
    const cls=pct>0?'trend-up':pct<0?'trend-down':'trend-flat';
    const arrow=pct>0?'▲':pct<0?'▼':'＝';
    trendHtml='<span class="analytic-val '+cls+'">'+arrow+' '+Math.abs(pct)+'%</span>';
  }
  const studyDays=Object.keys(S.activityLog||{}).filter(function(k){return (S.activityLog[k]||0)>0;}).length;
  const rows=[
    ['timer','متوسط مدة الجلسة','<span class="analytic-val">'+avg+' د</span>'],
    ['sunrise','أنشط وقت لديك',peakHour<0?'<span class="analytic-val trend-flat">لا بيانات بعد</span>':'<span class="analytic-val">'+partOfDay(peakHour)+'</span>'],
    ['trending-up','هذا الأسبوع مقابل السابق',trendHtml],
    ['calendar-check','إجمالي أيام الدراسة','<span class="analytic-val">'+studyDays+' يوم</span>']
  ];
  el.innerHTML=rows.map(function(r){
    return '<div class="analytic-row"><span class="analytic-label"><span class="ai"><i data-lucide="'+r[0]+'"></i></span>'+r[1]+'</span>'+r[2]+'</div>';
  }).join('');
  icons();
}

// ===== أنشط فترة صلاتية (من سجل الجلسات — أيّ فترة بين صلاتين تذاكر فيها أكثر) =====
function renderPeriodInsight(){
  var el=document.getElementById('period-insight'); if(!el)return;
  if(typeof dbGetAll!=='function'||typeof dbReady!=='function'||!dbReady()){ el.innerHTML=''; return; }
  var me=curProfileId();
  dbGetAll('sessions').then(function(rows){
    var byP={},tot=0;
    (rows||[]).forEach(function(s){ if(s.profileId!==me||!s.period)return; byP[s.period]=(byP[s.period]||0)+(s.durationMin||0); tot+=(s.durationMin||0); });
    var keys=Object.keys(byP);
    if(!keys.length){ el.innerHTML='<div class="setting-sub" style="margin-top:.6rem">سجّل جلسات أكثر لتظهر «أنشط فترة صلاتية» لك</div>'; return; }
    keys.sort(function(a,b){return byP[b]-byP[a];});
    var max=byP[keys[0]]||1;
    var names={fajr:'الفجر→الظهر',dhuhr:'الظهر→العصر',asr:'العصر→المغرب',maghrib:'المغرب→العشاء',isha:'العشاء→الفجر'};
    el.innerHTML='<div class="stats-scope" style="margin-top:1rem"><i data-lucide="route"></i> أنشط فتراتك الصلاتية (دقائق التركيز)</div>'+
      keys.map(function(k,i){
        var pct=Math.round(byP[k]/max*100);
        return '<div class="sport-stat-row"><div class="ssr-name">'+(names[k]||k)+(i===0?' 👑':'')+'</div><div class="ssr-track"><div class="ssr-fill" style="width:'+pct+'%"></div></div><div class="ssr-val">'+byP[k]+' د</div></div>';
      }).join('');
    icons();
  }).catch(function(){});
}
// ===== أقسام الميزان: طيّ + إعادة ترتيب (بطلب المستخدم) =====
function statsSecCfg(){
  if(!S.settings)S.settings={};
  if(!S.settings.statsSec||typeof S.settings.statsSec!=='object')S.settings.statsSec={collapsed:{},order:[],inited:false};
  var c=S.settings.statsSec; if(!c.collapsed)c.collapsed={}; if(!Array.isArray(c.order))c.order=[]; return c;
}
function _statsSecKey(el){ return (el.textContent||'').replace(/\s+/g,' ').trim().slice(0,40); }
// يجمع كل قسم (عنوان .stats-sec + ما يليه حتى العنوان التالي) في حاوية .stats-group قابلة للطيّ والترتيب
function buildStatsSections(){
  var page=document.getElementById('page-stats'); if(!page)return;
  if(page.getAttribute('data-secgrouped')==='1'){ applyStatsSections(); return; }
  var kids=[].slice.call(page.children), groups=[], cur=null;
  kids.forEach(function(ch){
    if(ch.classList&&ch.classList.contains('page-head'))return;
    if(ch.classList&&ch.classList.contains('stats-sec')){
      cur=document.createElement('div'); cur.className='stats-group';
      var key=_statsSecKey(ch); cur.setAttribute('data-seckey',key);
      groups.push({el:cur,header:ch,key:key});
    }
    if(cur)cur.appendChild(ch);
  });
  groups.forEach(function(g){
    page.appendChild(g.el);
    g.header.classList.add('stats-sec-head');
    g.header.setAttribute('onclick',"toggleStatsSec('"+jsStr(g.key)+"')");
    // ضغطة مطوّلة ثم سحب لإعادة الترتيب (بدل سهمَي أعلى/أسفل — بطلب المستخدم)
    g.header.setAttribute('onmousedown',"statsSecPress(event,'"+jsStr(g.key)+"')");
    g.header.setAttribute('onmouseup','statsSecRelease()');
    g.header.setAttribute('onmouseleave','statsSecRelease()');
    g.header.setAttribute('title','اضغط للطيّ · اضغط مطوّلاً ثم اسحب لإعادة الترتيب');
    g.el.setAttribute('ondragstart',"statsSecDragStart(event,'"+jsStr(g.key)+"')");
    g.el.setAttribute('ondragover','statsSecDragOver(event)');
    g.el.setAttribute('ondrop',"statsSecDrop(event,'"+jsStr(g.key)+"')");
    g.el.setAttribute('ondragend','statsSecDragEnd(event)');
    g.header.insertAdjacentHTML('beforeend','<i data-lucide="chevron-down" class="ssec-caret"></i>');
  });
  page.setAttribute('data-secgrouped','1');
  // أوّل مرّة: اطوِ كل الأقسام عدا «نظرة عامة» (بطلب المستخدم: يظهر الرئيسي فقط)
  var cfg=statsSecCfg();
  if(!cfg.inited){ groups.forEach(function(g,i){ if(i>0)cfg.collapsed[g.key]=true; }); cfg.inited=true; try{save();}catch(e){} }
  applyStatsSections(); icons();
}
function applyStatsSections(){
  var page=document.getElementById('page-stats'); if(!page)return;
  var cfg=statsSecCfg();
  var groups=[].slice.call(page.querySelectorAll('.stats-group'));
  if(cfg.order&&cfg.order.length){
    var byKey={}; groups.forEach(function(g){ byKey[g.getAttribute('data-seckey')]=g; });
    cfg.order.forEach(function(k){ if(byKey[k]){ page.appendChild(byKey[k]); delete byKey[k]; } });
  }
  groups.forEach(function(g){ var k=g.getAttribute('data-seckey'); g.classList.toggle('sec-collapsed',!!cfg.collapsed[k]); });
}
function toggleStatsSec(key){
  var cfg=statsSecCfg(); if(cfg.collapsed[key])delete cfg.collapsed[key]; else cfg.collapsed[key]=true; save(); applyStatsSections();
}
// إعادة ترتيب الأقسام بالسحب بعد ضغطة مطوّلة
var _ssecDragKey=null, _ssecTimer=null;
function _ssecGroup(key){ var gs=document.querySelectorAll('#page-stats .stats-group'); for(var i=0;i<gs.length;i++){ if(gs[i].getAttribute('data-seckey')===key)return gs[i]; } return null; }
function statsSecPress(e,key){ _ssecTimer=setTimeout(function(){ var g=_ssecGroup(key); if(g){ g.setAttribute('draggable','true'); g.classList.add('sec-armed'); } },380); }
function statsSecRelease(){ if(_ssecTimer){ clearTimeout(_ssecTimer); _ssecTimer=null; } }
function statsSecDragStart(e,key){ var g=e.currentTarget; if(!g.classList||!g.classList.contains('sec-armed')){ e.preventDefault(); return; } _ssecDragKey=key; if(e.dataTransfer)e.dataTransfer.effectAllowed='move'; g.classList.add('sec-dragging'); }
function statsSecDragOver(e){ if(_ssecDragKey==null)return; e.preventDefault(); }
function statsSecDrop(e,key){
  if(_ssecDragKey==null||_ssecDragKey===key)return; e.preventDefault();
  var page=document.getElementById('page-stats'); var groups=[].slice.call(page.querySelectorAll('.stats-group'));
  var keys=groups.map(function(g){ return g.getAttribute('data-seckey'); });
  var fi=keys.indexOf(_ssecDragKey), ti=keys.indexOf(key);
  if(fi<0||ti<0||fi===ti)return;
  keys.splice(fi,1); ti=keys.indexOf(key); keys.splice(ti,0,_ssecDragKey);   // أدرِج المسحوب قبل الهدف
  statsSecCfg().order=keys; save(); applyStatsSections();
}
function statsSecDragEnd(e){ var g=e.currentTarget; if(g&&g.classList){ g.removeAttribute('draggable'); g.classList.remove('sec-armed','sec-dragging'); } _ssecDragKey=null; }

// ===== تقويمات الميزان (أسبوع/شهر/سنة): الدراسة + العبادات الموحّدة + الرياضة (بطلب المستخدم) =====
function renderStatsCalendars(){
  if(typeof worshipLogView!=='function')return;
  var sc=document.getElementById('study-cal');
  if(sc)sc.innerHTML=worshipLogView(S.activityLog||{},function(v){return v||0;},'تقويم الدراسة (دقائق)','دقيقة','openDayEditor',true,'study');
  var spc=document.getElementById('sport-cal');
  if(spc){ var byDay={}; ((S.sport&&S.sport.entries)||[]).forEach(function(e){ byDay[e.date]=(byDay[e.date]||0)+(e.reps||0); });
    spc.innerHTML=worshipLogView(byDay,function(v){return v||0;},'تقويم الرياضة (عدّات)','عدّة',null,true,'sport'); }
  var wc=document.getElementById('worship-cal');
  if(wc){
    var wByDay={}, pt=S.prayerTrack||{}, ql=(S.quran&&S.quran.log)||{}, qil=(S.qiyam&&S.qiyam.log)||{}, al=S.adhkarLog||{}, allD={};
    [pt,ql,qil,al].forEach(function(o){ Object.keys(o).forEach(function(k){ allD[k]=1; }); });
    Object.keys(allD).forEach(function(dk){
      var s=0, d=pt[dk]||{};
      PRAYER_KEYS.forEach(function(k){ var st=d[k]&&d[k].status; if(st==='jama3a'||st==='solo')s++; });
      if((ql[dk]||0)>0)s++; if(qil[dk]&&((qil[dk].rakahs||0)+(qil[dk].witr||0))>0)s++; if((al[dk]||0)>0)s++;
      wByDay[dk]=s;
    });
    wc.innerHTML=worshipLogView(wByDay,function(v){return v||0;},'تقويم العبادات (صلاة + قرآن + قيام + أذكار)','عبادة','openDayEditor',true,'worship');
  }
  icons();
}

// ===== ADVANCED STATS + CORRELATION ANALYSIS =====
function pearson(xs,ys){
  var n=Math.min(xs.length,ys.length); if(n<3)return null;
  var sx=0,sy=0,sxy=0,sx2=0,sy2=0,k=0;
  for(var i=0;i<n;i++){ var x=xs[i],y=ys[i]; if(x==null||y==null)continue; sx+=x;sy+=y;sxy+=x*y;sx2+=x*x;sy2+=y*y;k++; }
  if(k<3)return null;
  var num=k*sxy-sx*sy, den=Math.sqrt((k*sx2-sx*sx)*(k*sy2-sy*sy));
  if(!den)return null; return num/den;
}
function corrLabel(r){
  if(r==null)return {txt:'بيانات غير كافية بعد',cls:'trend-flat',hint:'سجّل بضعة أيام أكثر ليظهر التحليل.'};
  var a=Math.abs(r), dir=r>0?'طردية':'عكسية';
  var strength=a>=0.5?'قوية':a>=0.3?'متوسطة':'ضعيفة';
  var cls=r>0.15?'trend-up':r<-0.15?'trend-down':'trend-flat';
  return {txt:'علاقة '+strength+' '+dir+' (r='+r.toFixed(2)+')',cls:cls};
}
function renderCorrelation(){
  var el=document.getElementById('correlation-box'); if(!el)return;
  var days=30, study=[],habitR=[],prayerOT=[];
  var total=(S.habits||[]).length;
  var d=new Date();
  for(var i=0;i<days;i++){
    var key=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    study.push(S.activityLog[key]||0);
    if(total>0){ var done=0; (S.habits||[]).forEach(function(h){ if(h.log&&h.log[key])done++; }); habitR.push(done/total*100); } else habitR.push(null);
    var pt=(S.prayerTrack||{})[key]; var ot=0; if(pt){ PRAYER_KEYS.forEach(function(k){ var st=pt[k]&&pt[k].status; if(st==='jama3a'||st==='solo')ot++; }); }
    prayerOT.push(pt?ot:null);
    d.setDate(d.getDate()-1);
  }
  var rHabit=pearson(study,habitR), rPray=pearson(study,prayerOT);
  var lH=corrLabel(rHabit), lP=corrLabel(rPray);
  // most productive weekday
  var wd=[0,0,0,0,0,0,0],wdc=[0,0,0,0,0,0,0],dd=new Date();
  for(var j=0;j<28;j++){ var kk=dd.getFullYear()+'-'+(dd.getMonth()+1)+'-'+dd.getDate(); wd[dd.getDay()]+=S.activityLog[kk]||0; wdc[dd.getDay()]++; dd.setDate(dd.getDate()-1); }
  var bestDay=-1,bestAvg=-1; for(var w=0;w<7;w++){ var av=wdc[w]?wd[w]/wdc[w]:0; if(av>bestAvg){bestAvg=av;bestDay=w;} }
  var rows=[
    ['repeat','الدراسة ↔ إنجاز العادات','<span class="analytic-val '+lH.cls+'">'+lH.txt+'</span>'],
    ['moon-star','الدراسة ↔ صلاة في وقتها','<span class="analytic-val '+lP.cls+'">'+lP.txt+'</span>'],
    ['calendar-check','أكثر أيامك إنتاجاً',bestAvg>0?'<span class="analytic-val">'+DAYS_AR[bestDay]+' ('+Math.round(bestAvg)+' د/يوم)</span>':'<span class="analytic-val trend-flat">لا بيانات بعد</span>']
  ];
  el.innerHTML=rows.map(function(r){
    return '<div class="analytic-row"><span class="analytic-label"><span class="ai"><i data-lucide="'+r[0]+'"></i></span>'+r[1]+'</span>'+r[2]+'</div>';
  }).join('')+
  '<div class="corr-note"><i data-lucide="info"></i> التحليل وصفيٌّ لمساعدتك على فهم أنماطك — وليس حكماً. الارتباط لا يعني السببية.</div>';
  icons();
}
