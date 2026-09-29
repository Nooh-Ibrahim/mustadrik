// coach.js — المرشد الدراسي (جولة 2): عدّاد الثانوية + الخط الكبير + المراجعة المتباعدة
//            + ضاغط الامتحان + التحليل العميق + خريطة الأسبوع + بطاقة الإنجاز + المكافأة الواعية
// classic script (globals shared, no ES modules). يُحمّل بعد study قبل palette.

// ===== أدوات تاريخ =====
function parseDayKey(k){ if(!k)return null; var p=String(k).split('-'); if(p.length<3)return null; var d=new Date(+p[0],+p[1]-1,+p[2]); return isNaN(d)?null:d; }
function daysBetween(a,b){ return Math.floor((b-a)/86400000); }

// ===== ⑨ الخط الكبير (لقِصَر النظر) =====
function applyFontScale(){
  var fs=(S.settings&&S.settings.fontScale)||'normal';
  document.body.classList.remove('fs-large','fs-xlarge');
  if(fs==='large')document.body.classList.add('fs-large');
  else if(fs==='xlarge')document.body.classList.add('fs-xlarge');
}
function setFontScale(v){ if(!S.settings)S.settings={}; S.settings.fontScale=v; save(); applyFontScale(); renderFontScaleCtrl(); }
function renderFontScaleCtrl(){
  var el=document.getElementById('fontscale-ctrl'); if(!el)return;
  var cur=(S.settings&&S.settings.fontScale)||'normal';
  var opts=[['normal','عادي'],['large','كبير'],['xlarge','أكبر']];
  el.innerHTML=opts.map(function(o){ return '<button class="seg-btn'+(cur===o[0]?' on':'')+'" onclick="setFontScale(\''+o[0]+'\')">'+o[1]+'</button>'; }).join('');
}

// ===== خط العناوين (نمط هادئ اختياري): Tajawal الافتراضي ↔ Amiri (Naskh كلاسيكي) =====
function applyHeadFont(){ document.body.classList.toggle('head-serif', !!(S.settings&&S.settings.headFont==='serif')); }
function setHeadFont(v){ if(!S.settings)S.settings={}; S.settings.headFont=v; save(); applyHeadFont(); renderHeadFontCtrl(); }
function renderHeadFontCtrl(){
  var el=document.getElementById('headfont-ctrl'); if(!el)return;
  var cur=(S.settings&&S.settings.headFont)||'sans';
  var opts=[['sans','حديث (Tajawal)'],['serif','كلاسيكي (Amiri)']];
  el.innerHTML=opts.map(function(o){ return '<button class="seg-btn'+(cur===o[0]?' on':'')+'" onclick="setHeadFont(\''+o[0]+'\')">'+o[1]+'</button>'; }).join('');
}

