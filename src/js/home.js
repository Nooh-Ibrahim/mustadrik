// home.js — home + "what now?" command center, quotes, goals
// module 9/10 of the former renderer.js — classic script (globals shared, no ES modules)

function showQuote(){var q=document.getElementById('quote-text');if(q)q.textContent=todayQuote;var hq=document.getElementById('home-quote');if(hq)hq.textContent=todayQuote;}

// Home
function renderHome(){
  var h=new Date().getHours();
  var greet=(h<12?'صباح الخير':(h<18?'مساء النور':'مساء الخير'));
  document.getElementById('greeting').innerHTML='<i data-lucide="layout-dashboard"></i> '+esc(withName(greet));
  var wd=new Date().toLocaleDateString('ar-EG',{weekday:'long'});
  var custom=formatIslamicDate(new Date());                         // [ن س] 2026 - [ر هـ ش] 06 - [م و ي] 03
  var hij='';try{hij=' — '+new Date().toLocaleDateString('ar-SA-u-ca-islamic',{day:'numeric',month:'long',year:'numeric'});}catch(e){}
  document.getElementById('home-date').textContent=wd+' — '+custom+hij;
  // (حُذفت بطاقتا «نظرة سريعة على اليوم» و«الصلاة القادمة» نهائياً من DOM — طلب المالك ٢٥ يونيو ٢٠٢٦)
  renderPrayerAlert();  // red "قُم فاقضِ" card for missed prayers + gentle prompt for unlogged ones
  renderHomeGoal();
  renderCommandCenter();
  if(typeof refreshBestPeriod==='function')refreshBestPeriod();   // ⑤ حدّث «أنشط فترة» لتغذية لمحة «ماذا الآن؟»
  if(typeof renderIslamicCard==='function')renderIslamicCard();   // ④ التقويم الهجري + المناسبات + القبلة
  if(typeof renderMedCard==='function')renderMedCard();           // ⑩ بطاقة الدواء (خاصّة، تظهر عند التفعيل فقط)
  renderDailyRecap();   // بطاقة إنجاز اليوم (محاسبة لحظية)
  renderMaqasid();      // مؤشّر المقاصد البصري (هدف الدقائق: اليوم/الأسبوع)
  renderRiseHome();     // النهوض: سند نفسي + انتصارات + إنجازات
  if(typeof renderDailyLight==='function')renderDailyLight();   // نور اليوم: آية + حديث + آية النهوض
  renderEnergyMeter();  // مقياس الطاقة
  renderNiyyahDisplay(); // عرض النية الصباحية
  updatePrayerStatusBar(); // شريط اليوم الإسلامي (الكبسولة)
  if(typeof renderExamCountdown==='function')renderExamCountdown();  // العدّ التنازلي لأقرب موعد
  if(typeof renderSrsCard==='function')renderSrsCard();             // المراجعة المتباعدة
  if(typeof renderTodayClasses==='function')renderTodayClasses();   // محاضرات النهارده (تختفي لو مافيش)
  if(typeof renderPhaseBanner==='function')renderPhaseBanner();     // شريط التحوّل لمرحلة جديدة
  // (أُزيل المخطط البصري لليوم نهائياً — المرحلة ١)
  showQuote();icons();
}
// (حُذف نظام سحب الودجت القديم بالكامل — توحّد كل شيء في نظام البطاقات cards.js)
// ===== dashboard prayer alert (missed → red "قُم فاقضِ"; passed-but-unlogged → gentle prompt) =====
function renderPrayerAlert(){
  var el=document.getElementById('home-prayer-alert'); if(!el)return;
  var pt=S.prayerTrack||{}, missed=0;
  Object.keys(pt).forEach(function(dk){PRAYER_KEYS.forEach(function(k){if(pt[dk][k]&&pt[dk][k].status==='missed')missed++;});});
  // today's prayers whose time has passed but status is still "none"
  var tp=(S.prayerWeek&&S.prayerWeek[DAYS[new Date().getDay()]])||{}, now=new Date(), tkey=todayKey(), unlogged=[];
  PRAYER_KEYS.forEach(function(k){var v=tp[k];if(!v)return;var p=v.split(':');var t=new Date();t.setHours(parseInt(p[0]),parseInt(p[1]),0,0);var st=getPT(tkey,k).status;if(t<now&&st==='none')unlogged.push(PRAYER_AR[k]);});
  var html='';
  if(missed>0){
    html+='<div class="prayer-alert danger"><i data-lucide="alert-octagon"></i>'+
      '<div class="pa-text"><div class="pa-title">قُم فاقضِ صلواتك ('+missed+')</div>'+
      '<div class="pa-sub">لديك صلوات فائتة بانتظار القضاء. أدِّها ثم سجّلها «قضاء» في المتتبّع.</div></div>'+
      '<button class="btn sm" onclick="navTo(\'praytrack\')"><i data-lucide="arrow-left"></i> المتتبّع</button></div>';
  }
  if(unlogged.length){
    html+='<div class="prayer-alert warn"><i data-lucide="bell-ring"></i>'+
      '<div class="pa-text"><div class="pa-title">صلوات لم تُسجَّل بعد</div>'+
      '<div class="pa-sub">مرّ وقت: '+unlogged.join('، ')+' — سجّل ما حدث لتقرّر الإجراء.</div></div>'+
      '<button class="btn sm" onclick="navTo(\'praytrack\')"><i data-lucide="pencil"></i> سجّل الآن</button></div>';
  }
  el.innerHTML=html;
  el.style.display=html?'':'none';   // بلاطة التنبيهات تختفي تماماً حين لا تنبيهات (لا إطار فارغ)
  icons();
}
// ===== COMMAND CENTER ("ماذا الآن؟") — single suggested next action =====
function pickTopTask(){
  var pending=(S.tasks||[]).filter(function(t){return !t.done;});
  if(!pending.length)return null;
  var po={high:0,mid:1,low:2};
  pending.sort(function(a,b){
    var ad=a.deadline?parseLocalDate(a.deadline).getTime():Infinity;
    var bd=b.deadline?parseLocalDate(b.deadline).getTime():Infinity;
    if(ad!==bd)return ad-bd;
    return (po[a.priority]||1)-(po[b.priority]||1);
  });
  return pending[0];
}
function suggestHabit(){
  var tk=todayKey();
  var h=(S.habits||[]).find(function(x){return !(x.log&&x.log[tk]);});
  return h?h.name:null;
}
function quickStartSession(){ currentTaskId=null; currentTaskName=''; navTo('pomodoro'); setTimeout(function(){ if(!isRunning){resetTimer();startTimer();} },90); }
function renderCommandCenter(){
  var el=document.getElementById('cmd-center'); if(!el)return;
  var todayMin=S.activityLog[todayKey()]||0;
  var eyebrow,title,sub,actions;
  if(isRunning){
    eyebrow='<i data-lucide="timer"></i> جلسة قيد التشغيل';
    title='أنت في جلسة تركيز الآن 🎯';
    sub=currentTaskName?('تعمل على: '+esc(currentTaskName)):'ابقَ مركّزاً — أنت تقوم بعمل رائع.';
    actions='<button class="btn pri cmd-btn-main" onclick="navTo(\'pomodoro\')"><i data-lucide="eye"></i> العودة للجلسة</button>';
  }else{
    var top=pickTopTask();
    if(top){
      var todayMid=new Date(new Date().toDateString()).getTime();
      var dl=top.deadline?parseLocalDate(top.deadline).getTime():null;
      eyebrow='<i data-lucide="compass"></i> ماذا الآن؟';
      if(dl!==null&&dl<todayMid){ title='أنجِز المتأخّر: '+esc(top.text); sub='ابدأ بـ ٢٠ دقيقة فقط — خطوة واحدة تكفي لتتحرّك.'; }
      else if(dl!==null&&dl===todayMid){ title='موعد اليوم: '+esc(top.text); sub='لنبدأها الآن بجلسة تركيز قصيرة قبل أن ينتهي اليوم.'; }
      else{ title='ابدأ بـ: '+esc(top.text); sub='هذه أهم خطوة الآن. ابدأ بـ ٢٠ دقيقة فقط — لا تفكّر في الباقي.'; }
      actions='<button class="btn pri cmd-btn-main" onclick="startTaskTimer('+top.id+')"><i data-lucide="play"></i> ابدأ جلسة لهذه المهمة</button>'+
              '<button class="btn cmd-btn-soft" onclick="openTaskJar()" title="عالق في الاختيار؟ دَع القرعة تحسم"><i data-lucide="dices"></i> اختر لي</button>'+
              '<button class="btn cmd-btn-soft" onclick="navTo(\'tasks\')"><i data-lucide="list-todo"></i> مهمة أخرى</button>';
    }else if(todayMin===0){
      eyebrow='<i data-lucide="sunrise"></i> ابدأ يومك';
      title='ابدأ أول جلسة تركيز اليوم';
      sub='٢٠ دقيقة فقط تكسر حاجز البداية — أنت أقرب مما تظن.';
      actions='<button class="btn pri cmd-btn-main" onclick="quickStartSession()"><i data-lucide="play"></i> ابدأ جلسة ٢٠ دقيقة</button>'+
              '<button class="btn cmd-btn-soft" onclick="navTo(\'tasks\')"><i data-lucide="plus"></i> أضف مهمة</button>';
    }else{
      var habitSug=suggestHabit();
      eyebrow='<i data-lucide="party-popper"></i> '+esc(withName('أحسنت'));
      title='أنجزت '+todayMin+' دقيقة اليوم 🎉';
      sub=habitSug?('بقيت خطوة صغيرة: '+esc(habitSug)):'لا مهام معلّقة — أضف هدفاً جديداً أو خذ راحة تستحقها.';
      actions='<button class="btn pri cmd-btn-main" onclick="quickStartSession()"><i data-lucide="plus"></i> جلسة إضافية</button>'+
              (habitSug?'<button class="btn cmd-btn-soft" onclick="navTo(\'habits\')"><i data-lucide="repeat"></i> سجّل عادة</button>':'<button class="btn cmd-btn-soft" onclick="navTo(\'goals\')"><i data-lucide="flag"></i> أهدافي</button>');
    }
  }
  // ⑤ لمحة ذكية: لو الفترة الصلاتية الحالية هي أنشط فتراتك تاريخياً، شجّعه على استغلالها الآن
  var insight='';
  if(!isRunning){
    try{
      var _bp=S.settings&&S.settings.bestPeriod;
      var _cur=(typeof currentPeriodKey==='function')?currentPeriodKey():null;
      if(_bp&&_bp.samples>=5&&_cur&&_bp.key===_cur){
        insight='<div class="cmd-insight"><i data-lucide="sparkles"></i> أنت عادةً أكثر تركيزاً في فترة <b>'+(PERIOD_NAMES[_cur]||_cur)+'</b> — وهي الآن، فاستغلّها 🔮</div>';
      }
    }catch(e){}
  }
  el.innerHTML='<div class="cmd-eyebrow">'+eyebrow+'</div>'+
    '<div class="cmd-title">'+title+'</div>'+
    '<div class="cmd-sub">'+sub+'</div>'+insight+
    '<div class="cmd-actions">'+actions+'</div>'+
    '<div class="cmd-glow"></div>';
  icons();
}
// ===== ⑤ «أنشط فترة صلاتية» — يُحسب من سجل الجلسات (IndexedDB) ويُخزَّن للوصول الفوري =====
var PERIOD_NAMES={fajr:'الفجر→الظهر',dhuhr:'الظهر→العصر',asr:'العصر→المغرب',maghrib:'المغرب→العشاء',isha:'العشاء→الفجر'};
function refreshBestPeriod(){
  if(typeof dbGetAll!=='function'||typeof dbReady!=='function'||!dbReady())return;
  var me=curProfileId();
  dbGetAll('sessions').then(function(rows){
    var byP={},n=0;
    (rows||[]).forEach(function(s){ if(!s||s.profileId!==me||!s.period)return; byP[s.period]=(byP[s.period]||0)+(s.durationMin||0); n++; });
    var keys=Object.keys(byP); if(!keys.length)return;
    keys.sort(function(a,b){return byP[b]-byP[a];});
    if(!S.settings)S.settings={};
    var prev=S.settings.bestPeriod&&S.settings.bestPeriod.key;
    S.settings.bestPeriod={key:keys[0],min:byP[keys[0]],samples:n};
    if(prev!==keys[0]){ try{save();}catch(e){} }
    if(typeof renderCommandCenter==='function')renderCommandCenter();   // أعِد رسم البطاقة باللمحة المحدّثة
  }).catch(function(){});
}
// ===== بطاقة إنجاز اليوم — لقطة محاسبة سريعة بلا تفاعل =====
function renderDailyRecap(){
  var el=document.getElementById('daily-recap'); if(!el)return;
  var tk=todayKey();
  // دقائق التركيز اليوم
  var mins=(S.activityLog&&S.activityLog[tk])||0;
  // الصلوات: مسجّلة وفي وقتها
  var pt=(S.prayerTrack&&S.prayerTrack[tk])||{};
  var logged=0,onTime=0;
  PRAYER_KEYS.forEach(function(k){
    var st=(pt[k]&&pt[k].status)||'none';
    if(st!=='none')logged++;
    if(st==='jama3a'||st==='solo')onTime++;
  });
  // العادات اليوم
  var habTotal=(S.habits||[]).length;
  var habDone=(S.habits||[]).filter(function(h){return h.log&&h.log[tk];}).length;
  // ورد القرآن اليوم (صفحات)
  var quran=(S.quran&&S.quran.log&&S.quran.log[tk])||0;
  var items=[
    {ic:'timer',  val:mins,             unit:'دقيقة',  label:'تركيز اليوم', tone:mins>0?'ok':'idle'},
    {ic:'check-circle-2', val:onTime+'/'+5, unit:'',    label:'صلوات في وقتها', tone:onTime>=5?'ok':onTime>=3?'mid':(logged>0?'mid':'idle')},
    {ic:'repeat', val:habTotal?(habDone+'/'+habTotal):'—', unit:'', label:'عادات اليوم', tone:(habTotal&&habDone>=habTotal)?'ok':habDone>0?'mid':'idle'},
    {ic:'book-open', val:quran,          unit:quran===1?'صفحة':'صفحة', label:'وِرد القرآن', tone:quran>0?'ok':'idle'}
  ];
  el.innerHTML='<div class="dr-head"><i data-lucide="sparkles"></i> إنجاز اليوم</div>'+
    '<div class="dr-grid">'+items.map(function(it){
      return '<div class="dr-cell dr-'+it.tone+'"><i data-lucide="'+it.ic+'"></i>'+
        '<div class="dr-val">'+it.val+(it.unit?' <span class="dr-unit">'+it.unit+'</span>':'')+'</div>'+
        '<div class="dr-label">'+it.label+'</div></div>';
    }).join('')+'</div>';
  icons();
}
// ===== مؤشّر المقاصد البصري (حلّ محلّ صفحة المقاصد) — هدف الدقائق اليوم/الأسبوع بتدرّج لوني =====
function maqasidColor(p){ return p>=100?'#16a34a':p>=66?'#22c55e':p>=33?'#f59e0b':'#ef4444'; }
function maqasidData(){
  var g=S.goals||{};
  var dailyMin=g.dailyMin||120, weeklyMin=g.weeklyMin||600;
  var todayMin=(S.activityLog&&S.activityLog[todayKey()])||0;
  var weekMin=(S.weekData||[0,0,0,0,0,0,0]).reduce(function(a,b){return a+b;},0);
  return {dailyMin:dailyMin,weeklyMin:weeklyMin,todayMin:todayMin,weekMin:weekMin,
    dayPct:Math.min(100,Math.round(todayMin/Math.max(1,dailyMin)*100)),
    weekPct:Math.min(100,Math.round(weekMin/Math.max(1,weeklyMin)*100))};
}
function maqasidRing(pct){
  var deg=Math.max(0,Math.min(360,Math.round(pct*3.6)));
  var g='conic-gradient(#ef4444 0deg,#f59e0b '+(deg*0.5)+'deg,#16a34a '+deg+'deg,var(--surface3) '+deg+'deg)';
  return '<div class="mq-ring" style="background:'+g+'"><div class="mq-ring-in"><span class="mq-ring-pct">'+arDigits(pct+'%')+'</span></div></div>';
}
function renderMaqasid(){
  var d=maqasidData();
  function fill(id,mini){
    var el=document.getElementById(id); if(!el)return;
    el.innerHTML='<div class="card-title"><i data-lucide="target"></i> المقاصد — هدف الوقت</div>'+
      '<div class="mq-grid">'+
        '<div class="mq-day">'+maqasidRing(d.dayPct)+
          '<div class="mq-meta"><div class="mq-meta-t">اليوم</div><div class="mq-meta-v">'+arDigits(d.todayMin+' / '+d.dailyMin)+' د</div>'+
            (mini?'':'<input class="mq-goal-inp" type="number" min="30" max="600" step="10" value="'+d.dailyMin+'" onchange="setMaqasidGoal(\'daily\',this.value)" title="هدف اليوم (دقائق)">')+
          '</div></div>'+
        '<div class="mq-week"><div class="mq-week-top"><span><i data-lucide="calendar-days" style="width:13px;height:13px"></i> الأسبوع</span><span class="mq-week-v">'+arDigits(d.weekMin+' / '+d.weeklyMin+' د · '+d.weekPct+'%')+'</span></div>'+
          '<div class="mq-week-track"><div class="mq-week-fill" style="width:'+d.weekPct+'%;background:'+maqasidColor(d.weekPct)+'"></div></div>'+
          (mini?'':'<div class="mq-week-edit">هدف الأسبوع: <input class="mq-goal-inp" type="number" min="60" max="3000" step="30" value="'+d.weeklyMin+'" onchange="setMaqasidGoal(\'weekly\',this.value)"> دقيقة</div>')+
        '</div>'+
      '</div>';
  }
  fill('maqasid-card',false);
  fill('maqasid-mini',true);
  icons();
}
function setMaqasidGoal(type,v){
  if(!S.goals)S.goals={dailyItems:[],weeklyItems:[],dailyMin:120,weeklyMin:600};
  v=Math.max(1,parseInt(v)||(type==='daily'?120:600));
  if(type==='daily')S.goals.dailyMin=v; else S.goals.weeklyMin=v;
  save(); renderMaqasid();
  if(typeof updateGoalBar==='function')updateGoalBar();
  if(typeof updateWeekGoalBar==='function')updateWeekGoalBar();
}
// ===== النهوض في الرئيسية: سند نفسي + انتصارات + استعراض الإنجازات (اندمج من صفحة النهوض) =====
function renderRiseHome(){
  var el=document.getElementById('rise-home-card'); if(!el)return;
  var wins=(S.confidence&&S.confidence.wins)||[];
  var lastWins=wins.slice().reverse().slice(0,3);
  var winsHtml=lastWins.length?lastWins.map(function(w){ return '<div class="rh-win"><i data-lucide="trophy"></i> '+esc(w.text)+'</div>'; }).join('')
    :'<div class="rh-empty">سجّل أوّل انتصار مهما صغُر — تعود إليه حين تنهار ثقتك</div>';
  var badges=(typeof ACHIEVEMENTS!=='undefined')?ACHIEVEMENTS:[];
  var unlocked=S.unlockedBadges||[];
  var badgeHtml=badges.slice(0,10).map(function(a){ var on=unlocked.indexOf(a.id)>=0; return '<div class="rh-badge'+(on?'':' off')+'" title="'+esc(a.name)+(on?(' — '+esc(a.desc)):' — مقفل')+'">'+(on?a.emoji:'🔒')+'</div>'; }).join('');
  el.innerHTML='<div class="card-title"><i data-lucide="sunrise"></i> النهوض — سند نفسي وانتصارات</div>'+
    '<div class="rh-cta"><div class="rh-cta-t">تعثّرت أو ضاقت نفسك؟ أعِد ترتيب الفكرة وانهض بخطوةٍ واحدة.</div>'+
      '<button class="btn pri sm" onclick="startReframe()"><i data-lucide="heart-pulse"></i> أعِد بناء ثقتي</button></div>'+
    '<div class="rh-sub">آخر انتصاراتك</div><div class="rh-wins">'+winsHtml+'</div>'+
    '<div class="add-bar" style="margin-top:.5rem"><input id="rh-win-input" class="add-bar-input" placeholder="انتصار اليوم (مهما صغُر)..." onkeydown="if(event.key===\'Enter\')addWinHome()"><button class="btn pri sm" onclick="addWinHome()"><i data-lucide="plus"></i> أضِف</button></div>'+
    '<div class="rh-import"><button class="btn sm" onclick="seedWins()"><i data-lucide="download"></i> استورد انتصاراتي من الإنجازات</button></div>'+
    '<div class="rh-sub" style="margin-top:.9rem">إنجازاتك</div><div class="rh-badges">'+badgeHtml+'</div>';
  icons();
}
function addWinHome(){
  var i=document.getElementById('rh-win-input'); var t=i?i.value:'';
  if(typeof addWin==='function')addWin(t);
  if(i)i.value='';
  renderRiseHome();
}
function renderHomeGoal(){
  var el=document.getElementById('home-goal'); if(!el)return;
  var gmin=(S.goals&&S.goals.dailyMin)||120;
  var tmin=S.activityLog[todayKey()]||0;
  var gp=Math.min(100,Math.round(tmin/gmin*100));
  el.innerHTML='<div class="home-goal-top"><span><i data-lucide="flag"></i> هدف اليوم</span><span class="home-goal-val">'+arDigits(tmin+' / '+gmin+' د · '+gp+'%')+'</span></div>'+
    '<div class="progress-track"><div class="progress-fill" style="width:'+gp+'%;background:var(--accent)"></div></div>';
}

