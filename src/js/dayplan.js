// dayplan.js — تخطيط اليوم حسب فترات الصلاة (في صفحة الجِدّ).
// ٥ فترات (أُضيفت العشاء→الفجر) + وضعان للعرض (كل الفترات / الفترة الحالية بمؤقّت بصري عمودي)
// + عدد جلسات لكل فترة + سحب مهام لإسقاطها فيها. classic script (globals shared).

function dpHmToMin(hm){ if(!hm||hm.indexOf(':')<0)return null; var p=hm.split(':'); return (+p[0])*60+(+p[1]); }
function dpFmtDur(mins){ var h=Math.floor(mins/60),m=mins%60; return arDigits((h>0?h+' س ':'')+(m>0?m+' د':(h>0?'':'0 د'))); }
var DP_PAIRS=[['fajr','dhuhr'],['dhuhr','asr'],['asr','maghrib'],['maghrib','isha'],['isha','fajr']];

function dayPlanState(){
  if(!S.dayPlan||typeof S.dayPlan!=='object')S.dayPlan={date:'',periods:{}};
  if(S.dayPlan.date!==todayKey()){ S.dayPlan.date=todayKey(); S.dayPlan.periods={}; save(); }
  if(!S.dayPlan.periods)S.dayPlan.periods={};
  return S.dayPlan;
}
function dayPlanView(){ return (S.settings&&S.settings.dayPlanView)||'all'; }
function setDayPlanView(v){ if(!S.settings)S.settings={}; S.settings.dayPlanView=v; save(); renderDayPlan(); }

// مفتاح الفترة الصلاتية الجارية الآن (للربط التلقائي بين الجلسات والفترات + الإحصاء)
function currentPeriodKey(){
  var pw=(S.prayerWeek&&S.prayerWeek[DAYS[new Date().getDay()]])||{}; var now=new Date();
  for(var i=0;i<DP_PAIRS.length;i++){ var pt=dpPeriodTimes(pw,DP_PAIRS[i]); if(pt&&now>=pt.start&&now<pt.end)return DP_PAIRS[i][0]; }
  return null;
}
// إلحاق مهمة تلقائياً بالفترة الجارية (يُستدعى عند وضع مهمة في المؤقّت)
function dayPlanAttach(taskId){
  var key=currentPeriodKey(); if(key==null||taskId==null)return;
  var dp=dayPlanState(); if(!dp.periods[key])dp.periods[key]={sessions:1,taskIds:[]};
  if(!dp.periods[key].taskIds)dp.periods[key].taskIds=[];
  if(dp.periods[key].taskIds.indexOf(taskId)<0){ dp.periods[key].taskIds.push(taskId); save(); try{renderDayPlan();}catch(e){} }
}
// ترحيل المهام غير المنجزة من الفترات التي انقضت إلى الفترة الجارية (أذّنت الصلاة ولم تخلص → تنتقل)
function dayPlanRollForward(pw){
  var cur=currentPeriodKey(); if(cur==null)return;
  var dp=dayPlanState(), now=new Date(), moved=false;
  DP_PAIRS.forEach(function(pr){
    var key=pr[0]; if(key===cur)return;
    var pt=dpPeriodTimes(pw,pr); if(!pt||now<pt.end)return;                   // لم تنقضِ بعد
    var per=dp.periods[key]; if(!per||!per.taskIds||!per.taskIds.length)return;
    var keep=[],move=[];
    per.taskIds.forEach(function(tid){ var t=(S.tasks||[]).find(function(x){return x.id===tid;}); if(t&&!t.done)move.push(tid); else keep.push(tid); });
    if(move.length){
      if(!dp.periods[cur])dp.periods[cur]={sessions:1,taskIds:[]};
      if(!dp.periods[cur].taskIds)dp.periods[cur].taskIds=[];
      move.forEach(function(tid){ if(dp.periods[cur].taskIds.indexOf(tid)<0)dp.periods[cur].taskIds.push(tid); });
      per.taskIds=keep; moved=true;
    }
  });
  if(moved)save();
}

// حدود الفترة كتواريخ فعلية (يعالِج فترة العشاء→الفجر العابرة لمنتصف الليل)
function dpPeriodTimes(pw,pair){
  var aMin=dpHmToMin(pw[pair[0]]), bMin=dpHmToMin(pw[pair[1]]);
  if(aMin==null||bMin==null)return null;
  var now=new Date();
  var start=new Date(); start.setHours(0,0,0,0); start.setMinutes(aMin);
  var end=new Date();   end.setHours(0,0,0,0);   end.setMinutes(bMin);
  if(bMin<=aMin)end.setDate(end.getDate()+1);                 // تعبر منتصف الليل
  if(bMin<=aMin && now<start){ start.setDate(start.getDate()-1); end.setDate(end.getDate()-1); } // نحن بعد منتصف الليل قبل الفجر
  return {start:start,end:end,mins:Math.max(0,Math.round((end-start)/60000))};
}

