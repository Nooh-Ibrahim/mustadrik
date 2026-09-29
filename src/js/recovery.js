// recovery.js — رفيق الطُّهر (خاص، opt-in): دعم العزيمة على منهج فقه النفس.
// قواعد صارمة: مصادر قرآنية صحيحة فقط (لا اختلاق، لا نسبة مقولات). بالرجاء لا القنوط.
//             خاصّ تماماً: بلا فضح، بلا عدّاد توبيخ، الانتكاسة = «توبة ورجوع» لا «فشل».
// classic script (globals shared). يُحمّل بعد dayplan قبل palette.

// آيات رجاء (نصوص قرآنية صحيحة)
var TUHR_HOPE=[
  {a:'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ', r:'الزمر: 53'},
  {a:'إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ وَيُحِبُّ الْمُتَطَهِّرِينَ', r:'البقرة: 222'},
  {a:'إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ', r:'هود: 114'},
  {a:'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', r:'الطلاق: 2'},
  {a:'وَتُوبُوا إِلَى اللَّهِ جَمِيعًا أَيُّهَ الْمُؤْمِنُونَ لَعَلَّكُمْ تُفْلِحُونَ', r:'النور: 31'}
];
// آيات لحظة الرغبة
var TUHR_URGE=[
  {a:'قُل لِّلْمُؤْمِنِينَ يَغُضُّوا مِنْ أَبْصَارِهِمْ', r:'النور: 30'},
  {a:'وَلَا تَقْرَبُوا الْفَوَاحِشَ مَا ظَهَرَ مِنْهَا وَمَا بَطَنَ', r:'الأنعام: 151'},
  {a:'أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ', r:'العلق: 14'}
];
// خطوات عملية (أفعال عامة، فقه نفس — لا مقولات منسوبة)
var TUHR_TIPS=[
  'غُضّ بصرك عند أوّل نظرة — الأولى لك، والثانية عليك',
  'لا تخلُ بالجهاز ليلاً؛ اجعله في مكان مكشوف',
  'إذا هجمت الرغبة: توضّأ وصلِّ ركعتين',
  'الصوم وِجاء — جرّبه في أيام الضعف',
  'اشغل فراغك فوراً: حركة، أو قرآن، أو صحبة طيّبة',
  'ذكّر نفسك: الله يراك، ويحبّ منك التوبة والرجوع',
  'لا تجاهد وحدك — تواصل مع أخٍ ثقة وقت الضيق'
];
var TUHR_MILESTONES=[
  {d:1,t:'اليوم الأول'},{d:3,t:'ثلاثة أيام'},{d:7,t:'أسبوع'},{d:14,t:'أسبوعان'},
  {d:30,t:'شهر'},{d:40,t:'أربعون يوماً'},{d:90,t:'ثلاثة أشهر'},{d:180,t:'نصف عام'},{d:365,t:'عام كامل'}
];

function recoveryState(){
  if(!S.recovery||typeof S.recovery!=='object')S.recovery={enabled:false,startDate:'',bestStreak:0,totalResets:0,lastReset:'',plan:{triggers:'',actions:''}};
  if(!S.recovery.plan)S.recovery.plan={triggers:'',actions:''};
  return S.recovery;
}
function recoveryDays(){
  var r=recoveryState(); if(!r.startDate)return 0;
  var s=parseDayKey(r.startDate); if(!s)return 0;
  return Math.max(0, daysBetween(s,new Date()));
}
function toggleRecovery(){
  var r=recoveryState();
  r.enabled=!r.enabled;
  if(r.enabled&&!r.startDate)r.startDate=todayKey();
  save();
  if(typeof renderTopNav==='function')renderTopNav();
  if(typeof renderSettingsPage==='function')renderSettingsPage();
  if(r.enabled){ navTo('recovery'); }
  else if(currentPage==='recovery'){ navTo('home'); }
}
// (المهمة ١٦) منتقي تاريخ البدء يدوياً — عبر النافذة الاحترافية (نوع date)
function editTuhrStart(){
  var r=recoveryState();
  function pad(k){ if(!k)return ''; var p=String(k).split('-'); return p.length===3?(p[0]+'-'+('0'+p[1]).slice(-2)+'-'+('0'+p[2]).slice(-2)):k; }
  if(typeof openInputDialog!=='function')return;
  openInputDialog({title:'تاريخ بدء الطُّهر',sub:'اختر اليوم الذي بدأت فيه — يُحسب العدّاد منه',type:'date',value:pad(r.startDate||todayKey()),confirmText:'حفظ',onOk:function(v){
    if(!v)return; r.startDate=v; save(); renderRecovery(); notify('حُدِّث تاريخ البدء ✓','calendar');
  }});
}
function tuhrHopeToday(){ var i=(typeof dayOfYear==='function')?dayOfYear():new Date().getDate(); return TUHR_HOPE[i%TUHR_HOPE.length]; }
function tuhrTipToday(){ var i=(typeof dayOfYear==='function')?dayOfYear():new Date().getDate(); return TUHR_TIPS[i%TUHR_TIPS.length]; }