// (حُذفت قائمة خطوات «المقاصد» القديمة — كانت تكراراً لديوان الواجبات؛
//  هدف الدقائق اليومي/الأسبوعي حيّ في مؤشّر المقاصد setMaqasidGoal)
var quoteIdx=Math.floor(Math.random()*quotes.length);
function nextQuote(){quoteIdx=(quoteIdx+1)%quotes.length;todayQuote=quotes[quoteIdx];showQuote();}

// ===== مقياس الطاقة =====
function setEnergy(level){
  if(!S.energyToday||typeof S.energyToday!=='object')S.energyToday={date:'',level:''};
  S.energyToday.date=todayKey();
  S.energyToday.level=level;
  save();renderEnergyMeter();
  var msgs={نشيط:'طاقتك عالية — استثمرها في أصعب المهام!',متعب:'لا بأس — جلسة خفيفة خير من لا شيء.',مرهق:'خذ قسطاً من الراحة — جسدك يستحق.'};
  notify(msgs[level]||level,'zap');
}
function renderEnergyMeter(){
  if(!S.energyToday||typeof S.energyToday!=='object')S.energyToday={date:'',level:''};
  var lv=(S.energyToday.date===todayKey())?S.energyToday.level:'';
  ['نشيط','متعب','مرهق'].forEach(function(x){
    var b=document.getElementById('energy-'+x);
    if(b)b.classList.toggle('active',x===lv);
  });
}

