// schedule.js — جدول المحاضرات الأسبوعي
// التطبيق كان عارف «إنت بتذاكر إيه» ومش عارف «إنت لازم تكون فين الساعة كام».
// S.schedule = { sat:[{id,subject,from,to,place,kind}], sun:[...] } — الأسبوع يبدأ السبت (قاعدة التطبيق).
// classic script (globals shared) — يُحمّل بعد grades قبل prayer.

var CLASS_KINDS=[['lecture','محاضرة','presentation'],['section','سكشن','users'],['lab','معمل','flask-conical']];
function classKindLabel(k){ for(var i=0;i<CLASS_KINDS.length;i++)if(CLASS_KINDS[i][0]===k)return CLASS_KINDS[i][1]; return 'محاضرة'; }
function classKindIcon(k){ for(var i=0;i<CLASS_KINDS.length;i++)if(CLASS_KINDS[i][0]===k)return CLASS_KINDS[i][2]; return 'presentation'; }

function schedState(){
  if(!S.schedule||typeof S.schedule!=='object'||Array.isArray(S.schedule))S.schedule={};
  DAYS.forEach(function(d){ if(!Array.isArray(S.schedule[d]))S.schedule[d]=[]; });
  return S.schedule;
}
// ---- دوال صِرفة (مُختبَرة) ----
function hhmmToMin(s){
  var m=/^(\d{1,2}):(\d{2})$/.exec(String(s||'')); if(!m)return null;
  var h=+m[1],mi=+m[2]; if(h>23||mi>59)return null;
  return h*60+mi;
}
function schedSortDay(list){
  return (list||[]).slice().sort(function(a,b){
    var x=hhmmToMin(a.from),y=hhmmToMin(b.from);
    if(x===null)return 1; if(y===null)return -1;
    return x-y;
  });
}
// المحاضرة الجارية أو الجاية في يومٍ ما، بالنسبة لدقيقة معيّنة
function nextClassIn(list,nowMin){
  var s=schedSortDay(list),i;
  for(i=0;i<s.length;i++){
    var f=hhmmToMin(s[i].from), t=hhmmToMin(s[i].to);
    if(f===null)continue;
    if(t!==null&&nowMin>=f&&nowMin<t)return {item:s[i],state:'now',mins:t-nowMin};
    if(nowMin<f)return {item:s[i],state:'next',mins:f-nowMin};
  }
  return null;
}
function schedTodayKey(){ return DAYS[new Date().getDay()]; }
function schedDay(d){ return schedSortDay(schedState()[d]||[]); }
function schedCount(){ var n=0; DAYS.forEach(function(d){ n+=schedDay(d).length; }); return n; }

// ---- تعديل ----
function classAdd(day){
  var sc=schedState();
  var sub=document.getElementById('sc-subject-'+day), fr=document.getElementById('sc-from-'+day),
      to=document.getElementById('sc-to-'+day), pl=document.getElementById('sc-place-'+day), kd=document.getElementById('sc-kind-'+day);
  var from=(fr&&fr.value)||'';
  if(!from){ notify('اختَر وقت البداية','clock'); if(fr)fr.focus(); return; }
  sc[day].push({
    id:Date.now(), subject:(sub&&sub.value)||'', from:from, to:(to&&to.value)||'',
    place:(pl&&pl.value.trim())||'', kind:(kd&&kd.value)||'lecture'
  });
  if(pl)pl.value='';
  save(); renderSchedule(); renderTodayClasses();
  notify('أُضيفت لجدول '+DAYS_AR[DAYS.indexOf(day)]+' ✓','calendar-plus');
}
function classDel(day,id){
  var arr=schedState()[day], i=-1,j;
  for(j=0;j<arr.length;j++)if(arr[j].id===id)i=j;
  if(i<0)return;
  var it=arr[i]; arr.splice(i,1); save(); renderSchedule(); renderTodayClasses();
  undoToast('حُذفت من الجدول',function(){ arr.splice(i,0,it); save(); renderSchedule(); renderTodayClasses(); });
}
function classClearDay(day){
  var arr=schedState()[day]; if(!arr.length)return;
  var copy=arr.slice(); schedState()[day]=[]; save(); renderSchedule(); renderTodayClasses();
  undoToast('فُرِّغ يوم '+DAYS_AR[DAYS.indexOf(day)],function(){ schedState()[day]=copy; save(); renderSchedule(); renderTodayClasses(); });
}
// نسخ يوم كامل ليوم آخر — أسرع طريقة لملء جدول متكرّر
function classCopyDay(from,to){
  var sc=schedState();
  if(!sc[from].length)return;
  var prev=sc[to].slice();
  sc[to]=sc[from].map(function(x){ return {id:Date.now()+Math.floor(Math.random()*1000),subject:x.subject,from:x.from,to:x.to,place:x.place,kind:x.kind}; });
  save(); renderSchedule(); renderTodayClasses();
  undoToast('نُسِخ '+DAYS_AR[DAYS.indexOf(from)]+' إلى '+DAYS_AR[DAYS.indexOf(to)],function(){ sc[to]=prev; save(); renderSchedule(); renderTodayClasses(); });
}