function renderRecovery(){
  var el=document.getElementById('recovery-body'); if(!el)return;
  var r=recoveryState();
  if(!r.enabled){
    el.innerHTML='<div class="card" data-cid="tuhr-off"><div class="tuhr-off"><div class="tuhr-off-ic">🛡️</div>'+
      '<div class="tuhr-off-t">رفيق الطُّهر — خاصّ بك</div>'+
      '<div class="tuhr-off-s">رفيقٌ على طريق العزيمة، يُعينك بالرجاء لا القنوط. خاصّ تماماً، بلا حساب ولا توبيخ. فعّله متى شئت.</div>'+
      '<button class="btn pri" onclick="toggleRecovery()"><i data-lucide="shield-check"></i> تفعيل رفيق الطُّهر</button></div></div>';
    icons(); return;
  }
  var days=recoveryDays();
  // milestone progress
  var next=null,prev=0; for(var i=0;i<TUHR_MILESTONES.length;i++){ if(TUHR_MILESTONES[i].d>days){next=TUHR_MILESTONES[i];break;} prev=TUHR_MILESTONES[i].d; }
  var pct = next ? Math.round((days-prev)/(next.d-prev)*100) : 100;
  var hope=tuhrHopeToday(), tip=tuhrTipToday();
  var plan=r.plan||{triggers:'',actions:''};
  el.innerHTML=
    '<div class="card tuhr-counter-card" data-cid="tuhr-counter">'+
      '<div class="tuhr-days"><div class="tuhr-days-n">'+days+'</div><div class="tuhr-days-l">'+(days===1?'يوم':'يوماً')+' في طريق الطُّهر</div></div>'+
      '<div class="tuhr-meta">'+
        '<div class="tuhr-meta-row"><span>أطول مدّة</span><b>'+(r.bestStreak||0)+' يوم</b></div>'+
        '<div class="tuhr-meta-row"><span>تاريخ البدء</span><button class="btn ghost sm" onclick="editTuhrStart()" title="تعديل تاريخ البدء يدوياً"><i data-lucide="calendar"></i> '+(r.startDate||'—')+'</button></div>'+
        (next?'<div class="tuhr-next">إلى محطّة «'+next.t+'» — <b>'+Math.max(0,next.d-days)+'</b> يوم</div>'+
          '<div class="progress-track" style="margin-top:.4rem"><div class="progress-fill" style="width:'+pct+'%;background:var(--green)"></div></div>':'<div class="tuhr-next">تجاوزتَ كل المحطّات — ثبّتك الله 🌿</div>')+
      '</div>'+
    '</div>'+
    '<div class="card tuhr-hope" data-cid="tuhr-hope"><div class="tuhr-hope-v">﴿ '+hope.a+' ﴾</div><div class="tuhr-hope-r">'+hope.r+'</div></div>'+
    '<div class="tuhr-actions">'+
      '<button class="btn tuhr-urge" onclick="feelUrge()"><i data-lucide="life-buoy"></i> أشعر برغبة الآن</button>'+
      '<button class="btn" onclick="tawbaReset()"><i data-lucide="rotate-ccw"></i> توبة ورجوع</button>'+
    '</div>'+
    '<div class="card" data-cid="tuhr-tip"><div class="card-title"><i data-lucide="lightbulb"></i> تذكير اليوم</div><div class="tuhr-tip">'+tip+'</div></div>'+
    '<div class="card" data-cid="tuhr-plan"><div class="card-title"><i data-lucide="clipboard-list"></i> خطّتي (إذا… فسوف…)</div>'+
      '<label class="tuhr-plan-l">مواطن ضعفي (متى/أين تهجم الرغبة؟)</label>'+
      '<textarea id="tuhr-triggers" class="ritual-textarea" rows="2" placeholder="مثال: الليل وحدي بالهاتف..." onchange="saveTuhrPlan()">'+esc(plan.triggers||'')+'</textarea>'+
      '<label class="tuhr-plan-l">خطّتي المضادّة (ماذا سأفعل فوراً؟)</label>'+
      '<textarea id="tuhr-actions" class="ritual-textarea" rows="2" placeholder="مثال: أضع الهاتف خارج الغرفة وأتوضّأ..." onchange="saveTuhrPlan()">'+esc(plan.actions||'')+'</textarea>'+
    '</div>'+
    tuhrLessonCard()+tuhrUrgeCard()+
    '<div class="card tuhr-priv" data-cid="tuhr-priv"><i data-lucide="lock"></i> هذه الصفحة خاصّة بك — لا تُشارَك، ولا تُحتسب في أي تقرير.</div>';
  icons();
}