function dpEnsurePeriod(key,mins){
  var dp=dayPlanState();
  if(!dp.periods[key])dp.periods[key]={sessions:Math.max(1,Math.floor((mins||25)/25)),taskIds:[]};
  if(!dp.periods[key].taskIds)dp.periods[key].taskIds=[];
  return dp.periods[key];
}
function dpTasksHtml(per,key){
  return (per.taskIds||[]).map(function(tid){
    var t=(S.tasks||[]).find(function(x){return x.id===tid;}); if(!t)return '';
    return '<div class="dp-task"><span>'+esc(t.text)+'</span><button class="icon-btn" onclick="dayPlanRemoveTask(\''+key+'\','+tid+')"><i data-lucide="x"></i></button></div>';
  }).join('');
}
function dpPeriodCard(pair,pt,isCur){
  var key=pair[0], per=dpEnsurePeriod(key,pt.mins);
  var tasksHtml=dpTasksHtml(per,key);
  // المؤقّت البصري الأفقي للفترة الجارية — في وضع «كل الفترات» أيضاً (علاج عمى الوقت)
  var vt=isCur?'<div class="dp-vtimer dp-vtimer-h" data-start="'+(+pt.start)+'" data-end="'+(+pt.end)+'"></div>':'';
  return '<div class="dp-period'+(isCur?' dp-cur':'')+'">'+
    '<div class="dp-head"><span class="dp-name">'+(isCur?'<span class="dp-now-dot"></span>':'')+PRAYER_AR[pair[0]]+' ← '+PRAYER_AR[pair[1]]+'</span>'+
      '<span class="dp-avail">'+dpFmtDur(pt.mins)+' متاحة</span></div>'+vt+
    '<div class="dp-row"><label>جلسات مُخطَّطة:</label>'+
      '<input type="number" min="0" max="20" value="'+(per.sessions||0)+'" onchange="dayPlanSetSessions(\''+key+'\',this.value)">'+
      '<button class="btn sm pri" onclick="startPeriod(\''+key+'\')"><i data-lucide="play"></i> ابدأ الفترة</button></div>'+
    '<div class="dp-drop" ondragover="dayPlanDragOver(event)" ondragleave="dayPlanDragLeave(event)" ondrop="dayPlanDropTask(event,\''+key+'\')">'+
      (tasksHtml||'<span class="dp-hint">اسحب مهامّ هنا من بنك «اسحب مهمة»</span>')+'</div>'+
  '</div>';
}
function dpFocusCard(pair,pt){
  var key=pair[0], per=dpEnsurePeriod(key,pt.mins);
  var tasksHtml=dpTasksHtml(per,key);
  return '<div class="dp-focus">'+
    '<div class="dp-vtimer" id="dp-vtimer" data-start="'+(+pt.start)+'" data-end="'+(+pt.end)+'"></div>'+
    '<div class="dp-focus-main">'+
      '<div class="dp-head"><span class="dp-name">'+PRAYER_AR[pair[0]]+' ← '+PRAYER_AR[pair[1]]+'</span>'+
        '<span class="dp-avail">'+dpFmtDur(pt.mins)+' الفترة</span></div>'+
      '<div class="dp-row"><label>جلسات مُخطَّطة:</label>'+
        '<input type="number" min="0" max="20" value="'+(per.sessions||0)+'" onchange="dayPlanSetSessions(\''+key+'\',this.value)">'+
        '<button class="btn sm pri" onclick="startPeriod(\''+key+'\')"><i data-lucide="play"></i> ابدأ الفترة</button></div>'+
      '<div class="dp-drop" ondragover="dayPlanDragOver(event)" ondragleave="dayPlanDragLeave(event)" ondrop="dayPlanDropTask(event,\''+key+'\')">'+
        (tasksHtml||'<span class="dp-hint">اسحب مهامّ هنا</span>')+'</div>'+
    '</div>'+
  '</div>';
}
function renderDayPlan(){
  var el=document.getElementById('day-plan'); if(!el)return;
  var pw=(S.prayerWeek&&S.prayerWeek[DAYS[new Date().getDay()]])||{};
  var any=PRAYER_KEYS.some(function(k){return pw[k];});
  if(!any){ stopDpTick(); el.innerHTML='<div class="empty" style="padding:1rem"><i data-lucide="clock"></i><div>أدخِل مواقيت الصلاة من الضبط ليظهر تخطيط اليوم حسب الصلوات</div></div>'; icons(); return; }
  var view=dayPlanView();
  var toggle='<div class="dp-view-bar"><div class="seg-ctrl">'+
    '<button class="seg-btn'+(view==='all'?' on':'')+'" onclick="setDayPlanView(\'all\')"><i data-lucide="layout-grid"></i> كل الفترات</button>'+
    '<button class="seg-btn'+(view==='one'?' on':'')+'" onclick="setDayPlanView(\'one\')"><i data-lucide="crosshair"></i> الفترة الحالية</button>'+
    '</div></div>';
  if(view==='one'){
    dayPlanRollForward(pw);
    var now=new Date(), cur=null, next=null;
    DP_PAIRS.forEach(function(pr){ var pt=dpPeriodTimes(pw,pr); if(!pt)return;
      if(now>=pt.start&&now<pt.end){ if(!cur)cur={pr:pr,pt:pt}; }
      else if(pt.start>now){ if(!next||pt.start<next.pt.start)next={pr:pr,pt:pt}; }
    });
    var pick=cur||next;
    el.innerHTML=toggle+(pick?dpFocusCard(pick.pr,pick.pt):'<div class="empty" style="padding:1rem"><i data-lucide="moon"></i><div>لا فترة حالية الآن</div></div>');
    icons();
    if(pick)startDpTick(); else stopDpTick();
    return;
  }
  dayPlanRollForward(pw);   // المهام غير المنجزة من فترات انقضت → الفترة الجارية
  var curKey=currentPeriodKey();
  el.innerHTML=toggle+DP_PAIRS.map(function(pr){ var pt=dpPeriodTimes(pw,pr); return pt?dpPeriodCard(pr,pt,pr[0]===curKey):''; }).join('');
  icons();
  if(curKey!=null)startDpTick(); else stopDpTick();
}

