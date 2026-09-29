// worship.js — قسم «الغاية» التفصيلي: القرآن + القيام + الأذكار + آية/حديث اليوم + تذكير الصلاة والأذان
// module — classic script (globals shared, no ES modules). محتوى محلّي بالكامل (لا إنترنت، لا CSP).
// الأسلوب: تشجيعي لا توبيخي للقرآن/القيام (الحزم مقصور على الصلاة = الخط الأحمر).

// ===== content (curated, local — verse + hadith of the day) =====
var DAILY_VERSES=[
  '«إِنَّ مَعَ الْعُسْرِ يُسْرًا» — الشرح:6',
  '«وَقُل رَّبِّ زِدْنِي عِلْمًا» — طه:114',
  '«أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ» — الرعد:28',
  '«فَاذْكُرُونِي أَذْكُرْكُمْ» — البقرة:152',
  '«إِنَّ اللَّهَ مَعَ الصَّابِرِينَ» — البقرة:153',
  '«وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا» — الطلاق:2',
  '«وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ» — النجم:39',
  '«وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ» — الكهف:24',
  '«وَتَوَكَّلْ عَلَى اللَّهِ وَكَفَىٰ بِاللَّهِ وَكِيلًا» — الأحزاب:3',
  '«رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً» — البقرة:201'
];
var DAILY_HADITHS=[
  '«إنما الأعمالُ بالنِّيّات» — متفق عليه',
  '«أحبُّ الأعمالِ إلى اللهِ أدْوَمُها وإن قَلّ» — متفق عليه',
  '«من حُسْنِ إسلامِ المرءِ تركُه ما لا يعنيه» — الترمذي',
  '«اتقِ اللهَ حيثما كنت، وأتبِعِ السيّئةَ الحسنةَ تمحُها» — الترمذي',
  '«الكلمةُ الطيّبةُ صدقة» — متفق عليه',
  '«من سلك طريقًا يلتمسُ فيه علمًا سهّل اللهُ له به طريقًا إلى الجنّة» — مسلم',
  '«لا يؤمنُ أحدُكم حتى يُحبَّ لأخيه ما يُحبُّ لنفسه» — متفق عليه',
  '«المسلمُ من سلِم المسلمون من لسانه ويده» — متفق عليه',
  '«الدُّعاءُ هو العبادة» — الترمذي',
  '«تبسُّمُك في وجه أخيك صدقة» — الترمذي'
];
function dayOfYear(){ var n=new Date(); var s=new Date(n.getFullYear(),0,0); return Math.floor((n-s)/86400000); }
function renderDailyLight(){
  var el=document.getElementById('daily-light'); if(!el)return;
  var i=dayOfYear();
  var v=DAILY_VERSES[i%DAILY_VERSES.length];
  var h=DAILY_HADITHS[i%DAILY_HADITHS.length];
  // آية النهوض (اندمجت هنا — لا نكرّرها في بطاقة منفصلة)
  var rise=(typeof riseVerseToday==='function')?riseVerseToday():null;
  el.innerHTML='<div class="dl-item dl-verse"><span class="dl-tag"><i data-lucide="book-open"></i> آية اليوم</span><div class="dl-text">'+esc(v)+'</div></div>'+
    '<div class="dl-item dl-hadith"><span class="dl-tag"><i data-lucide="scroll-text"></i> حديث اليوم</span><div class="dl-text">'+esc(h)+'</div></div>'+
    (rise?('<div class="dl-item dl-rise"><span class="dl-tag"><i data-lucide="sunrise"></i> آية النهوض</span><div class="dl-text">﴿ '+esc(rise.a)+' ﴾ — '+esc(rise.r)+'</div></div>'):'');
  icons();
}

// ===== shared small helpers =====
function dkey(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }   // same unpadded format as todayKey()
function lastDaysKeys(n){ var a=[],d=new Date(); for(var i=0;i<n;i++){ a.push(dkey(d)); d.setDate(d.getDate()-1); } return a; }