// ===== ⑨ العدّ التنازلي لأقرب موعد (كان مقصوراً على «الثانوية العامة» — صار عامّاً: أي امتحان/تسليم) =====
function renderExamCountdown(){
  var el=document.getElementById('exam-countdown'); if(!el)return;
  var dl=(typeof nextDeadline==='function')?nextDeadline():null;
  // مهمّ: لا نمسح className أبداً (كان يحذف dash-tile فتطير الأدوات لأعلى الصفحة) — نبدّل أصناف الحالة فقط
  el.classList.remove('empty','done','ok','soon','urgent');
  if(!dl){
    el.style.display='';
    el.classList.add('empty');
    el.innerHTML='<i data-lucide="calendar-clock"></i><span>مافيش موعد قادم — أضِف امتحاناً أو تسليماً ليظهر العدّاد</span>'+
      '<button class="btn sm" onclick="navTo(\'progress\')"><i data-lucide="calendar-plus"></i> أضِف موعداً</button>';
    icons(); return;
  }
  var nm=dl.title, et=dl.time||'08:00';
  var target=new Date(dl.date+'T'+et+':00'); var now=new Date();
  var diff=target-now;
  if(isNaN(diff)){ el.style.display='none'; return; }
  el.style.display='';
  if(diff<=0){ el.classList.add('done'); el.innerHTML='<i data-lucide="party-popper"></i><span>حان موعد «'+esc(nm)+'» — نسأل الله لك التوفيق</span>'; icons(); return; }
  var days=Math.floor(diff/86400000), hours=Math.floor((diff%86400000)/3600000);
  var totalDays=days+hours/24;
  var tone=totalDays<=7?'urgent':totalDays<=30?'soon':'ok';
  el.classList.add(tone);
  // نقطة البداية = يوم تسجيل الموعد (تُلتقط مرّة) → الشريط يبدأ ممتلئاً «من النهارده» ويفرغ كلّما اقترب (بطلب المستخدم)
  var startD=dl.addedAt?parseDayKey(dl.addedAt):((S.settings&&S.settings.examStart)?parseDayKey(S.settings.examStart):null);
  if(!startD||startD>now){ startD=new Date(now.getFullYear(),now.getMonth(),now.getDate()); dl.addedAt=todayKey(); try{save();}catch(e){} }
  var spanMs=Math.max(86400000,target-startD);
  var pct=Math.round(Math.max(0,Math.min(1,diff/spanMs))*100);   // يفرغ: ١٠٠٪ عند البداية ← ٠٪ عند الامتحان
  var fillColor=tone==='urgent'?'var(--red)':tone==='soon'?'var(--amber)':'var(--green)';
  // مربعات الأيام المتبقية (تتناقص بصرياً) — تجميع أسبوعي إن كثُرت
  var totalSpanDays=Math.max(1,Math.round(spanMs/86400000));
  var remDays=Math.max(1,Math.ceil(diff/86400000));
  var cells=Math.min(35,totalSpanDays), perCell=totalSpanDays/cells;
  var remCells=Math.max(0,Math.min(cells,Math.round(remDays/perCell)));
  var sq=''; for(var i=0;i<cells;i++){ var rem=i<remCells; sq+='<span class="ec-sq'+(rem?' rem':'')+((i===remCells-1)?' today':'')+'"></span>'; }
  var unitLbl=perCell>=1.5?('كل مربع ≈ '+arN(Math.round(perCell))+' يوم'):'كل مربع = يوم';
  var more=(typeof deadlineSorted==='function')?deadlineSorted(false).length-1:0;
  el.innerHTML='<div class="ec-top"><i data-lucide="'+((typeof dlKindIcon==='function')?dlKindIcon(dl.kind):'hourglass')+'"></i>'+
      '<div class="ec-main"><div class="ec-label">متبقٍّ على '+esc(nm)+
        (dl.subject?' <span class="ec-sub">'+esc(subjLabel(dl.subject))+'</span>':'')+'</div>'+
        '<div class="ec-big"><span class="ec-num">'+arN(days)+'</span> يوم <span class="ec-sep">·</span> <span class="ec-num">'+arN(hours)+'</span> ساعة</div></div>'+
      (more>0?'<button class="btn sm ec-more" onclick="navTo(\'progress\')" title="بقية المواعيد">+'+arN(more)+' موعد</button>':'')+'</div>'+
    '<div class="ec-bar"><div class="ec-fill" style="width:'+pct+'%;background:'+fillColor+'"></div></div>'+
    '<div class="ec-squares">'+sq+'</div>'+
    '<div class="ec-sq-lbl">'+arN(remDays)+' يوم متبقٍّ · '+unitLbl+'</div>'+
    '<div class="ec-hint">'+((totalDays<=7&&!(S.settings&&S.settings.lightLoad))?'الأيام الأخيرة — ابدأ بالأولى بالتقديم':'خطوة كل يوم تصنع الفارق')+'</div>';
  icons();
}