// ===== المؤقّت البصري العمودي للفترة (خطوط متدرّجة تتناقص حتى الصلاة التالية) =====
var _dpTickInt=null;
function dpTick(){
  var els=document.querySelectorAll('.dp-vtimer'); if(!els.length){ stopDpTick(); return; }
  for(var e=0;e<els.length;e++){
    var el=els[e];
    var start=+el.getAttribute('data-start'), end=+el.getAttribute('data-end'), now=Date.now();
    var total=end-start, rem=Math.max(0,end-now);
    var pct=total>0?Math.max(0,Math.min(1,rem/total)):0;
    var segs=16, filled=Math.round(pct*segs);
    var bars='';
    for(var i=segs;i>=1;i--){ bars+='<span class="dp-seg'+(i<=filled?' on':'')+'"></span>'; }
    var mins=Math.floor(rem/60000), hrs=Math.floor(mins/60);
    var remTxt=arDigits(hrs>0?(hrs+' س '+(mins%60)+' د'):(mins+' د'));
    el.innerHTML='<div class="dp-vtimer-segs">'+bars+'</div><div class="dp-vtimer-lbl">باقٍ من الفترة<b>'+remTxt+'</b></div>';
  }
}
function startDpTick(){ stopDpTick(); dpTick(); _dpTickInt=setInterval(dpTick,15000); }
function stopDpTick(){ if(_dpTickInt){ clearInterval(_dpTickInt); _dpTickInt=null; } }

function dayPlanSetSessions(key,v){ var dp=dayPlanState(); if(!dp.periods[key])dp.periods[key]={sessions:0,taskIds:[]}; dp.periods[key].sessions=Math.max(0,parseInt(v)||0); save(); }
function dayPlanDragOver(e){ e.preventDefault(); if(e.dataTransfer)e.dataTransfer.dropEffect='move'; var z=e.currentTarget; if(z)z.classList.add('over'); }
function dayPlanDragLeave(e){ var z=e.currentTarget; if(z)z.classList.remove('over'); }
function dayPlanDropTask(e,key){
  e.preventDefault(); var z=e.currentTarget; if(z)z.classList.remove('over');
  var id=(typeof dragTaskId!=='undefined')?dragTaskId:null;
  if(id==null&&e.dataTransfer){ try{ id=parseInt(e.dataTransfer.getData('text/plain')); }catch(_){} }
  if(id==null||isNaN(id))return;
  var dp=dayPlanState(); if(!dp.periods[key])dp.periods[key]={sessions:1,taskIds:[]};
  if(!dp.periods[key].taskIds)dp.periods[key].taskIds=[];
  if(dp.periods[key].taskIds.indexOf(id)<0)dp.periods[key].taskIds.push(id);
  save(); renderDayPlan();
}
function dayPlanRemoveTask(key,id){
  var dp=dayPlanState(); if(dp.periods[key]&&dp.periods[key].taskIds){ dp.periods[key].taskIds=dp.periods[key].taskIds.filter(function(x){return x!==id;}); save(); renderDayPlan(); }
}
function startPeriod(key){
  var per=(S.dayPlan&&S.dayPlan.periods&&S.dayPlan.periods[key])||{taskIds:[]};
  var firstId=(per.taskIds||[])[0];
  if(firstId&&typeof startTaskTimer==='function'){ startTaskTimer(firstId); }
  else if(typeof quickStartSession==='function'){ quickStartSession(); }
  notify('بدأت فترة '+PRAYER_AR[key]+' — بالتوفيق','play');
}