// ===== السجل المرئي (سلسلة الأيام بالبكسل) — للقرآن والقيام (المهمة ١٤) =====
// logObj: كائن {تاريخ:قيمة} · valFn: تستخرج رقماً من قيمة اليوم · يلوّن الخلية بشدّة النشاط.
function streakLogHTML(logObj,valFn,title,unit,clickFn,cid){
  logObj=logObj||{};
  var keys=lastDaysKeys(91).slice().reverse();   // من الأقدم للأحدث (شبكة LTR)
  var total=0,active=0;
  var cells=keys.map(function(k){
    var v=valFn(logObj[k])||0; total+=v; if(v>0)active++;
    var lv=v<=0?0:v<3?1:v<7?2:3;
    // الخلايا قابلة للنقر للتعديل بأثر رجعي (طلب نوح: أعدّل أي يوم بنقرة، لا بكتابة تاريخ)
    var click=clickFn?(' onclick="'+clickFn+'(\''+k+'\')" style="cursor:pointer" title="'+k+': '+v+' '+unit+' — اضغط للتعديل"'):(' title="'+k+': '+v+' '+unit+'"');
    return '<div class="sl-cell'+(lv?' lv'+lv:'')+'"'+click+'></div>';
  }).join('');
  return '<div class="card streak-log"'+(cid?' data-cid="'+cid+'"':'')+'><div class="card-title"><i data-lucide="flame"></i> '+title+' — آخر ٩١ يوماً'+(clickFn?' <span class="sl-hint">(اضغط أي يوم لتعديله)</span>':'')+'</div>'+
    '<div class="streak-log-grid">'+cells+'</div>'+
    '<div class="streak-log-foot"><span>الأخفت = لا شيء · الأغمق = أكثر</span><span>أيام نشطة: '+active+' · إجمالي: '+total+' '+unit+'</span></div></div>';
}
// محرّرات الأيام السابقة (نقرة على خلية السجل)
function quranEditCell(dk){
  var q=quranState();
  openInputDialog({title:'وِرد يوم '+dk,sub:'عدد الصفحات (صفر للحذف)',type:'number',value:q.log[dk]||0,confirmText:'حفظ',onOk:function(v){
    var pg=Math.max(0,parseInt(v)||0); if(pg===0)delete q.log[dk]; else q.log[dk]=pg;
    save(); renderQuran(); if(typeof renderWorshipStreaks==='function')renderWorshipStreaks(); notify('حُدّث وِرد '+dk+' ✓','check-circle');
  }});
}
function qiyamEditCell(dk){
  var qi=S.qiyam||(S.qiyam={log:{}}); if(!qi.log)qi.log={};
  var cur=qi.log[dk]||{rakahs:0,witr:0};
  openInputDialog({title:'قيام ليلة '+dk,sub:'عدد الركعات (صفر للحذف — الوتر يبقى كما هو)',type:'number',value:(cur.rakahs||0),confirmText:'حفظ',onOk:function(v){
    var rk=Math.max(0,parseInt(v)||0);
    if(rk===0&&!(cur.witr))delete qi.log[dk]; else qi.log[dk]={rakahs:rk,witr:cur.witr||0};
    save(); if(typeof renderQiyam==='function')renderQiyam(); if(typeof renderWorshipStreaks==='function')renderWorshipStreaks(); notify('حُدّث قيام '+dk+' ✓','check-circle');
  }});
}
// (حُذف adhkarEditCell — كان ميتاً؛ تعديل الأذكار الرجعي صار في openDayEditor/adhkarDayEditor)
// نسخة مكرّرة في «الميزان» (الإحصائيات) — تبقى في صفحتَي القرآن/القيام وتظهر هنا أيضاً (طلب المالك).
function renderWorshipStreaks(){
  var el=document.getElementById('worship-streaks'); if(!el)return;
  var q=(S.quran&&S.quran.log)||{}, qi=(S.qiyam&&S.qiyam.log)||{};
  el.innerHTML=streakLogHTML(q,function(v){return v||0;},'سجل وِردك — القرآن','صفحة','quranEditCell','streak-quran')+
    streakLogHTML(qi,function(r){return r?((r.rakahs||0)+(r.witr||0)):0;},'سجل قيامك — الليل','ركعة','qiyamEditCell','streak-qiyam');
  icons();
}