// ===== ① المراجعة المتباعدة (Spaced Repetition) =====
function srsState(k){ if(!S.srs)S.srs={}; if(!S.srs[k])S.srs[k]={mastery:3,lastReview:''}; return S.srs[k]; }
function srsIntervalDays(m){ return ({1:1,2:2,3:4,4:7,5:14})[m]||4; }   // كلّما زاد الإتقان طال التباعد
function srsDaysOverdue(k){
  var st=srsState(k);
  if(!st.lastReview)return 999;                      // لم تُراجَع قط → مستحقّة فوراً
  var last=parseDayKey(st.lastReview); if(!last)return 999;
  var since=daysBetween(last,new Date());
  return since-srsIntervalDays(st.mastery||3);        // >0 = متأخّرة
}
function srsDue(){
  var keys=(typeof courseActive==='function')?courseActive():Object.keys(S.subjects||{});   // المؤرشفة لا تُطالِبك بمراجعة
  return keys.map(function(k){ return {k:k,over:srsDaysOverdue(k)}; })
    .filter(function(x){ return x.over>=0; })
    .sort(function(a,b){ return b.over-a.over; });
}
function setMastery(k,v){ srsState(k).mastery=Math.max(1,Math.min(5,v)); save(); renderSrsPanel(); renderSrsCard(); }
function reviewSubject(k){
  srsState(k).lastReview=todayKey(); save();
  var label=((S.subjects&&S.subjects[k])||{label:k}).label;
  currentTaskId=null; currentTaskName='مراجعة '+label;
  var sel=document.getElementById('pomo-subject'); if(sel)sel.value=k;
  navTo('pomodoro');
  setTimeout(function(){
    var sub=document.getElementById('pomo-subject'); if(sub)sub.value=k;
    var lbl=document.getElementById('timer-label'); if(lbl)lbl.innerHTML='<i data-lucide="repeat"></i> مراجعة '+esc(label);
    if(!isRunning){ resetTimer(); startTimer(); }
    icons();
  },70);
  renderSrsCard(); renderSrsPanel();
}
function markReviewed(k){ srsState(k).lastReview=todayKey(); save(); renderSrsCard(); renderSrsPanel(); notify('سُجِّلت مراجعة '+(((S.subjects&&S.subjects[k])||{label:k}).label)+' ✓','check-circle'); }
// بطاقة الرئيسية: أكثر مادة استحقاقاً للمراجعة
function renderSrsCard(){
  var el=document.getElementById('srs-card'); if(!el)return;
  var due=srsDue();
  if(!due.length){ el.style.display='none'; return; }
  el.style.display='';
  var top=due[0], st=srsState(top.k), label=((S.subjects&&S.subjects[top.k])||{label:top.k}).label;
  var since=st.lastReview?daysBetween(parseDayKey(st.lastReview),new Date()):null;
  var when=since===null?'لم تُراجَع بعد':('آخر مراجعة منذ '+arN(since)+' يوم');
  el.innerHTML='<div class="srs-card-in">'+
    '<div class="srs-ic"><i data-lucide="brain-circuit"></i></div>'+
    '<div class="srs-tx"><div class="srs-ti">حان وقت مراجعة: '+esc(label)+'</div>'+
      '<div class="srs-su">'+when+' — مراجعة سريعة تُثبّت ما ذاكرت</div></div>'+
    '<div class="srs-ac"><button class="btn pri sm" onclick="reviewSubject(\''+top.k+'\')"><i data-lucide="play"></i> ابدأ مراجعة</button>'+
      '<button class="btn sm" onclick="markReviewed(\''+top.k+'\')" title="راجعتها بالفعل">تمّت</button></div>'+
    '</div>';
  icons();
}
// لوحة كاملة في «مسار العلم»: كل المواد + نجوم الإتقان + حالة الاستحقاق
function renderSrsPanel(){
  var el=document.getElementById('srs-panel'); if(!el)return;
  var keys=(typeof courseActive==='function')?courseActive():Object.keys(S.subjects||{});
  if(!keys.length){ el.innerHTML=''; return; }
  el.innerHTML='<div class="card-title"><i data-lucide="brain-circuit"></i> المراجعة المتباعدة — قيّم إتقانك لكل مساق</div>'+
    keys.map(function(k){
      var su=S.subjects[k], st=srsState(k), over=srsDaysOverdue(k);
      var since=st.lastReview?daysBetween(parseDayKey(st.lastReview),new Date()):null;
      var badge=over>=0?'<span class="srs-due">'+(st.lastReview?'مستحقّة':'جديدة')+'</span>':'<span class="srs-ok">بعد '+arN(-over)+' يوم</span>';
      var stars='';
      for(var i=1;i<=5;i++)stars+='<button class="srs-star'+(i<=(st.mastery||3)?' on':'')+'" onclick="setMastery(\''+k+'\','+i+')" title="إتقان '+arN(i)+'">★</button>';
      return '<div class="srs-row" style="border-inline-start:4px solid '+(su.color||'var(--accent)')+'">'+
        '<div class="srs-row-main"><span class="srs-row-name">'+esc(su.label)+'</span>'+badge+'</div>'+
        '<div class="srs-stars">'+stars+'</div>'+
        '<div class="srs-row-meta">'+(since===null?'لم تُراجَع':('منذ '+arN(since)+' ي'))+'</div>'+
        '<button class="btn sm" onclick="reviewSubject(\''+k+'\')"><i data-lucide="play"></i> راجِع</button>'+
        '</div>';
    }).join('');
  icons();
}

// (حُذف «ضاغط الامتحان» — كان زرّه في صفوف ودجت الامتحانات المتعدّدة المحذوفة)