// ===== طقس اليوم: النية الصباحية =====
function showNiyyahModal(){
  var ov=document.getElementById('niyyah-overlay'); if(!ov)return;
  var ni=S.niyyah||{items:['','','']};
  ['1','2','3'].forEach(function(n,i){
    var inp=document.getElementById('niyyah-'+n); if(inp)inp.value=(ni.items&&ni.items[i])||'';
  });
  ov.style.display='flex'; icons();
}
function closeNiyyah(){var ov=document.getElementById('niyyah-overlay');if(ov)ov.style.display='none';}
function saveNiyyah(){
  if(!S.niyyah||typeof S.niyyah!=='object')S.niyyah={date:'',items:['','','']};
  S.niyyah.date=todayKey();
  S.niyyah.items=['1','2','3'].map(function(n){
    var inp=document.getElementById('niyyah-'+n);return inp?inp.value.trim():'';
  });
  save();closeNiyyah();renderNiyyahDisplay();notify('نيّة اليوم مُسجَّلة ✓ — بالتوفيق','sun');
}
function renderNiyyahDisplay(){
  var el=document.getElementById('niyyah-display'); if(!el)return;
  if(!S.niyyah||S.niyyah.date!==todayKey()||!S.niyyah.items.some(function(x){return x;})){
    el.innerHTML='<span class="niyyah-prompt"><i data-lucide="sunrise" style="width:14px;height:14px"></i> سجّل نيّة يومك</span>';
    icons();return;
  }
  var filled=S.niyyah.items.filter(function(x){return x;});
  el.innerHTML='<span class="niyyah-today-label"><i data-lucide="star" style="width:13px;height:13px"></i> نيّة اليوم:</span>'+
    filled.map(function(t,i){return '<span class="niyyah-chip">'+['١','٢','٣'][i]+'. '+esc(t)+'</span>';}).join('');
  icons();
}
function maybeShowNiyyah(){
  if(!S.niyyah||S.niyyah.date!==todayKey()){
    var h=new Date().getHours();
    if(h>=4&&h<=13)setTimeout(morningRitual,800);   // الطقس الموجَّه (٣ خطوات) — وداخله رابط «النية يدوياً»
  }
}