// ===== عرض موحّد (أسبوع/شهر/سنة) لسجلّات العبادة + تعديل أي يوم بنقرة (طلب نوح) =====
function worshipViewToggle(calId){
  calId=calId||'worship';
  var cur=(typeof calView==='function')?calView(calId):'week';
  var opts=[['week','أسبوع','calendar-range'],['month','شهر','calendar'],['year','سنة','grid-3x3']];
  return '<div class="habit-view-bar"><div class="seg-ctrl">'+opts.map(function(o){return '<button class="seg-btn'+(cur===o[0]?' active':'')+'" onclick="setCalView(\''+o[0]+'\',\''+calId+'\')"><i data-lucide="'+o[2]+'"></i> '+o[1]+'</button>';}).join('')+'</div></div>';
}
function _wLvl(v){ return v<=0?0:v<3?1:v<7?2:3; }
// logObj: {تاريخ:قيمة} · valFn: تستخرج رقماً · editFn: اسم دالة تعديل اليوم · showToggle: إظهار مبدّل العرض
function worshipLogView(logObj,valFn,title,unit,editFn,showToggle,calId){
  calId=calId||'worship';
  logObj=logObj||{}; var v=(typeof calView==='function')?calView(calId):'week', body;
  if(v==='month')body=_wLogMonth(logObj,valFn,unit,editFn);
  else if(v==='year')body=_wLogYear(logObj,valFn,unit,editFn);
  else body=_wLogWeek(logObj,valFn,unit,editFn);
  var hint=editFn?' <span class="sl-hint">(اضغط أي يوم لتعديله)</span>':'';
  return '<div class="card streak-log" data-cid="wlog-'+calId+'"><div class="card-title"><i data-lucide="flame"></i> '+title+hint+'</div>'+
    (showToggle!==false?worshipViewToggle(calId):'')+body+'</div>';
}
function _wLogWeek(logObj,valFn,unit,editFn){
  var names=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'], cells='';
  for(var i=6;i>=0;i--){ var dd=new Date(); dd.setDate(dd.getDate()-i); var k=dkey(dd); var val=valFn(logObj[k])||0; var lv=_wLvl(val);
    var clk=editFn?(' onclick="'+editFn+'(\''+k+'\')" style="cursor:pointer"'):'';
    cells+='<div class="wl-day'+(lv?' lv'+lv:'')+'"'+clk+' title="'+k+': '+val+' '+unit+'"><span class="wl-dn">'+names[dd.getDay()]+'</span><span class="wl-dv">'+val+'</span></div>';
  }
  return '<div class="wl-week">'+cells+'</div>';
}
function _wLogMonth(logObj,valFn,unit,editFn){
  var now=new Date(), y=now.getFullYear(), m=now.getMonth(), today=now.getDate();
  var dim=new Date(y,m+1,0).getDate(), monthName=now.toLocaleDateString('ar-EG',{month:'long',year:'numeric'}), cells='', tot=0;
  for(var day=1;day<=dim;day++){ var d=new Date(y,m,day), k=dkey(d), val=valFn(logObj[k])||0, future=day>today; tot+=val;
    var clk=(editFn&&!future)?(' onclick="'+editFn+'(\''+k+'\')" style="cursor:pointer"'):'';
    cells+='<i class="wl-cell'+(future?' future':'')+(val>0?' lv'+_wLvl(val):'')+(day===today?' today':'')+'"'+clk+' title="'+day+': '+val+' '+unit+'"></i>';
  }
  return '<div class="wl-month-title">'+monthName+' · '+tot+' '+unit+'</div><div class="wl-month">'+cells+'</div>';
}
function _wLogYear(logObj,valFn,unit,editFn){
  var now=new Date(), y=now.getFullYear(), months=['ينا','فبر','مار','أبر','ماي','يون','يول','أغس','سبت','أكت','نوف','ديس'], rows='', tot=0;
  for(var m=0;m<12;m++){ var dim=new Date(y,m+1,0).getDate(), cells='';
    for(var day=1;day<=dim;day++){ var d=new Date(y,m,day), k=dkey(d), val=valFn(logObj[k])||0, future=d>now; tot+=val;
      var lv=future?'future':('lv'+_wLvl(val));
      var clk=(editFn&&!future)?(' onclick="'+editFn+'(\''+k+'\')" style="cursor:pointer"'):'';
      cells+='<i class="wl-pix '+lv+'"'+clk+' title="'+day+'/'+(m+1)+': '+val+' '+unit+'"></i>';
    }
    rows+='<div class="wl-pix-row"><span class="wl-pix-mon">'+months[m]+'</span><div class="wl-pix-cells">'+cells+'</div></div>';
  }
  return '<div class="wl-month-title">'+y+' · إجمالي '+tot+' '+unit+'</div><div class="wl-pix-board">'+rows+'</div>';
}
// ===== سجلّ الأذكار لكل ذِكر على حدة (تعديل رجعي تفصيلي — طلب نوح) =====
function adhkarDayLogObj(){ if(!S.adhkarDayLog||typeof S.adhkarDayLog!=='object')S.adhkarDayLog={}; return S.adhkarDayLog; }
function adhkarRecomputeDay(dk){
  var L=adhkarDayLogObj(); var day=L[dk]||{}; var tot=0;
  Object.keys(day).forEach(function(id){ tot+=day[id]||0; });
  if(!S.adhkarLog||typeof S.adhkarLog!=='object')S.adhkarLog={};
  if(tot<=0){ delete S.adhkarLog[dk]; if(L[dk])delete L[dk]; } else S.adhkarLog[dk]=tot;   // الإجمالي اليومي = مجموع كل ذِكر
}
// محرّر يوم سابق: عدد كل ذِكر في ذلك اليوم (داخل صفحة الأذكار فقط؛ الضبط يعدّل الإجمالي)
function adhkarDayEditor(dk){
  ensureAdhkarSeed();
  var L=adhkarDayLogObj(); var day=L[dk]||{};
  var ov=document.getElementById('adhkar-day-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='adhkar-day-overlay'; ov.className='ritual-overlay'; document.body.appendChild(ov);
    ov.addEventListener('click',function(e){ if(e.target===ov)closeAdhkarDayEditor(); }); }
  var rows=(S.adhkar||[]).map(function(a){
    return '<label class="de-field"><span style="border-inline-start:3px solid '+a.color+';padding-inline-start:7px">'+esc(a.name)+'</span>'+
      '<input type="number" min="0" id="adk-day-'+a.id+'" value="'+(day[a.id]||0)+'"></label>';
  }).join('')||'<span class="setting-sub">أضِف ذِكراً أولاً</span>';
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal ritual-modal-wide"><div class="ritual-header">'+
      '<div class="ritual-icon">📿</div><div class="ritual-title">أذكار يوم '+dk+'</div>'+
      '<div class="ritual-sub">عدّل عدد كل ذِكر في هذا اليوم بأثر رجعي</div></div>'+
    '<div class="ritual-body de-body"><div class="de-grid de-grid-adk">'+rows+'</div></div>'+
    '<div class="ritual-foot"><button class="btn pri" onclick="saveAdhkarDayEditor(\''+dk+'\')"><i data-lucide="check"></i> حفظ</button>'+
      '<button class="btn ghost" onclick="closeAdhkarDayEditor()">إلغاء</button></div></div>';
  icons();
}
function closeAdhkarDayEditor(){ var ov=document.getElementById('adhkar-day-overlay'); if(ov)ov.style.display='none'; }
function saveAdhkarDayEditor(dk){
  var L=adhkarDayLogObj(); if(!L[dk])L[dk]={};
  (S.adhkar||[]).forEach(function(a){
    var el=document.getElementById('adk-day-'+a.id); var n=Math.max(0,parseInt(el&&el.value)||0);
    if(n<=0)delete L[dk][a.id]; else L[dk][a.id]=n;
  });
  adhkarRecomputeDay(dk); save(); closeAdhkarDayEditor();
  if(typeof renderAdhkar==='function')renderAdhkar();
  notify('حُدّثت أذكار '+dk+' ✓','check-circle');
}