// ===== E: دروس التعافي اليومية =====
var TUHR_LESSONS=[
  {t:'الدوبامين والمثير الصناعي', b:'المثير الإباحي يُفجّر الدوبامين بشكل مفرط غير طبيعي، فيُعيد معايرة دماغك ويُضعف لذّة الأشياء الحقيقية. الامتناع يُعيد التوازن تدريجياً — اصبر، فالدماغ يتعافى.'},
  {t:'غضّ البصر حصن', b:'النظرة الأولى لك، والثانية عليك. غضّ بصرك فوراً يقطع السلسلة قبل أن تبدأ. «قُل لِّلْمُؤْمِنِينَ يَغُضُّوا مِنْ أَبْصَارِهِمْ» — أمرٌ فيه حمايتك.'},
  {t:'الفراغ بوّابة', b:'أكثر الانتكاسات في الفراغ والوحدة ليلاً. خطّط لملء وقتك: حركة، قرآن، صحبة، مهمة. الانشغال بالخير أقوى دفاع.'},
  {t:'التوبة تجبّ ما قبلها', b:'مهما تكرّرت العثرة، باب التوبة مفتوح. لا تدع الشيطان يُقنعك بأن «الأمر انتهى». «إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ». كل رجوع بداية جديدة.'},
  {t:'الموجة تمرّ', b:'الرغبة موجة: تعلو دقائق ثم تنكسر إن لم تُطعِمها. اصمد ٥–١٠ دقائق، غيّر مكانك، توضّأ — وستذهب. لا تصدّق أنها ستبقى.'},
  {t:'الصوم وِجاء', b:'قال ﷺ: «ومن لم يستطع فعليه بالصوم فإنه له وِجاء» (متفق عليه). الصوم يكسر حدّة الشهوة ويقوّي الإرادة — جرّبه أيام الضعف.'},
  {t:'المراقبة', b:'الله يراك في خلوتك كما يراك في جلوتك. «أَلَمْ يَعْلَم بِأَنَّ اللَّهَ يَرَىٰ». استحضار المعيّة يُطفئ كثيراً من نوازع اللحظة.'},
  {t:'الصحبة تحمي', b:'لا تجاهد وحدك. أخٌ ثقة تُحدّثه وقت الضعف يكسر العزلة التي يعشّش فيها الانتكاس.'},
  {t:'النوم المبكر', b:'السهر وحيداً بالهاتف وقود الانتكاس. النوم المبكر يقطع أخطر ساعاتك، ويمنحك فجراً نشيطاً.'},
  {t:'بيئتك أولاً', b:'لا تعتمد على الإرادة وحدها — صمّم بيئتك: الجهاز خارج الغرفة ليلاً، مكان مكشوف للمذاكرة. الوقاية أسهل من المقاومة.'}
];
function tuhrLessonCard(){
  var i=(typeof dayOfYear==='function')?dayOfYear():new Date().getDate();
  var L=TUHR_LESSONS[i%TUHR_LESSONS.length];
  var r=recoveryState(); var done=(r.lessons&&r.lessons.lastDate===todayKey());
  return '<div class="card" data-cid="tuhr-lesson"><div class="card-title"><i data-lucide="book-open"></i> درس اليوم · سلسلة '+((r.lessons&&r.lessons.streak)||0)+'</div>'+
    '<div class="lesson-t">'+L.t+'</div><div class="lesson-b">'+L.b+'</div>'+
    '<button class="btn sm '+(done?'':'pri')+'" onclick="markLessonDone()"'+(done?' disabled':'')+'><i data-lucide="check"></i> '+(done?'أُنجِز اليوم':'فهمتُه — تمّ')+'</button></div>';
}
function markLessonDone(){
  var r=recoveryState(); if(!r.lessons)r.lessons={lastDate:'',streak:0};
  var tk=todayKey(); if(r.lessons.lastDate===tk)return;
  var y=new Date(); y.setDate(y.getDate()-1); var yk=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();
  r.lessons.streak=(r.lessons.lastDate===yk)?(r.lessons.streak||0)+1:1; r.lessons.lastDate=tk;
  save(); renderRecovery(); notify('أتممتَ درس اليوم — سلسلة '+r.lessons.streak+' 🌿','check-circle');
}