// ---- الواجهة: الشبكة الأسبوعية في «مسار العلم» ----
function classRowHtml(day,it,nowKey,nowMin){
  var live=(day===nowKey)&&hhmmToMin(it.from)!==null&&hhmmToMin(it.to)!==null&&nowMin>=hhmmToMin(it.from)&&nowMin<hhmmToMin(it.to);
  var past=(day===nowKey)&&hhmmToMin(it.to)!==null&&nowMin>=hhmmToMin(it.to);
  return '<div class="sc-row'+(live?' live':'')+(past?' past':'')+'">'+
    '<span class="sc-time">'+esc(it.from)+(it.to?('<span class="sc-dash">–</span>'+esc(it.to)):'')+'</span>'+
    '<i class="sc-ic" data-lucide="'+classKindIcon(it.kind)+'"></i>'+
    '<span class="sc-n">'+esc(it.subject?subjLabel(it.subject):classKindLabel(it.kind))+'</span>'+
    (it.place?'<span class="sc-pl"><i data-lucide="map-pin"></i>'+esc(it.place)+'</span>':'')+
    '<span class="cu-sp"></span>'+
    (live?'<span class="sc-live">دلوقتي</span>':'')+
    '<button class="dl-x" onclick="classDel(\''+day+'\','+it.id+')" title="حذف"><i data-lucide="trash-2"></i></button>'+
    '</div>';
}
function renderSchedule(){
  var el=document.getElementById('schedule-card'); if(!el)return;
  var sc=schedState(), nowKey=schedTodayKey();
  var now=new Date(), nowMin=now.getHours()*60+now.getMinutes();
  var open=(S.settings&&S.settings.schedOpenDay)||nowKey;
  var tabs=WEEK_ORDER.map(function(i){
    var d=DAYS[i], n=schedDay(d).length;
    return '<button class="sc-tab'+(d===open?' on':'')+(d===nowKey?' today':'')+'" onclick="schedOpenDay(\''+d+'\')">'+
      DAYS_AR[i]+(n?'<span class="sc-badge">'+arN(n)+'</span>':'')+'</button>';
  }).join('');
  var list=schedDay(open);
  var rows=list.length?list.map(function(it){return classRowHtml(open,it,nowKey,nowMin);}).join('')
    :'<div class="cu-empty">مافيش محاضرات في اليوم ده — ضيفها من تحت، أو انسخ يوماً جاهزاً.</div>';
  var otherDays=WEEK_ORDER.map(function(i){return DAYS[i];}).filter(function(d){return d!==open&&schedDay(d).length;});
  el.innerHTML='<div class="card-title"><i data-lucide="calendar-days"></i> جدول المحاضرات'+
      (schedCount()?'<span class="sc-count">'+arN(schedCount())+' محاضرة بالأسبوع</span>':'')+'</div>'+
    '<div class="sc-tabs">'+tabs+'</div>'+
    '<div class="sc-list">'+rows+'</div>'+
    '<div class="sc-add">'+
      '<select id="sc-subject-'+open+'"><option value="">بلا مساق</option>'+courseOptionsHtml('',false)+'</select>'+
      '<select id="sc-kind-'+open+'">'+CLASS_KINDS.map(function(k){return '<option value="'+k[0]+'">'+k[1]+'</option>';}).join('')+'</select>'+
      '<input type="time" id="sc-from-'+open+'" value="09:00" title="من">'+
      '<input type="time" id="sc-to-'+open+'" value="10:30" title="إلى">'+
      '<input id="sc-place-'+open+'" placeholder="المكان (مدرج ٣…)">'+
      '<button class="btn pri" onclick="classAdd(\''+open+'\')"><i data-lucide="plus"></i> أضِف</button>'+
    '</div>'+
    '<div class="sc-tools">'+
      (list.length?'<button class="btn sm" onclick="classClearDay(\''+open+'\')"><i data-lucide="eraser"></i> فرِّغ اليوم</button>':'')+
      (otherDays.length?('<span class="sc-copy-lbl">انسخ من:</span>'+otherDays.map(function(d){
        return '<button class="btn sm ghost" onclick="classCopyDay(\''+d+'\',\''+open+'\')">'+DAYS_AR[DAYS.indexOf(d)]+'</button>';
      }).join('')):'')+
    '</div>';
  icons();
}
function schedOpenDay(d){
  if(!S.settings)S.settings={};
  S.settings.schedOpenDay=d; save(); renderSchedule();
}