// ===== القرآن — daily ward + khatma + encouraging tier =====
function quranState(){ if(!S.quran)S.quran={khatmaPages:0,khatmaCount:0,log:{}}; if(!S.quran.log)S.quran.log={}; if(S.quran.khatmaPages==null)S.quran.khatmaPages=0; if(S.quran.khatmaCount==null)S.quran.khatmaCount=0; return S.quran; }
function quranTodayPages(){ return quranState().log[todayKey()]||0; }
function quranSum7(){ var q=quranState(),s=0; lastDaysKeys(7).forEach(function(k){s+=q.log[k]||0;}); return s; }
// (حُذف quranTier — كان ميتاً؛ أُزيلت مراتب «القانتين» من صفحة القرآن)
function renderQuran(){
  var el=document.getElementById('quran-body'); if(!el)return;
  var q=quranState(); var today=quranTodayPages();
  var pagesPerJuz=604/30, juz=Math.min(30,Math.max(1,Math.ceil((q.khatmaPages||1)/pagesPerJuz)));
  var pct=Math.min(100,Math.round((q.khatmaPages||0)/604*100));
  el.innerHTML=
    '<div class="card" data-cid="quran-wird">'+
      '<div class="card-title"><i data-lucide="sun"></i> وِرد اليوم</div>'+
      '<div class="ward-row">'+
        '<button class="step-btn" onclick="quranAddPages(-1)" title="إنقاص"><i data-lucide="minus"></i></button>'+
        '<div class="ward-val"><b id="quran-today">'+today+'</b><span>صفحة اليوم</span></div>'+
        '<button class="step-btn pos" onclick="quranAddPages(1)" title="صفحة"><i data-lucide="plus"></i></button>'+
      '</div>'+
      '<div class="ward-quick"><button class="chip-btn" onclick="quranAddPages(2)">+٢</button><button class="chip-btn" onclick="quranAddPages(5)">+٥</button><button class="chip-btn" onclick="quranAddPages(10)">+١٠ (حزب)</button><button class="chip-btn" onclick="quranAddPages(20)">+٢٠ (جزء)</button></div>'+
    '</div>'+
    '<div class="card" data-cid="quran-khatma">'+
      '<div class="card-title"><i data-lucide="book-marked"></i> الختمة الحالية'+(q.khatmaCount?(' · ختمات مكتملة: '+q.khatmaCount):'')+'</div>'+
      '<div class="khatma-top"><span>صفحة '+(q.khatmaPages||0)+' / 604</span><span>الجزء '+juz+' تقريبًا · '+pct+'%</span></div>'+
      '<div class="progress-track" style="height:12px"><div class="progress-fill" style="width:'+pct+'%;background:var(--green)"></div></div>'+
      '<div class="ward-quick" style="margin-top:.8rem"><button class="btn sm" onclick="quranResetKhatma()"><i data-lucide="rotate-ccw"></i> ختمة جديدة</button></div>'+
    '</div>'+
    worshipLogView(quranState().log,function(v){return v||0;},'سجل وِردك — القرآن (آخر ٧ أيام: '+quranSum7()+' صفحة)','صفحة','quranEditCell',true,'quran');
  icons();
  populateSurahList();
}
// فهرس القرآن الكامل: ١١٤ سورة بعدد آياتها — للتسجيل الواقعي بالسورة والآية (لا كلام حر)
var SURAHS=[['الفاتحة',7],['البقرة',286],['آل عمران',200],['النساء',176],['المائدة',120],['الأنعام',165],['الأعراف',206],['الأنفال',75],['التوبة',129],['يونس',109],['هود',123],['يوسف',111],['الرعد',43],['إبراهيم',52],['الحجر',99],['النحل',128],['الإسراء',111],['الكهف',110],['مريم',98],['طه',135],['الأنبياء',112],['الحج',78],['المؤمنون',118],['النور',64],['الفرقان',77],['الشعراء',227],['النمل',93],['القصص',88],['العنكبوت',69],['الروم',60],['لقمان',34],['السجدة',30],['الأحزاب',73],['سبأ',54],['فاطر',45],['يس',83],['الصافات',182],['ص',88],['الزمر',75],['غافر',85],['فصلت',54],['الشورى',53],['الزخرف',89],['الدخان',59],['الجاثية',37],['الأحقاف',35],['محمد',38],['الفتح',29],['الحجرات',18],['ق',45],['الذاريات',60],['الطور',49],['النجم',62],['القمر',55],['الرحمن',78],['الواقعة',96],['الحديد',29],['المجادلة',22],['الحشر',24],['الممتحنة',13],['الصف',14],['الجمعة',11],['المنافقون',11],['التغابن',18],['الطلاق',12],['التحريم',12],['الملك',30],['القلم',52],['الحاقة',52],['المعارج',44],['نوح',28],['الجن',28],['المزمل',20],['المدثر',56],['القيامة',40],['الإنسان',31],['المرسلات',50],['النبأ',40],['النازعات',46],['عبس',42],['التكوير',29],['الانفطار',19],['المطففين',36],['الانشقاق',25],['البروج',22],['الطارق',17],['الأعلى',19],['الغاشية',26],['الفجر',30],['البلد',20],['الشمس',15],['الليل',21],['الضحى',11],['الشرح',8],['التين',8],['العلق',19],['القدر',5],['البينة',8],['الزلزلة',8],['العاديات',11],['القارعة',11],['التكاثر',8],['العصر',3],['الهمزة',9],['الفيل',5],['قريش',4],['الماعون',7],['الكوثر',3],['الكافرون',6],['النصر',3],['المسد',5],['الإخلاص',4],['الفلق',5],['الناس',6]];
function findSurah(name){
  name=(name||'').trim().replace(/^سورة\s+/,'').replace(/[إأآ]/g,'ا');
  for(var i=0;i<SURAHS.length;i++){ if(SURAHS[i][0].replace(/[إأآ]/g,'ا')===name)return {name:SURAHS[i][0],ayahs:SURAHS[i][1],idx:i+1}; }
  return null;
}
function populateSurahList(){
  var dl=document.getElementById('surah-list'); if(!dl||dl.children.length)return;
  dl.innerHTML=SURAHS.map(function(s){ return '<option value="'+s[0]+'">'+s[1]+' آية</option>'; }).join('');
}
function quranReadsHtml(){
  var q=quranState(), tk=todayKey(); var reads=(q.reads||[]).filter(function(r){return r.date===tk;});
  if(!reads.length)return '<div class="empty" style="padding:.7rem"><i data-lucide="book-open"></i><div>لا تسجيل بالسورة اليوم بعد</div></div>';
  return reads.map(function(r){ return '<div class="quran-read"><i data-lucide="book-open"></i><span>'+esc(r.surah)+' — من الآية '+r.from+' إلى '+r.to+'</span><button class="icon-btn" onclick="quranDeleteRead('+r.id+')" title="حذف"><i data-lucide="x"></i></button></div>'; }).join('');
}
function quranAddRead(){
  var s=document.getElementById('quran-surah'), f=document.getElementById('quran-from'), to=document.getElementById('quran-to');
  var surahName=(s&&s.value.trim())||''; if(!surahName)return;
  // تحقّق واقعي: السورة من الفهرس، والآيات لا تتجاوز عدد آياتها الفعلي
  var su=findSurah(surahName);
  if(!su){ notify('اختر سورة من الفهرس — «'+surahName+'» ليست في المصحف','alert-triangle'); if(s)s.focus(); return; }
  var from=Math.max(1,parseInt(f&&f.value)||1), tov=Math.max(from,parseInt(to&&to.value)||from);
  if(from>su.ayahs){ notify('سورة '+su.name+' آياتها '+su.ayahs+' فقط','alert-triangle'); return; }
  if(tov>su.ayahs){ tov=su.ayahs; notify('قُصرت النهاية إلى آخر آية ('+su.ayahs+')','info'); }
  var q=quranState(); if(!Array.isArray(q.reads))q.reads=[];
  q.reads.unshift({id:Date.now(),surah:su.name,from:from,to:tov,date:todayKey()});
  if(s)s.value=''; if(f)f.value=''; if(to)to.value='';
  save(); renderQuran();
}
function quranDeleteRead(id){ var q=quranState(); q.reads=(q.reads||[]).filter(function(r){return r.id!==id;}); save(); renderQuran(); }
/* (أُلغي محرّر «اكتب التاريخ» — التعديل الآن بنقرة مباشرة على خلايا السجل: quranEditCell) */
function quranAddPages(n){
  var q=quranState(), tk=todayKey();
  q.log[tk]=Math.max(0,(q.log[tk]||0)+n);
  if(n>0){
    q.khatmaPages=(q.khatmaPages||0)+n;
    if(q.khatmaPages>=604){ q.khatmaPages=q.khatmaPages-604; q.khatmaCount=(q.khatmaCount||0)+1; notify('بارك الله فيك — أتممت ختمة! 🎉','party-popper'); }
  }
  save(); renderQuran();
}
function quranResetKhatma(){ var q=quranState(); q.khatmaPages=0; save(); renderQuran(); notify('بدأنا ختمة جديدة — وفّقك الله','book-marked'); }