// ===== جرّة المهام — زر واحد يختار لك (قاتل شلل القرار، بروح Amazing Marvin) =====
function jarWeight(t){
  var w={high:3,mid:2,low:1}[t.priority]||2;
  if(t.highYield)w+=2;
  if(t.today)w+=2;
  if(t.deadline){
    var d=(parseLocalDate(t.deadline).getTime()-new Date(new Date().toDateString()).getTime())/86400000;
    if(d<=0)w+=3; else if(d<=3)w+=1;
  }
  return w;
}
var _jarLastId=null;
function jarPick(){
  var pool=(S.tasks||[]).filter(function(t){return !t.done&&!t.archived;});
  if(pool.length>1)pool=pool.filter(function(t){return t.id!==_jarLastId;});   // قرعة جديدة ≠ السابقة
  if(!pool.length)return null;
  var total=0,acc=[];
  pool.forEach(function(t){total+=jarWeight(t);acc.push(total);});
  var r=Math.random()*total;
  for(var i=0;i<acc.length;i++)if(r<acc[i])return pool[i];
  return pool[pool.length-1];
}
function openTaskJar(){
  var ov=document.getElementById('jar-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='jar-overlay'; ov.className='ritual-overlay';
    ov.onclick=function(e){if(e.target===ov)closeTaskJar();}; document.body.appendChild(ov); }
  var t=jarPick();
  if(!t){ notify('لا مهام معلّقة — الجرّة فارغة 🎉','check-circle'); return; }
  _jarLastId=t.id;
  var subj=(S.subjects&&S.subjects[t.subject]&&S.subjects[t.subject].label)||'';
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header">'+
    '<div class="ritual-icon">🎲</div><div class="ritual-title">الجرّة اختارت لك</div>'+
    '<div class="ritual-sub">لا تفكّر — الاختيار حُسم. ٢٠ دقيقة فقط.</div></div>'+
    '<div class="ritual-body"><div class="jar-task">'+esc(t.text)+'</div>'+
    (subj?'<div class="jar-meta">'+esc(subj)+(t.highYield?' · <b>الأولى بالتقديم</b>':'')+'</div>':'')+'</div>'+
    '<div class="ritual-foot">'+
    '<button class="btn pri" onclick="closeTaskJar();startTaskTimer('+t.id+')"><i data-lucide="play"></i> ابدأ جلسة لها</button>'+
    '<button class="btn" onclick="openTaskJar()"><i data-lucide="dices"></i> قرعة أخرى</button>'+
    '<button class="btn ghost" onclick="closeTaskJar()">إغلاق</button></div></div>';
  icons();
}
function closeTaskJar(){var ov=document.getElementById('jar-overlay');if(ov)ov.style.display='none';}