// ---- الواجهة: بطاقة «محاضرات النهارده» بالرئيسية (تختفي لو مافيش) ----
function renderTodayClasses(){
  var el=document.getElementById('today-classes'); if(!el)return;
  var key=schedTodayKey(), list=schedDay(key);
  if(!list.length){ el.style.display='none'; return; }
  el.style.display='';
  var now=new Date(), nowMin=now.getHours()*60+now.getMinutes();
  var nx=nextClassIn(list,nowMin);
  var head;
  if(!nx){ head='<div class="tc-head done"><i data-lucide="check-circle-2"></i> خلصت محاضرات النهارده</div>'; }
  else if(nx.state==='now'){
    head='<div class="tc-head now"><i data-lucide="radio"></i> دلوقتي: <b>'+esc(nx.item.subject?subjLabel(nx.item.subject):classKindLabel(nx.item.kind))+'</b>'+
      '<span class="tc-left">باقي '+arN(nx.mins)+' د</span></div>';
  }else{
    var h=Math.floor(nx.mins/60), m=nx.mins%60;
    var inTxt=h?(arN(h)+' س'+(m?' و'+arN(m)+' د':'')):(arN(m)+' د');
    head='<div class="tc-head next"><i data-lucide="clock"></i> الجاية: <b>'+esc(nx.item.subject?subjLabel(nx.item.subject):classKindLabel(nx.item.kind))+'</b>'+
      '<span class="tc-left">بعد '+inTxt+'</span></div>';
  }
  el.innerHTML='<div class="card-title"><i data-lucide="calendar-days"></i> محاضرات النهارده'+
      '<span class="tc-day">'+DAYS_AR[DAYS.indexOf(key)]+'</span></div>'+head+
    '<div class="tc-list">'+list.map(function(it){
      var f=hhmmToMin(it.from), t=hhmmToMin(it.to);
      var st=(t!==null&&nowMin>=t)?'past':((f!==null&&nowMin>=f)?'live':'');
      return '<div class="tc-row '+st+'">'+
        '<span class="tc-t">'+esc(it.from)+'</span>'+
        '<span class="tc-dot" style="background:'+(it.subject?subjColor(it.subject):'var(--text3)')+'"></span>'+
        '<span class="tc-n">'+esc(it.subject?subjLabel(it.subject):classKindLabel(it.kind))+'</span>'+
        (it.place?'<span class="tc-pl">'+esc(it.place)+'</span>':'')+'</div>';
    }).join('')+'</div>';
  icons();
}