// ===== قيام الليل — witr + rakahs + encouraging tier =====
function qiyamState(){ if(!S.qiyam)S.qiyam={log:{}}; if(!S.qiyam.log)S.qiyam.log={}; return S.qiyam; }
function qiyamToday(){ var q=qiyamState(); var r=q.log[todayKey()]; if(!r){r={witr:0,rakahs:0};} return r; }
function qiyamNights7(){ var q=qiyamState(),n=0; lastDaysKeys(7).forEach(function(k){var r=q.log[k]; if(r&&((r.rakahs||0)>0||(r.witr||0)>0))n++;}); return n; }
function qiyamStreak(){ var q=qiyamState(),s=0,d=new Date(); for(var i=0;i<400;i++){var r=q.log[dkey(d)]; if(r&&((r.rakahs||0)>0||(r.witr||0)>0))s++; else break; d.setDate(d.getDate()-1);} return s; }
// (حُذف qiyamTier — كان ميتاً؛ أُزيلت مراتب القيام)
function renderQiyam(){
  var el=document.getElementById('qiyam-body'); if(!el)return;
  var r=qiyamToday();
  el.innerHTML=
    '<div class="card" data-cid="qiyam-tonight">'+
      '<div class="card-title"><i data-lucide="moon"></i> قيام الليلة</div>'+
      '<div class="qiyam-grid">'+
        '<div class="qiyam-cell"><div class="qc-label">ركعات القيام</div><div class="ward-row"><button class="step-btn" onclick="qiyamStep(\'rakahs\',-2)"><i data-lucide="minus"></i></button><div class="ward-val"><b id="qiyam-rakahs">'+(r.rakahs||0)+'</b><span>ركعة</span></div><button class="step-btn pos" onclick="qiyamStep(\'rakahs\',2)"><i data-lucide="plus"></i></button></div></div>'+
        '<div class="qiyam-cell"><div class="qc-label">الوتر</div><div class="ward-row"><button class="step-btn" onclick="qiyamStep(\'witr\',-1)"><i data-lucide="minus"></i></button><div class="ward-val"><b id="qiyam-witr">'+(r.witr||0)+'</b><span>ركعة</span></div><button class="step-btn pos" onclick="qiyamStep(\'witr\',1)"><i data-lucide="plus"></i></button></div></div>'+
      '</div>'+
      '<div class="qiyam-streak"><i data-lucide="flame"></i> سلسلة القيام: <b>'+qiyamStreak()+'</b> ليلة متتالية · قيام آخر ٧ ليالٍ: '+qiyamNights7()+'</div>'+
    '</div>'+
    worshipLogView(qiyamState().log,function(r){return r?((r.rakahs||0)+(r.witr||0)):0;},'سجل لياليك — القيام','ركعة','qiyamEditCell',true,'qiyam');
  icons();
}
function qiyamStep(field,delta){
  var q=qiyamState(), tk=todayKey();
  if(!q.log[tk])q.log[tk]={witr:0,rakahs:0};
  q.log[tk][field]=Math.max(0,(q.log[tk][field]||0)+delta);
  save(); renderQiyam();
}