// ===== طقس الصباح المُوجَّه — ٣ خطوات (بروح Sunsama): أمسك ← اختر ٣ ← وزّعها على الفترات =====
var _mrStep=1,_mrChosen=[];
function openMorningFlow(){
  // النية مسجَّلة اليوم؟ → تعديل يدوي مباشر؛ وإلا → الطقس الموجَّه
  if(S.niyyah&&S.niyyah.date===todayKey()&&(S.niyyah.items||[]).some(function(x){return x;}))showNiyyahModal();
  else morningRitual();
}
function morningRitual(){
  _mrStep=1;_mrChosen=[];
  renderMorningRitual();
}
function closeMorningRitual(){var ov=document.getElementById('mr-overlay');if(ov)ov.style.display='none';}
function mrToggleTask(id){
  var i=_mrChosen.indexOf(id);
  if(i>=0)_mrChosen.splice(i,1);
  else{ if(_mrChosen.length>=3){notify('ثلاث مهام تكفي — التركيز قوة','info');return;} _mrChosen.push(id); }
  renderMorningRitual();
}
function mrNext(){ if(_mrStep===2&&!_mrChosen.length){notify('اختر مهمة واحدة على الأقل (أو تخطَّ)','info');return;} _mrStep++; renderMorningRitual(); }
function mrBack(){ _mrStep--; renderMorningRitual(); }
function mrFinish(){
  var chosen=_mrChosen.map(function(id){return (S.tasks||[]).find(function(t){return t.id===id;});}).filter(Boolean);
  // ١) وسم «اليوم» + ٢) النية = نصوص المهام + ٣) التوزيع على فترات خطة اليوم
  chosen.forEach(function(t){t.today=true;});
  if(!S.niyyah||typeof S.niyyah!=='object')S.niyyah={date:'',items:['','','']};
  S.niyyah.date=todayKey();
  S.niyyah.items=[0,1,2].map(function(i){return chosen[i]?chosen[i].text.slice(0,80):'';});
  chosen.forEach(function(t){
    var sel=document.getElementById('mr-period-'+t.id);
    var key=sel?sel.value:'';
    if(key){ var dp=dayPlanState(); if(!dp.periods[key])dp.periods[key]={sessions:1,taskIds:[]}; if(!dp.periods[key].taskIds)dp.periods[key].taskIds=[];
      if(dp.periods[key].taskIds.indexOf(t.id)<0)dp.periods[key].taskIds.push(t.id); }
  });
  save();closeMorningRitual();
  if(typeof renderHome==='function')renderHome();
  if(typeof renderTasks==='function'){try{renderTasks();}catch(e){}}
  notify('يومك مُخطَّط ✓ — بسم الله، ابدأ بأول خطوة','sunrise');
}
function mrYesterdayStats(){
  var d=new Date();d.setDate(d.getDate()-1);
  var yk=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  var mins=(S.activityLog&&S.activityLog[yk])||0;
  var pt=(S.prayerTrack&&S.prayerTrack[yk])||{},onTime=0;
  PRAYER_KEYS.forEach(function(k){var st=(pt[k]&&pt[k].status)||'none';if(st==='jama3a'||st==='solo')onTime++;});
  var habDone=(S.habits||[]).filter(function(h){return h.log&&h.log[yk];}).length;
  return {mins:mins,onTime:onTime,habDone:habDone};
}
function renderMorningRitual(){
  var ov=document.getElementById('mr-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='mr-overlay'; ov.className='ritual-overlay';
    ov.onclick=function(e){if(e.target===ov)closeMorningRitual();}; document.body.appendChild(ov); }
  ov.style.display='flex';
  var dots=[1,2,3].map(function(n){return '<span class="mr-dot'+(n===_mrStep?' on':'')+'"></span>';}).join('');
  var body='',foot='';
  if(_mrStep===1){
    var y=mrYesterdayStats();
    body='<div class="mr-recap">'+
      '<div class="mr-cell"><div class="mr-val">'+y.mins+'</div><div class="mr-lbl">دقيقة تركيز أمس</div></div>'+
      '<div class="mr-cell"><div class="mr-val">'+y.onTime+'/٥</div><div class="mr-lbl">صلوات في وقتها</div></div>'+
      '<div class="mr-cell"><div class="mr-val">'+y.habDone+'</div><div class="mr-lbl">عادات أُنجزت</div></div></div>'+
      '<div class="mr-note">'+(y.mins>0?'أمس كان خطوة — واليوم خطوة جديدة.':'أمس مضى بما فيه — اليوم صفحة بيضاء تماماً.')+'</div>';
    foot='<button class="btn pri" onclick="mrNext()">التالي <i data-lucide="arrow-left"></i></button>'+
         '<button class="btn ghost" onclick="closeMorningRitual()">لاحقاً</button>';
  }else if(_mrStep===2){
    var pending=(S.tasks||[]).filter(function(t){return !t.done&&!t.archived;});
    var po={high:0,mid:1,low:2};
    pending.sort(function(a,b){
      var ad=a.deadline?parseLocalDate(a.deadline).getTime():Infinity,bd=b.deadline?parseLocalDate(b.deadline).getTime():Infinity;
      if(ad!==bd)return ad-bd;return (po[a.priority]||1)-(po[b.priority]||1);
    });
    var rows=pending.slice(0,12).map(function(t){
      var on=_mrChosen.indexOf(t.id)>=0;
      return '<div class="mr-task'+(on?' on':'')+'" onclick="mrToggleTask('+t.id+')">'+
        '<i data-lucide="'+(on?'check-circle-2':'circle')+'"></i><span>'+esc(t.text)+'</span>'+
        (t.highYield?'<span class="mr-hy">الأولى</span>':'')+'</div>';
    }).join('');
    body=(pending.length?('<div class="mr-note">اختر حتى <b>٣</b> مهام تكفي لتُسمّي يومك ناجحاً ('+_mrChosen.length+'/٣)</div><div class="mr-tasks">'+rows+'</div>')
      :'<div class="mr-note">لا مهام معلّقة — أضف مهمة من ديوان الواجبات أولاً، أو تخطَّ.</div>')+
      '<div class="mr-alt" onclick="closeMorningRitual();showNiyyahModal()">أفضّل كتابة النية يدوياً ←</div>';
    foot='<button class="btn pri" onclick="mrNext()">التالي <i data-lucide="arrow-left"></i></button>'+
         '<button class="btn" onclick="mrBack()"><i data-lucide="arrow-right"></i> رجوع</button>'+
         '<button class="btn ghost" onclick="closeMorningRitual()">تخطَّ</button>';
  }else{
    var chosen=_mrChosen.map(function(id){return (S.tasks||[]).find(function(t){return t.id===id;});}).filter(Boolean);
    var cur=(typeof currentPeriodKey==='function')?currentPeriodKey():null;
    var opts=[['fajr','الفجر → الظهر'],['dhuhr','الظهر → العصر'],['asr','العصر → المغرب'],['maghrib','المغرب → العشاء'],['isha','العشاء → الفجر']];
    body=chosen.length?('<div class="mr-note">متى تنوي كل واحدة؟ (تظهر في «تخطيط اليوم» بصفحة السعي)</div>'+
      chosen.map(function(t){
        return '<div class="mr-assign"><span class="mr-assign-t">'+esc(t.text)+'</span>'+
          '<select id="mr-period-'+t.id+'">'+opts.map(function(o){
            return '<option value="'+o[0]+'"'+(o[0]===cur?' selected':'')+'>'+o[1]+'</option>';
          }).join('')+'</select></div>';
      }).join('')):'<div class="mr-note">لم تختر مهاماً — سيُسجَّل الطقس دون توزيع.</div>';
    foot='<button class="btn pri" onclick="mrFinish()"><i data-lucide="check"></i> ابدأ يومك</button>'+
         '<button class="btn" onclick="mrBack()"><i data-lucide="arrow-right"></i> رجوع</button>';
  }
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header">'+
    '<div class="ritual-icon">🌅</div><div class="ritual-title">طقس الصباح</div>'+
    '<div class="ritual-sub">'+(_mrStep===1?'نظرة على أمس — بلا حساب':_mrStep===2?'قرارات اليوم الثلاثة':'وزّع نواياك على يومك')+'</div>'+
    '<div class="mr-dots">'+dots+'</div></div>'+
    '<div class="ritual-body">'+body+'</div>'+
    '<div class="ritual-foot">'+foot+'</div></div>';
  icons();
}