// ===== D: سجلّ المحفّزات (خاص) =====
var TUHR_WHERE=['وحدي بالهاتف','الفراش ليلاً','بعد إحباط','فراغ/ملل','أخرى'];
var TUHR_MOOD=['متوتر','وحيد','ملول','محبط','متعب'];
function tuhrUrgeCard(){
  var r=recoveryState(); var n=(r.urges||[]).length;
  return '<div class="card" data-cid="tuhr-urges"><div class="card-title"><i data-lucide="activity"></i> سجلّ المحفّزات (خاص) · '+n+'</div>'+
    '<div class="setting-sub" style="margin-bottom:.5rem">سجّل لحظة الرغبة لتكشف نمطك — معرفة موطن الضعف نصف المعركة.</div>'+
    '<div class="urge-form"><select id="urge-where">'+TUHR_WHERE.map(function(w){return '<option>'+w+'</option>';}).join('')+'</select>'+
      '<select id="urge-mood">'+TUHR_MOOD.map(function(m){return '<option>'+m+'</option>';}).join('')+'</select>'+
      '<button class="btn sm" onclick="logUrge()"><i data-lucide="plus"></i> سجّل</button></div>'+
    (n?'<div class="urge-insight"><i data-lucide="lightbulb"></i> <span>'+urgeInsight()+'</span></div>':'')+'</div>';
}
function logUrge(){
  var r=recoveryState(); if(!Array.isArray(r.urges))r.urges=[];
  var w=document.getElementById('urge-where'), m=document.getElementById('urge-mood');
  r.urges.push({date:todayKey(),hour:new Date().getHours(),where:w?w.value:'',mood:m?m.value:''});
  if(r.urges.length>200)r.urges=r.urges.slice(-200);
  save(); renderRecovery(); notify('سُجِّل — كشف النمط يقوّيك','check');
}
function urgeInsight(){
  var u=(recoveryState().urges)||[]; if(!u.length)return '';
  function band(h){ return h<5?'قُبيل الفجر':h<12?'الصباح':h<15?'الظهيرة':h<18?'العصر':h<21?'المساء':'الليل'; }
  var bands={},wheres={};
  u.forEach(function(x){ var b=band(x.hour||0); bands[b]=(bands[b]||0)+1; if(x.where)wheres[x.where]=(wheres[x.where]||0)+1; });
  function top(o){ var k='',mx=0; Object.keys(o).forEach(function(x){if(o[x]>mx){mx=o[x];k=x;}}); return k; }
  var tb=top(bands), tw=top(wheres);
  return 'ذروتك غالباً في <b>'+tb+'</b>'+(tw?(' و«'+tw+'»'):'')+' — جهّز دفاعك مسبقاً لهذا الوقت.';
}
function saveTuhrPlan(){
  var r=recoveryState();
  var t=document.getElementById('tuhr-triggers'), a=document.getElementById('tuhr-actions');
  r.plan={triggers:t?t.value.trim():'', actions:a?a.value.trim():''};
  save(); notify('حُفظت خطّتك ✓','check-circle');
}
function tawbaReset(){
  askConfirm('تبدأ من جديد؟ توبتك محبوبة، وما مضى يُمحى بإذن الله. (لا حساب ولا توبيخ).',function(){
    var r=recoveryState();
    var cur=recoveryDays(); if(cur>(r.bestStreak||0))r.bestStreak=cur;
    r.totalResets=(r.totalResets||0)+1; r.lastReset=todayKey(); r.startDate=todayKey();
    save(); renderRecovery();
    try{ showBadgePopup({emoji:'🤍',name:'توبةٌ ورجوع',desc:'«إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ» — انهض، فالطريق ما زال أمامك'}); }catch(e){ notify('بداية جديدة — وفّقك الله','heart'); }
  },{confirmText:'نعم، أعود إلى الله',danger:false});
}