// ===== ⑤ التحليل العميق =====
function weekdayAverages(){
  var sum=[0,0,0,0,0,0,0], cnt=[0,0,0,0,0,0,0];
  Object.keys(S.activityLog||{}).forEach(function(k){
    var d=parseDayKey(k); if(!d)return; var wd=d.getDay();
    sum[wd]+=(S.activityLog[k]||0); cnt[wd]++;
  });
  return sum.map(function(s,i){ return cnt[i]?Math.round(s/cnt[i]):0; });
}
function peakHourRange(){
  var hl=S.hourLog||[]; if(!hl.length)return null;
  var max=0,idx=-1; for(var h=0;h<24;h++){ if((hl[h]||0)>max){max=hl[h];idx=h;} }
  if(idx<0||max===0)return null;
  function fmt(h){ var ap=h<12?'ص':'م'; var hr=h%12; if(hr===0)hr=12; return hr+' '+ap; }
  return fmt(idx)+' – '+fmt((idx+1)%24);
}
function computeDeepTip(){
  var ws=weekStartKey();
  if(S.deepTip&&S.deepTip.week===ws&&S.deepTip.text)return S.deepTip.text;
  var avgs=weekdayAverages(); var hasData=avgs.some(function(x){return x>0;});
  var tip='';
  if(hasData){
    var best=avgs.indexOf(Math.max.apply(null,avgs));
    var nonzero=avgs.map(function(v,i){return {v:v,i:i};}).filter(function(x){return x.v>0;});
    var worst=nonzero.length?nonzero.sort(function(a,b){return a.v-b.v;})[0].i:best;
    var peak=peakHourRange();
    tip='أنشط أيامك عادةً '+DAYS_AR[best]+(peak?('، وذروتك حوالي '+peak):'')+'. '+
        (best!==worst?('أضعفها '+DAYS_AR[worst]+' — جهّز له مهمة خفيفة عالية العائد مسبقاً.'):'حافظ على إيقاعك الجميل.');
  }else{
    tip='ابدأ بتسجيل جلساتك — وبعد أيام سأكشف لك أنماط إنتاجيتك الحقيقية.';
  }
  S.deepTip={week:ws,text:tip}; save();
  return tip;
}
function renderDeepAnalysis(){
  var el=document.getElementById('deep-analysis-box'); if(!el)return;
  var avgs=weekdayAverages(); var peak=peakHourRange();
  var maxAvg=Math.max.apply(null,avgs)||1;
  var bars=avgs.map(function(v,i){
    var h=Math.round(v/maxAvg*48);
    return '<div class="da-bar-wrap"><div class="da-bar" style="height:'+Math.max(3,h)+'px" title="'+v+' د/يوم"></div><div class="da-lbl">'+['ح','ن','ث','ر','خ','ج','س'][i]+'</div></div>';
  }).join('');
  el.innerHTML=
    '<div class="da-tip"><i data-lucide="lightbulb"></i><span>'+esc(computeDeepTip())+'</span></div>'+
    '<div class="da-row"><div class="da-stat"><div class="da-k">ذروة تركيزك</div><div class="da-v">'+(peak||'—')+'</div></div>'+
    '<div class="da-chart">'+bars+'</div></div>';
  icons();
}

// (حُذفت «خريطة الأسبوع» — كانت تكراراً لمخطط «نشاط الأسبوع» في الميزان)