// ===== طقس اليوم: المحاسبة المسائية =====
function showMuhasabaModal(){
  var ov=document.getElementById('muhasaba-overlay'); if(!ov)return;
  var m=S.muhasaba||{done:'',note:''};
  var td=document.getElementById('muhasaba-done'); if(td)td.value=m.done||'';
  var tn=document.getElementById('muhasaba-note'); if(tn)tn.value=m.note||'';
  ov.style.display='flex'; icons();
}
function closeMuhasaba(){var ov=document.getElementById('muhasaba-overlay');if(ov)ov.style.display='none';}
function saveMuhasaba(){
  if(!S.muhasaba||typeof S.muhasaba!=='object')S.muhasaba={date:'',done:'',note:''};
  S.muhasaba.date=todayKey();
  var td=document.getElementById('muhasaba-done'); S.muhasaba.done=td?td.value.trim():'';
  var tn=document.getElementById('muhasaba-note'); S.muhasaba.note=tn?tn.value.trim():'';
  save();closeMuhasaba();notify('المحاسبة مُسجَّلة — ختمت يومك بخير ✓','moon');
}
function maybeShowMuhasaba(){
  if(!S.muhasaba||S.muhasaba.date!==todayKey()){
    var h=new Date().getHours();
    if(h>=19)setTimeout(showMuhasabaModal,1200);
  }
}