// ===== الأذكار — flexible tasbeeh counters (33 / 100 / 1000 / custom) =====
var DEFAULT_ADHKAR=[
  {name:'سبحان الله',target:33,color:'#0d9488'},
  {name:'الحمد لله',target:33,color:'#5750d8'},
  {name:'الله أكبر',target:34,color:'#d97706'},
  {name:'أستغفر الله',target:100,color:'#7c3aed'},
  {name:'لا إله إلا الله',target:100,color:'#0284c7'},
  {name:'اللهم صلِّ على محمد',target:100,color:'#dc2626'}
];
function ensureAdhkarSeed(){
  if(!Array.isArray(S.adhkar))S.adhkar=[];
  if(!S.adhkar.length&&!S.adhkarSeeded){
    S.adhkar=DEFAULT_ADHKAR.map(function(d,i){ return {id:Date.now()+i,name:d.name,target:d.target,today:0,total:0,lastDate:todayKey(),color:d.color}; });
    S.adhkarSeeded=true; save();
  }
}
function adhkarRollover(){
  if(!Array.isArray(S.adhkar))return; var tk=todayKey(),changed=false;
  S.adhkar.forEach(function(a){ if(a.lastDate!==tk){ a.today=0; a.lastDate=tk; changed=true; } });
  if(changed)save();
  return changed;
}
// تصفير تلقائي في الخلفية عند تبدّل اليوم — يُعيد رسم صفحة الأذكار إن كانت مفتوحة
function autoAdhkarReset(){
  if(!Array.isArray(S.adhkar)||!S.adhkar.length)return;
  var changed=adhkarRollover();
  if(changed&&currentPage==='habits'){ try{ renderAdhkar(); }catch(e){} }   // الأذكار اندمجت في صفحة العادات
}
// ===== الأذكار — بطاقة موحّدة: ✓ يُكمل الهدف + زر +١٠ (طلب نوح: لا «اضغط للتسبيح»، لا مبدّل وضع) =====
// إعادة ترتيب الأذكار بالسحب (تُحفظ في ترتيب S.adhkar نفسه)
var _adkDragId=null;
function adhkarDragStart(e,id){ _adkDragId=id; if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',String(id));}catch(_){} } }
function adhkarDragOver(e){ if(_adkDragId==null)return; e.preventDefault(); if(e.dataTransfer)e.dataTransfer.dropEffect='move'; }
function adhkarDrop(e,id){
  if(_adkDragId==null&&e.dataTransfer){ try{ _adkDragId=parseInt(e.dataTransfer.getData('text/plain')); }catch(_){} }
  if(_adkDragId==null||_adkDragId===id){ _adkDragId=null; return; }
  e.preventDefault();
  var arr=S.adhkar||[], from=-1, to=-1;
  for(var i=0;i<arr.length;i++){ if(arr[i].id===_adkDragId)from=i; if(arr[i].id===id)to=i; }
  _adkDragId=null;
  if(from<0||to<0||from===to)return;
  var m=arr.splice(from,1)[0]; arr.splice(to,0,m); save(); renderAdhkar();
}
function renderAdhkar(){
  ensureAdhkarSeed(); adhkarRollover();
  var el=document.getElementById('adhkar-list'); if(!el)return;
  if(!S.adhkar||!S.adhkar.length){ el.innerHTML='<div class="empty" style="padding:1.5rem"><i data-lucide="heart"></i><div>لا أذكار بعد — أضِف ذِكرك بالأعلى (٣٣ / ١٠٠ / ١٠٠٠)</div></div>'; icons(); return; }
  var cards=S.adhkar.map(function(a){
    var pct=a.target>0?Math.min(100,Math.round((a.today||0)/a.target*100)):0;
    var done=(a.today||0)>=a.target;
    return '<div class="dhikr-card'+(done?' done':'')+'" style="--dc:'+a.color+';border-inline-start:4px solid '+a.color+'"'+
        ' draggable="true" ondragstart="adhkarDragStart(event,'+a.id+')" ondragover="adhkarDragOver(event)" ondrop="adhkarDrop(event,'+a.id+')">'+
      '<span class="dhikr-grip" title="اسحب لإعادة الترتيب"><i data-lucide="grip-vertical"></i></span>'+
      '<div class="dhikr-box"><span class="dhikr-name">'+esc(a.name)+'</span>'+
        '<span class="dhikr-count"><b id="adhkar-today-'+a.id+'">'+(a.today||0)+'</b> / '+a.target+'</span></div>'+
      '<div class="dhikr-bar"><div class="dhikr-bar-fill" id="adhkar-bar-'+a.id+'" style="width:'+pct+'%;background:'+a.color+'"></div></div>'+
      '<div class="dhikr-actions">'+
        '<button class="dch-check'+(done?' on':'')+'" style="--dc:'+a.color+'" onclick="adhkarToggleDone('+a.id+')" title="أكمل الهدف اليومي بنقرة"><i data-lucide="check"></i></button>'+
        '<button class="chip-btn" onclick="adhkarBump('+a.id+',10)" title="أضِف ١٠ دفعة واحدة">+١٠</button>'+
        '<button class="icon-btn" onclick="adhkarReset('+a.id+')" title="تصفير اليوم"><i data-lucide="rotate-ccw"></i></button>'+
        '<button class="icon-btn" onclick="adhkarDelete('+a.id+')" title="حذف"><i data-lucide="trash-2"></i></button>'+
        '<span class="dhikr-total">الإجمالي: <b id="adhkar-total-'+a.id+'">'+(a.total||0)+'</b></span>'+
      '</div>'+
    '</div>';
  }).join('');
  // السجل (أسبوع/شهر/سنة) — اضغط أي يوم لتعديل كل ذِكر فيه على حدة (adhkarDayEditor). المبدّل العلوي يشمله.
  var log=worshipLogView(S.adhkarLog||{},function(v){return v||0;},'سجل أذكارك','تسبيحة','adhkarDayEditor',true,'adhkar');
  el.innerHTML=cards;
  var lw=document.getElementById('adhkar-log-wrap'); if(lw)lw.innerHTML=log;   // السجل خارج حاوية الأعمدة → عرض كامل متناسق (طلب نوح)
  icons();
}
function adhkarSetTarget(v){ var n=document.getElementById('adhkar-target'); if(n)n.value=v; }
// (حُذف addAdhkar — كان ميتاً؛ الإضافة موحّدة عبر addHabitOrDhikr، وحقل adhkar-name أُزيل)
// سجلّ يومي للأذكار: إجمالي اليوم + تفصيل لكل ذِكر (للسجل المرئي + التعديل الرجعي التفصيلي)
function adhkarLogAdd(n,id){
  if(!S.adhkarLog||typeof S.adhkarLog!=='object')S.adhkarLog={}; var tk=todayKey();
  S.adhkarLog[tk]=Math.max(0,(S.adhkarLog[tk]||0)+n); if(S.adhkarLog[tk]===0)delete S.adhkarLog[tk];
  if(id!=null){ var L=adhkarDayLogObj(); if(!L[tk])L[tk]={}; L[tk][id]=Math.max(0,(L[tk][id]||0)+n); if(L[tk][id]===0)delete L[tk][id]; if(!Object.keys(L[tk]).length)delete L[tk]; }
}
// ✓ يُكمل الهدف اليومي (today=target) أو يُلغيه (today=0) — البديل الموحّد لـ«اضغط للتسبيح»
function adhkarToggleDone(id){
  var a=(S.adhkar||[]).find(function(x){return x.id===id;}); if(!a)return;
  var tk=todayKey(); if(a.lastDate!==tk){ a.today=0; a.lastDate=tk; }
  var was=(a.today||0)>=a.target;
  var delta=was?(-(a.today||0)):(a.target-(a.today||0));
  a.today=was?0:a.target; a.total=Math.max(0,(a.total||0)+delta); adhkarLogAdd(delta,id);
  save(); renderAdhkar(); if(typeof playClick==='function')playClick();
}
// إضافة عدد دفعة واحدة (زر +١٠) — تسريع التسجيل اليدوي
function adhkarBump(id,n){
  var a=(S.adhkar||[]).find(function(x){return x.id===id;}); if(!a)return;
  var tk=todayKey(); if(a.lastDate!==tk){ a.today=0; a.lastDate=tk; }
  a.today=(a.today||0)+n; a.total=(a.total||0)+n; adhkarLogAdd(n,id);
  if(a.target>0&&Math.floor(a.today/a.target)>Math.floor((a.today-n)/a.target)){ notify('بلغتَ هدف «'+a.name+'» 🤍','check-circle'); try{playBeep();}catch(e){} }
  save(); renderAdhkar(); if(typeof playClick==='function')playClick();
}
// (حُذف adhkarTick — كان ميتاً؛ البديل الموحّد adhkarToggleDone/adhkarBump)
function adhkarReset(id){ var a=(S.adhkar||[]).find(function(x){return x.id===id;}); if(!a)return; a.today=0; a.lastDate=todayKey(); save(); renderAdhkar(); }
// حذف فوري + تراجُع ٦ ثوانٍ
function adhkarDelete(id){
  var i=(S.adhkar||[]).findIndex(function(x){return x.id===id;}); if(i<0)return;
  var d=S.adhkar[i];
  S.adhkar.splice(i,1); save(); renderAdhkar();
  undoToast('حُذف «'+esc((d.name||'').slice(0,24))+'»',function(){
    S.adhkar.splice(Math.min(i,S.adhkar.length),0,d); save(); renderAdhkar();
  });
}

// ===== prayer reminders (−10 min) + adhan tone =====
function worshipCfg(){ if(!S.worship)S.worship={preReminder:true,preMin:10,adhanOn:false,postReminder:false,postMin:15,customAdhan:false}; var w=S.worship; if(w.preReminder==null)w.preReminder=true; if(w.preMin==null)w.preMin=10; if(w.adhanOn==null)w.adhanOn=false; if(w.postReminder==null)w.postReminder=false; if(w.postMin==null)w.postMin=15; if(w.customAdhan==null)w.customAdhan=false; return w; }
function checkPrayerReminders(){
  if(typeof getTodayPrayers!=='function')return;
  var w=worshipCfg(); var tp=getTodayPrayers(); var now=new Date(); var tk=todayKey();
  if(!S.prayerNotified)S.prayerNotified={};
  // prune old days to keep state tiny
  Object.keys(S.prayerNotified).forEach(function(k){ if(k!==tk)delete S.prayerNotified[k]; });
  if(!S.prayerNotified[tk])S.prayerNotified[tk]={};
  var flags=S.prayerNotified[tk], changed=false, preMin=w.preMin||10;
  PRAYER_KEYS.forEach(function(k){
    var v=tp[k]; if(!v)return; var t=hmToDate(v);
    if(w.preReminder!==false){
      var pre=new Date(t.getTime()-preMin*60000);
      if(now>=pre&&now<t&&!flags[k+'_pre']){ flags[k+'_pre']=true; changed=true; notifyDesktop('اقتربت صلاة '+PRAYER_AR[k]+' 🤍','بقي '+preMin+' دقائق — استعدّ وتهيّأ'); }
    }
    if(now>=t&&now<new Date(t.getTime()+60000)&&!flags[k+'_at']){
      flags[k+'_at']=true; changed=true;
      notifyDesktop('حان وقت صلاة '+PRAYER_AR[k]+' 🕌','حيّ على الصلاة، حيّ على الفلاح');
      if(w.adhanOn)playAdhanTone();
    }
    // تنبيه مؤجّل (المهمة ١٨): تذكير بعد الأذان بـ postMin دقيقة إن لم تُسجَّل الصلاة بعد
    if(w.postReminder){
      var post=new Date(t.getTime()+(w.postMin||15)*60000);
      var stt=(typeof getPT==='function')?getPT(tk,k).status:'none';
      if(now>=post&&now<new Date(post.getTime()+60000)&&!flags[k+'_post']&&stt==='none'){
        flags[k+'_post']=true; changed=true;
        notifyDesktop('هل صلّيت '+PRAYER_AR[k]+'؟ ⏰','مرّت '+(w.postMin||15)+' دقيقة على الأذان — بادر بصلاتك أو سجّلها');
      }
    }
  });
  if(changed)save();
}
var _adhanCtx=null, _adhanSrc=null;
function adhanId(){ return 'adhan-'+(typeof activeProfileId!=='undefined'?activeProfileId:'noah'); }
// تشغيل الأذان: ملف مخصّص مرفوع (عبر WebAudio decodeAudioData — آمن CSP) إن وُجد، وإلا النغمة المولّدة
function playAdhanTone(){
  var w=worshipCfg();
  if(w.customAdhan&&typeof mediaGet==='function'){
    mediaGet(adhanId()).then(function(r){
      if(r&&r.blob){ playAdhanBlob(r.blob); } else { playAdhanSynth(); }
    }).catch(playAdhanSynth);
    return;
  }
  playAdhanSynth();
}
function playAdhanBlob(blob){
  try{
    stopAdhanTone();
    var fr=new FileReader();
    fr.onload=function(){
      try{
        _adhanCtx=new(window.AudioContext||window.webkitAudioContext)();
        _adhanCtx.decodeAudioData(fr.result,function(buf){
          var src=_adhanCtx.createBufferSource(); src.buffer=buf; src.connect(_adhanCtx.destination); src.start(); _adhanSrc=src;
        },function(){ playAdhanSynth(); });
      }catch(e){ playAdhanSynth(); }
    };
    fr.readAsArrayBuffer(blob);
  }catch(e){ playAdhanSynth(); }
}
function playAdhanSynth(){
  try{
    stopAdhanTone();
    _adhanCtx=new(window.AudioContext||window.webkitAudioContext)();
    var ctx=_adhanCtx, t0=ctx.currentTime;
    // a gentle, respectful call-tone (synthesized — no recording, no copyright, CSP-safe)
    var notes=[392.00,440.00,523.25,440.00,392.00]; // G A C A G — calm ascending then settle
    notes.forEach(function(f,i){
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.value=f; o.connect(g); g.connect(ctx.destination);
      var st=t0+i*0.55, en=st+0.5;
      g.gain.setValueAtTime(0.0001,st);
      g.gain.exponentialRampToValueAtTime(0.22,st+0.06);
      g.gain.exponentialRampToValueAtTime(0.0001,en);
      o.start(st); o.stop(en+0.02);
    });
    setTimeout(stopAdhanTone,3600);
  }catch(e){}
}
function stopAdhanTone(){ if(_adhanSrc){ try{_adhanSrc.stop();}catch(e){} _adhanSrc=null; } if(_adhanCtx){ try{_adhanCtx.close();}catch(e){} _adhanCtx=null; } }
// رفع/إزالة أذان مخصّص (يُخزَّن كـ Blob في mediaBlobs — يُشغَّل عبر WebAudio بلا مسّ CSP)
function uploadAdhan(e){
  var f=e.target&&e.target.files&&e.target.files[0]; if(!f)return;
  if(typeof mediaPut!=='function'){ notify('غير متاح هنا','x-circle'); return; }
  if(!/^audio\//.test(f.type)){ notify('اختر ملفاً صوتياً','x-circle'); return; }
  mediaPut({id:adhanId(),kind:'adhan',profileId:(typeof activeProfileId!=='undefined'?activeProfileId:'noah')},f).then(function(){
    var w=worshipCfg(); w.customAdhan=true; w.adhanOn=true; save(); renderWorshipSettings();
    notify('تم تعيين الأذان المخصّص ✓','check-circle');
  }).catch(function(){ notify('تعذّر حفظ الأذان','x-circle'); });
}
function removeAdhan(){
  if(typeof mediaDelete==='function'){ try{ mediaDelete(adhanId()); }catch(e){} }
  var w=worshipCfg(); w.customAdhan=false; save(); renderWorshipSettings();
  notify('عاد إلى النغمة المولّدة','info');
}

// ===== worship settings (rendered into the settings page) =====
function renderWorshipSettings(){
  var el=document.getElementById('worship-ctrl'); if(!el)return;
  var w=worshipCfg();
  el.innerHTML=
    '<label class="grad-row"><span>تذكير قبل الصلاة</span><input type="checkbox" '+(w.preReminder!==false?'checked':'')+' onchange="worshipChange()"></label>'+
    '<div class="grad-row"><span>قبل الأذان بـ (دقيقة)</span><input type="number" min="1" max="60" value="'+(w.preMin||10)+'" id="wset-premin" style="width:70px" oninput="worshipChange()"></div>'+
    '<label class="grad-row"><span>تنبيه مؤجّل بعد الأذان (إن لم تُسجَّل)</span><input type="checkbox" id="wset-post" '+(w.postReminder?'checked':'')+' onchange="worshipChange()"></label>'+
    '<div class="grad-row"><span>بعد الأذان بـ (دقيقة)</span><input type="number" min="1" max="120" value="'+(w.postMin||15)+'" id="wset-postmin" style="width:70px" oninput="worshipChange()"></div>'+
    '<label class="grad-row"><span>تشغيل نغمة أذان عند الوقت</span><input type="checkbox" id="wset-adhan" '+(w.adhanOn?'checked':'')+' onchange="worshipChange()"></label>'+
    '<div class="grad-row"><span>أذان مخصّص'+(w.customAdhan?' <b style="color:var(--green-text)">(مُعيَّن ✓)</b>':' (اختياري)')+'</span>'+
      '<span style="display:flex;gap:.4rem;align-items:center">'+
        '<label class="btn sm" style="cursor:pointer;margin:0"><i data-lucide="upload"></i> رفع ملف<input type="file" accept="audio/*" onchange="uploadAdhan(event)" style="display:none"></label>'+
        (w.customAdhan?'<button class="icon-btn" onclick="removeAdhan()" title="إزالة المخصّص"><i data-lucide="trash-2"></i></button>':'')+
      '</span></div>'+
    '<div class="grad-row"><span>تجربة الأذان</span><button class="btn sm" onclick="playAdhanTone()"><i data-lucide="play"></i> اختبار</button></div>';
  // tag the pre-reminder checkbox so worshipChange can read it (first checkbox)
  var cbs=el.querySelectorAll('input[type=checkbox]'); if(cbs[0])cbs[0].id='wset-pre';
  icons();
}
function worshipChange(){
  var w=worshipCfg();
  var pre=document.getElementById('wset-pre'); if(pre)w.preReminder=!!pre.checked;
  var pm=document.getElementById('wset-premin'); if(pm)w.preMin=Math.max(1,parseInt(pm.value)||10);
  var po=document.getElementById('wset-post'); if(po)w.postReminder=!!po.checked;
  var pom=document.getElementById('wset-postmin'); if(pom)w.postMin=Math.max(1,parseInt(pom.value)||15);
  var ad=document.getElementById('wset-adhan'); if(ad)w.adhanOn=!!ad.checked;
  save();
}