// ===== ⑦ بطاقة الإنجاز الأسبوعية (Canvas → تنزيل PNG) =====
function shareAchievementCard(){
  try{
    var weekMin=(S.weekData||[0,0,0,0,0,0,0]).reduce(function(a,b){return a+b;},0);
    var weekHours=(weekMin/60).toFixed(1);
    var tasksDone=(S.tasks||[]).filter(function(t){return t.done;}).length;
    var pDone=0,pTotal=0; var pt=S.prayerTrack||{};
    Object.keys(pt).forEach(function(dk){PRAYER_KEYS.forEach(function(k){var v=pt[dk][k];if(v&&v.status&&v.status!=='none'){pTotal++;if(v.status==='jama3a'||v.status==='solo')pDone++;}});});
    var prayerPct=pTotal?Math.round(pDone/pTotal*100):0;
    var nm=userName();
    var cv=document.createElement('canvas'); cv.width=1080; cv.height=1080; var c=cv.getContext('2d');
    var g=c.createLinearGradient(0,0,1080,1080); g.addColorStop(0,'#5750d8'); g.addColorStop(1,'#0d9488');
    c.fillStyle=g; c.fillRect(0,0,1080,1080);
    c.fillStyle='rgba(255,255,255,.10)'; c.fillRect(70,70,940,940);
    c.textAlign='center'; c.fillStyle='#fff';
    c.font='800 64px Tajawal,sans-serif'; c.fillText(nm?('إنجاز '+nm+' الأسبوعي'):'إنجازي الأسبوعي', 540, 230);
    c.font='500 34px Tajawal,sans-serif'; c.fillStyle='rgba(255,255,255,.85)';
    c.fillText('مِنهاج اليوم — '+APP_NAME, 540, 295);
    var stats=[[weekHours,'ساعة دراسة'],[prayerPct+'%','صلاة في وقتها'],[tasksDone,'واجب مُنجَز'],[(S.streak||0),'يوم متتالٍ']];
    var bx=[300,780,300,780], by=[520,520,820,820];
    stats.forEach(function(s,i){
      c.fillStyle='#fff'; c.font='800 96px Tajawal,sans-serif'; c.fillText(String(s[0]), bx[i], by[i]);
      c.fillStyle='rgba(255,255,255,.85)'; c.font='500 34px Tajawal,sans-serif'; c.fillText(s[1], bx[i], by[i]+52);
    });
    c.fillStyle='rgba(255,255,255,.7)'; c.font='500 28px Tajawal,sans-serif';
    c.fillText(new Date().toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}), 540, 1000);
    cv.toBlob(function(blob){
      if(!blob){ notify('تعذّر توليد البطاقة','x-circle'); return; }
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='إنجاز-'+(nm?nm+'-':'')+localDateKey(new Date())+'.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(a.href); },4000);
      notify('تم حفظ بطاقة إنجازك ✓','image');
    },'image/png');
  }catch(e){ notify('تعذّر توليد البطاقة','x-circle'); }
}

// ===== ⑥ المكافأة الواعية =====
var REWARD_IDEAS=[
  {ic:'footprints',t:'امشِ قليلاً',s:'دقيقتان حركة تُنشّط الدماغ'},
  {ic:'droplet',t:'اشرب ماءً',s:'الترطيب يرفع التركيز'},
  {ic:'eye',t:'أرِح عينيك',s:'انظر لشيء بعيد ٢٠ ثانية (قاعدة ٢٠)'},
  {ic:'heart',t:'اذكر الله',s:'سبحان الله وبحمده ×١٠'},
  {ic:'wind',t:'تمدّد وتنفّس',s:'أطلِق توتّر كتفيك'}
];
var rewardTimerInt=null, rewardLeft=0;
function showMindfulReward(minutes){
  var idea=REWARD_IDEAS[Math.floor(Math.random()*REWARD_IDEAS.length)];
  var ov=document.getElementById('reward-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='reward-overlay'; ov.className='ritual-overlay'; document.body.appendChild(ov); }
  rewardLeft=Math.max(1,minutes|0)*60;
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header">'+
      '<div class="ritual-icon">🌿</div><div class="ritual-title">راحة تستحقّها</div>'+
      '<div class="ritual-sub">أتممت دورة كاملة — كافئ نفسك بوعي</div></div>'+
    '<div class="ritual-body" style="align-items:center;text-align:center">'+
      '<div class="reward-idea"><i data-lucide="'+idea.ic+'"></i><div class="ri-t">'+idea.t+'</div><div class="ri-s">'+idea.s+'</div></div>'+
      '<div class="reward-timer" id="reward-timer">'+fmtMMSS(rewardLeft)+'</div>'+
    '</div>'+
    '<div class="ritual-foot"><button class="btn pri" onclick="closeMindfulReward()"><i data-lucide="check"></i> عُدتُ بنشاط</button></div>'+
    '</div>';
  icons();
  if(rewardTimerInt)clearInterval(rewardTimerInt);
  rewardTimerInt=setInterval(function(){
    rewardLeft--; var t=document.getElementById('reward-timer'); if(t)t.textContent=fmtMMSS(rewardLeft);
    if(rewardLeft<=0){ clearInterval(rewardTimerInt); rewardTimerInt=null; if(typeof playBeep==='function')playBeep(); var tt=document.getElementById('reward-timer'); if(tt)tt.textContent='انتهت — هيا نكمل 💪'; }
  },1000);
}
function fmtMMSS(s){ var m=Math.floor(s/60),x=s%60; return (m<10?'0':'')+m+':'+(x<10?'0':'')+x; }
function closeMindfulReward(){ if(rewardTimerInt){clearInterval(rewardTimerInt);rewardTimerInt=null;} var ov=document.getElementById('reward-overlay'); if(ov)ov.style.display='none'; }