// ===== التقرير الأسبوعي =====
function showWeeklyReport(){
  var ov=document.getElementById('weekly-report-overlay'); if(!ov)return;
  // الأسبوع يبدأ السبت (إصلاح: كان الإثنين هنا والأحد في أماكن أخرى)
  var now=new Date(),day=now.getDay();
  var mon=new Date(now); mon.setDate(now.getDate()-((day+1)%7));   // السبت
  var sun=new Date(mon); sun.setDate(mon.getDate()+6);             // → الجمعة
  var fmt=function(d){return d.toLocaleDateString('ar-EG',{month:'long',day:'numeric'});};
  var lbl=document.getElementById('weekly-report-week');
  if(lbl)lbl.textContent='الأسبوع: '+fmt(mon)+' — '+fmt(sun);
  // calculate stats
  var weekMin=(S.weekData||[0,0,0,0,0,0,0]).reduce(function(a,b){return a+b;},0);
  var weekHours=(weekMin/60).toFixed(1);
  var tk=todayKey();
  var sessWeek=0; for(var i=0;i<7;i++){var d=new Date(mon);d.setDate(mon.getDate()+i);var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();sessWeek+=(S.activityLog[k]?1:0);}
  // إصلاح: «واجب مُنجَز» الأسبوعي كان يعدّ كل المنجزات منذ البداية — الآن نحصره بهذا الأسبوع عبر doneAt
  var monMs=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()).getTime();
  var sunMs=new Date(sun.getFullYear(),sun.getMonth(),sun.getDate(),23,59,59,999).getTime();
  var tasksWeek=(S.tasks||[]).filter(function(t){return t.done&&t.doneAt&&t.doneAt>=monMs&&t.doneAt<=sunMs;}).length;
  var prayerWeekPct=0;
  var pDone=0,pTotal=0;
  PRAYER_KEYS.forEach(function(k){
    for(var i=0;i<7;i++){var d=new Date(mon);d.setDate(mon.getDate()+i);var dk=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
      var s=getPT(dk,k).status; pTotal++;
      if(s==='jama3a'||s==='solo'||s==='late'||s==='qada')pDone++;
    }
  });
  if(pTotal>0)prayerWeekPct=Math.round(pDone/pTotal*100);
  var quranPages=0;Object.keys((S.quran&&S.quran.log)||{}).forEach(function(dk){
    var d=new Date(dk),dm=new Date(mon);dm.setHours(0,0,0,0);var ds=new Date(sun);ds.setHours(23,59,59,999);
    if(d>=dm&&d<=ds)quranPages+=(S.quran.log[dk]||0);
  });
  // busiest day
  var days=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var wd=S.weekData||[0,0,0,0,0,0,0];
  var maxIdx=wd.indexOf(Math.max.apply(null,wd));
  var bestDay=wd[maxIdx]>0?days[maxIdx]:'—';
  var body=document.getElementById('weekly-report-body'); if(!body)return;
  body.innerHTML=
    '<div class="wr-grid">'+
    '<div class="wr-card"><div class="wr-icon">⏱</div><div class="wr-val">'+weekHours+'</div><div class="wr-lbl">ساعة دراسة</div></div>'+
    '<div class="wr-card"><div class="wr-icon">🕌</div><div class="wr-val">'+arDigits(prayerWeekPct+'%')+'</div><div class="wr-lbl">صلوات في وقتها</div></div>'+
    '<div class="wr-card"><div class="wr-icon">📖</div><div class="wr-val">'+quranPages+'</div><div class="wr-lbl">صفحة قرآن</div></div>'+
    '<div class="wr-card"><div class="wr-icon">✅</div><div class="wr-val">'+tasksWeek+'</div><div class="wr-lbl">واجب مُنجَز</div></div>'+
    '</div>'+
    (bestDay!=='—'?'<div class="wr-insight"><i data-lucide="lightbulb"></i> أنشط أيامك هذا الأسبوع كان <b>'+bestDay+'</b> — ما الذي كان مختلفاً؟</div>':'');
  ov.style.display='flex';icons();
}
function closeWeeklyReport(){var ov=document.getElementById('weekly-report-overlay');if(ov)ov.style.display='none';}
function maybeShowWeeklyReport(){
  var today=new Date();
  if(today.getDay()!==5)return;   // الجمعة فقط
  var ws=weekStartKey();
  if(S.weeklyReportShown===ws)return;
  S.weeklyReportShown=ws;save();
  setTimeout(showWeeklyReport,2000);
}