// ===== تدخّل لحظة الرغبة (سريع، حاسم) =====
var urgeStep=0;
function feelUrge(){
  urgeStep=0;
  var ov=document.getElementById('urge-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='urge-overlay'; ov.className='sakina-overlay'; document.body.appendChild(ov); }
  ov.style.display='flex'; renderUrge();
}
function closeUrge(){ var ov=document.getElementById('urge-overlay'); if(ov)ov.style.display='none'; }
function urgeNext(){ urgeStep++; if(urgeStep>2){ closeUrge(); return; } renderUrge(); }
function renderUrge(){
  var ov=document.getElementById('urge-overlay'); if(!ov)return;
  var v=TUHR_URGE[Math.floor(Math.random()*TUHR_URGE.length)];
  var tip=TUHR_TIPS[Math.floor(Math.random()*TUHR_TIPS.length)];
  var dots=''; for(var i=0;i<3;i++)dots+='<span class="sak-dot'+(i===urgeStep?' on':'')+'"></span>';
  var body='',foot='';
  if(urgeStep===0){
    body='<div class="sak-isti">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</div>'+
      '<div class="urge-now">غُضّ بصرك الآن. أغلِق ما أمامك. قُمْ من مكانك.</div>'+
      '<div class="sak-hint">الموجة تعلو ثم تنكسر — اصمد دقيقة، تمرّ بإذن الله.</div>';
    foot='<button class="btn pri" onclick="urgeNext()"><i data-lucide="arrow-left"></i> فعلتُها… تابع</button>';
  }else if(urgeStep===1){
    body='<div class="sak-verse">﴿ '+v.a+' ﴾</div><div class="sak-ref">'+v.r+'</div>'+
      '<div class="sak-hint">الله يراك تجاهد الآن — وهذا في ميزانك حسنة.</div>';
    foot='<button class="btn pri" onclick="urgeNext()"><i data-lucide="arrow-left"></i> تابع</button>';
  }else{
    body='<div class="urge-step-t">'+tip+'</div>'+
      '<div class="sak-close-msg">انتصرتَ في هذه اللحظة بإذن الله.<br>لا تنتظر — انشغل بخيرٍ الآن، وأنت مرفوع الرأس.</div>';
    foot='<button class="btn pri" onclick="closeUrge()"><i data-lucide="check"></i> جاهدتُ — والحمد لله</button>';
  }
  ov.innerHTML='<div class="sakina-modal">'+
    '<button class="sak-x" onclick="closeUrge()"><i data-lucide="x"></i></button>'+
    '<div class="sak-head"><i data-lucide="life-buoy"></i> اثبُت — الله معك</div>'+
    '<div class="sak-body">'+body+'</div>'+
    '<div class="sak-dots">'+dots+'</div>'+
    '<div class="sak-foot">'+foot+'</div>'+
  '</div>';
  icons();
}
// تنبيه ليلي لطيف (وقت ضعف شائع) — مرّة عند الإقلاع
function recoveryNightCheck(){
  var r=recoveryState(); if(!r.enabled)return;
  var h=new Date().getHours();
  if(h>=23||h<4){ try{ notify('الليل وقت عزيمة — حصّن نفسك بذكرٍ أو نومٍ مبكر. أنت في طريق الطُّهر 🌿','moon'); }catch(e){} }
}
