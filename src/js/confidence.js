// confidence.js — النهوض / استعادة الثقة: إعادة صياغة معرفية (CBT) بعد العثرة + سجل الانتصارات.
// قاعدة صارمة: مصادر قرآنية صحيحة فقط (لا اختلاق). منهج رفق وتعاطف بلا عقاب.
// classic script (globals shared). يُحمّل بعد customize قبل palette.

// آيات نهوض وقوّة (نصوص قرآنية صحيحة)
var RISE_VERSES=[
  {a:'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ', r:'آل عمران: 139'},
  {a:'إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ', r:'الزمر: 10'},
  {a:'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', r:'الشرح: 5'},
  {a:'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ', r:'يوسف: 87'},
  {a:'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ', r:'البقرة: 216'}
];
// أسئلة تحدّي الفكرة (تقنية CBT عامة — لا مقولات منسوبة)
var CBT_CHALLENGES=[
  'هل هذه حقيقةٌ مطلقة، أم شعورٌ عابر سيمرّ؟',
  'ما الذي أنجزتَه رغم الصعوبة من قبل؟',
  'ماذا كنتَ ستقول لأخٍ يمرّ بنفس الموقف؟',
  'هل العثرة نهاية الطريق، أم مجرّد منعطف فيه؟',
  'ما الخطوة الصغيرة التي تُعيدك للمسار الآن؟'
];

function confState(){ if(!S.confidence||typeof S.confidence!=='object')S.confidence={wins:[]}; if(!Array.isArray(S.confidence.wins))S.confidence.wins=[]; return S.confidence; }
function riseVerseToday(){ var i=(typeof dayOfYear==='function')?dayOfYear():new Date().getDate(); return RISE_VERSES[i%RISE_VERSES.length]; }

// (حُذفت صفحة «النهوض» المستقلة — اندمجت كبطاقة بالرئيسية renderRiseHome في home.js)
// استيراد الإنجازات المفتوحة كانتصارات (بطلب المستخدم: إرجاع زر «استورد انتصاراتي من الإنجازات»)
function seedWins(){
  var unlocked=S.unlockedBadges||[];
  var st=confState(); var existing=st.wins.map(function(w){return w.text;});
  var added=0;
  (typeof ACHIEVEMENTS!=='undefined'?ACHIEVEMENTS:[]).forEach(function(a){
    if(unlocked.indexOf(a.id)>=0){ var txt='إنجاز: '+a.name; if(existing.indexOf(txt)<0){ st.wins.push({id:Date.now()+Math.floor(Math.random()*9999),text:txt,date:todayKey()}); existing.push(txt); added++; } }
  });
  if(added)save();
  if(typeof renderRiseHome==='function'){ try{renderRiseHome();}catch(e){} }
  notify(added?('استوردتُ '+added+' إنجازاً إلى انتصاراتك ✓'):'لا إنجازات جديدة للاستيراد بعد','trophy');
}
function addWin(text){
  var t = (typeof text==='string') ? text : '';
  t=(t||'').trim(); if(!t)return;
  confState().wins.push({id:Date.now()+Math.floor(Math.random()*999),text:t,date:todayKey()});
  save();
  if(typeof renderRiseHome==='function'){ try{renderRiseHome();}catch(e){} }   // حدّث بطاقة الرئيسية
}

// ===== إعادة الصياغة المعرفية (CBT) — 4 مراحل =====
var rfStep=0, rfThought='';
function startReframe(){
  rfStep=0; rfThought='';
  var ov=document.getElementById('reframe-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='reframe-overlay'; ov.className='ritual-overlay'; document.body.appendChild(ov); }
  ov.style.display='flex'; renderReframe();
}
function closeReframe(){ var ov=document.getElementById('reframe-overlay'); if(ov)ov.style.display='none'; }
function reframeNext(){
  if(rfStep===0){ var t=document.getElementById('rf-thought'); rfThought=t?t.value.trim():''; }
  rfStep++; if(rfStep>3){ closeReframe(); return; } renderReframe();
}
function renderReframe(){
  var ov=document.getElementById('reframe-overlay'); if(!ov)return;
  var v=riseVerseToday();
  var dots=''; for(var i=0;i<4;i++)dots+='<span class="sak-dot'+(i===rfStep?' on':'')+'"></span>';
  var body='',foot='';
  if(rfStep===0){
    body='<div class="rf-q">ما الفكرة التي تؤلمك الآن؟</div>'+
      '<textarea id="rf-thought" class="ritual-textarea" rows="3" placeholder="اكتبها كما هي… مثلاً: «أنا فاشل، لن أنجح».">'+esc(rfThought)+'</textarea>'+
      '<div class="rf-hint">إخراجها من رأسك إلى الورق يُضعِف سطوتها.</div>';
    foot='<button class="btn pri" onclick="reframeNext()"><i data-lucide="arrow-left"></i> تابع</button>';
  }else if(rfStep===1){
    body=(rfThought?'<div class="rf-thought-box">«'+esc(rfThought)+'»</div>':'')+
      '<div class="rf-q">تحدَّ الفكرة — اسأل نفسك:</div>'+
      '<ul class="rf-challenges">'+CBT_CHALLENGES.map(function(c){return '<li>'+c+'</li>';}).join('')+'</ul>';
    foot='<button class="btn pri" onclick="reframeNext()"><i data-lucide="arrow-left"></i> تحدّيتُها… تابع</button>';
  }else if(rfStep===2){
    body='<div class="rf-verse">﴿ '+v.a+' ﴾</div><div class="rf-ref">'+v.r+'</div>'+
      '<div class="rf-balanced">الصياغة المتوازنة:<br><b>«تعثّرتُ، لكنّي لم أُهزَم. كل من نجح تعثّر قبلي. أنهض الآن خطوةً واحدة — والله مع الصابرين».</b></div>';
    foot='<button class="btn pri" onclick="reframeNext()"><i data-lucide="arrow-left"></i> تابع</button>';
  }else{
    body='<div class="rf-q">خطوة صغيرة واحدة الآن:</div>'+
      '<input id="rf-step" class="ritual-input" placeholder="مثلاً: أفتح الكتاب وأقرأ صفحة واحدة فقط">'+
      '<div class="rf-hint">لا تفكّر في الباقي — خطوة واحدة تكسر العجز.</div>';
    foot='<button class="btn pri" onclick="finishReframe()"><i data-lucide="check"></i> نهضتُ — والحمد لله</button>';
  }
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header">'+
      '<div class="ritual-icon">🌅</div><div class="ritual-title">النهوض</div>'+
      '<div class="ritual-sub">من العثرة إلى الخطوة التالية</div></div>'+
    '<div class="ritual-body">'+body+'</div>'+
    '<div class="sak-dots">'+dots+'</div>'+
    '<div class="ritual-foot">'+foot+'</div></div>';
  icons();
}
function finishReframe(){
  var st=document.getElementById('rf-step'); var stepTxt=st?st.value.trim():'';
  closeReframe();
  addWin('نهضتُ بعد عثرة'+(stepTxt?(' ← '+stepTxt):''));
  try{ showBadgePopup({emoji:'🌅',name:'نهضتَ من جديد',desc:'«وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ» — هذا انتصار حقيقي'}); }catch(e){ notify('أحسنت — نهضتَ من جديد','sunrise'); }
}