// ===== شريط اليوم الإسلامي (أسفل الشاشة) =====
var psbColors={fajr:'#7c6fb5',dhuhr:'#2196F3',asr:'#ff9800',maghrib:'#e91e63',isha:'#3f2060'};
function updatePrayerStatusBar(){
  var bar=document.getElementById('prayer-status-bar'); if(!bar)return;
  var pw=(S.prayerWeek&&S.prayerWeek[DAYS[new Date().getDay()]])||{};
  var now=new Date();
  function toDate(hm){if(!hm||!hm.includes(':'))return null;var p=hm.split(':');var d=new Date();d.setHours(+p[0],+p[1],0,0);return d;}
  var times=PRAYER_KEYS.map(function(k){return {key:k,name:PRAYER_AR[k],t:toDate(pw[k])};}).filter(function(x){return x.t;});
  if(!times.length){bar.style.display='none';return;}
  bar.style.display='';
  var current=null,next=null;
  for(var i=0;i<times.length;i++){
    if(times[i].t<=now){current=times[i];next=times[i+1]||null;}
  }
  if(!current){current={key:'isha',name:'ما قبل الفجر'};next=times[0];}
  var pct=0;
  if(current&&next&&current.t&&next.t){
    var span=next.t-current.t;var elapsed=now-current.t;
    pct=Math.min(100,Math.max(0,Math.round(elapsed/span*100)));
  }
  var color=psbColors[current.key]||'var(--accent)';
  var fill=document.getElementById('psb-fill'); if(fill){fill.style.width=pct+'%';fill.style.background=color;}
  var period=document.getElementById('psb-period');
  if(period)period.innerHTML='<span style="color:'+color+';font-weight:700">'+current.name+'</span>';
  var nextEl=document.getElementById('psb-next');
  if(nextEl){
    if(next){var diff=Math.max(0,Math.round((next.t-now)/60000));var dtxt=arDigits(diff<60?diff+' د':''+Math.floor(diff/60)+' س '+diff%60+' د');nextEl.innerHTML='<i data-lucide="chevron-left" style="width:13px;height:13px"></i> '+next.name+' <b>'+next.t.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})+'</b> ('+dtxt+')';}
    else{nextEl.textContent='';}
  }
  icons();
}

// ===== GOALS (progress bars) =====
function updateGoalBar(){
  var g=(S.goals&&S.goals.dailyMin)||120;
  var el=document.getElementById('goal-daily-min');
  if(el)g=parseInt(el.value)||g;
  var todayMin=S.activityLog[todayKey()]||0;
  var p=Math.min(100,Math.round(todayMin/g*100));
  var fill=document.getElementById('goal-fill');
  var txt=document.getElementById('goal-text');
  if(fill)fill.style.width=p+'%';
  if(txt)txt.textContent=arDigits(todayMin+' / '+g+' دقيقة ('+p+'%)');
}
function updateWeekGoalBar(){
  var wm=(S.goals&&S.goals.weeklyMin)||600;
  var el=document.getElementById('goal-weekly-min');
  if(el)wm=parseInt(el.value)||wm;
  var weekMin=(S.weekData||[0,0,0,0,0,0,0]).reduce(function(a,b){return a+b;},0);
  var p=Math.min(100,Math.round(weekMin/wm*100));
  var fill=document.getElementById('goal-week-fill');
  var txt=document.getElementById('goal-week-text');
  if(fill)fill.style.width=p+'%';
  if(txt)txt.textContent=arDigits(weekMin+' / '+wm+' دقيقة ('+p+'%)');
}
