// prayer.js — prayer schedule, online fetch, prayer tracker
// module 8/10 of the former renderer.js — classic script (globals shared, no ES modules)


// Prayer (manual weekly)
function renderPrayerTable(){
  var t=document.getElementById('prayer-table'); if(!t)return;   // table now lives in Settings
  var head='<tr><th>اليوم</th>'+PRAYER_KEYS.map(function(k){return '<th>'+PRAYER_AR[k]+'</th>';}).join('')+'</tr>';
  var rows=DAYS.map(function(d,i){
    var cells=PRAYER_KEYS.map(function(k){var v=(S.prayerWeek[d]&&S.prayerWeek[d][k])||'';return '<td><input type="time" value="'+v+'" onchange="savePrayer(\''+d+'\',\''+k+'\',this.value)"></td>';}).join('');
    return '<tr><td class="day-cell">'+DAYS_AR[i]+'</td>'+cells+'</tr>';
  }).join('');
  t.innerHTML=head+rows;
}
function savePrayer(d,k,v){if(!S.prayerWeek[d])S.prayerWeek[d]={};S.prayerWeek[d][k]=v;save();renderTodayPrayers();renderHome();}
// إظهار/إخفاء جدول تعديل المواعيد داخل صفحة الصلاة
function togglePrayerTimes(){
  var box=document.getElementById('prayer-times-edit'); if(!box)return;
  var btn=document.getElementById('pt-times-toggle');
  var open=box.hasAttribute('hidden');
  if(open){box.removeAttribute('hidden');renderPrayerTable();if(btn)btn.innerHTML='<i data-lucide="chevron-up"></i> إخفاء الجدول';}
  else{box.setAttribute('hidden','');if(btn)btn.innerHTML='<i data-lucide="pencil"></i> تعديل المواعيد';}
  if(typeof icons==='function')icons();
}
function getTodayPrayers(){return S.prayerWeek[DAYS[new Date().getDay()]]||{};}
function nextPrayer(){
  var tp=getTodayPrayers(),now=new Date();
  for(var i=0;i<PRAYER_KEYS.length;i++){var k=PRAYER_KEYS[i],v=tp[k];if(!v)continue;var parts=v.split(':');var pt=new Date();pt.setHours(parseInt(parts[0]),parseInt(parts[1]),0,0);if(pt>now)return {name:PRAYER_AR[k],time:v,date:pt};}
  // tomorrow fajr
  var tm=S.prayerWeek[DAYS[(new Date().getDay()+1)%7]];if(tm&&tm.fajr){var p=tm.fajr.split(':');var d=new Date();d.setDate(d.getDate()+1);d.setHours(parseInt(p[0]),parseInt(p[1]),0,0);return {name:'الفجر (غداً)',time:tm.fajr,date:d};}
  return null;
}
function renderTodayPrayers(){
  var el=document.getElementById('today-prayers'); if(!el)return;   // today's-times list was removed from the tracker
  var tp=getTodayPrayers(),np=nextPrayer();
  var any=PRAYER_KEYS.some(function(k){return tp[k];});
  if(!any){el.innerHTML='<div class="empty"><i data-lucide="clock"></i><div>لم تسجّل مواعيد '+DAYS_AR[new Date().getDay()]+' بعد</div></div>';icons();return;}
  el.innerHTML=PRAYER_KEYS.map(function(k){
    var v=tp[k];var isNext=np&&np.name.indexOf(PRAYER_AR[k])===0;
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)'+(isNext?';background:var(--accent-soft);margin:0 -1.5rem;padding:10px 1.5rem;border-radius:var(--radius-sm)':'')+'"><span style="font-weight:700;color:'+(isNext?'var(--accent-text)':'var(--text)')+'">'+PRAYER_AR[k]+(isNext?' ← التالية':'')+'</span><span style="font-weight:800;font-variant-numeric:tabular-nums">'+(v||'—')+'</span></div>';
  }).join('');
  icons();
}

// (حُذف «مخطط اليوم الإسلامي» من صفحة الصلاة — بديله الأقوى: تخطيط اليوم حسب الصلوات في الجِدّ)
function hmToDate(hm){ var p=String(hm||'0:0').split(':'); var d=new Date(); d.setHours(parseInt(p[0])||0,parseInt(p[1])||0,0,0); return d; }   // تُستخدم في worship.js

// ===== PRAYER TRACKER (wide weekly matrix + قضاء) =====
var ptWeekOffset=0;
// (حُذف ptDateKey — كان ميتاً؛ يُستخدَم ptDKey)
function ptDKey(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function ptWeekDates(){var base=new Date();base.setDate(base.getDate()-((base.getDay()+1)%7)+ptWeekOffset*7);var a=[];for(var i=0;i<7;i++){var d=new Date(base);d.setDate(base.getDate()+i);a.push(d);}return a;}   // يبدأ السبت (يطابق weekStartKey)
function ptPrevWeek(){ptWeekOffset--;renderPrayerTrack();}
function ptNextWeek(){if(ptWeekOffset>=0)return;ptWeekOffset++;renderPrayerTrack();}
var PT_ORDER=['none','jama3a','solo','late','qada','missed'];
var PT_LABELS={none:'—',jama3a:'جماعة',solo:'فذّ',late:'متأخر',qada:'قضاء',missed:'فاتت'};
var PT_CLASS={none:'pt-none',jama3a:'pt-jama3a',solo:'pt-solo',late:'pt-late',qada:'pt-qada',missed:'pt-missed'};
function getPT(dateKey,prayer){return (S.prayerTrack&&S.prayerTrack[dateKey]&&S.prayerTrack[dateKey][prayer])||{status:'none',delay:0};}
function setPT(dateKey,prayer,field,value){
  if(!S.prayerTrack)S.prayerTrack={};
  if(!S.prayerTrack[dateKey])S.prayerTrack[dateKey]={};
  if(!S.prayerTrack[dateKey][prayer])S.prayerTrack[dateKey][prayer]={status:'none',delay:0};
  var prev=S.prayerTrack[dateKey][prayer].status;
  S.prayerTrack[dateKey][prayer][field]=value;
  save();renderPrayerTrack();
  if(typeof renderPrayerAlert==='function')renderPrayerAlert();
  // تلميح القضاء مع الحاضرة (اختياري): أول تعليم لصلاة اليوم → «اقضِ معها فائتةً مثلها»
  if(field==='status'&&prev==='none'&&value==='jama3a'&&dateKey===todayKey()){
    try{
      var q=qadaState();
      if(q.on&&q.nudge&&qadaTotals(q).remain>0){
        var c=q.counts[prayer];
        if(c&&c.done<c.total&&typeof actionToast==='function')
          actionToast('تقبّل الله '+qadaLabel(prayer)+' — تقضي معها فائتةً مثلها؟','قضيتها ✓','feather',function(){ qadaDid(prayer); });
      }
    }catch(e){}
  }
}
function cyclePTStatus(dateKey,prayer){
  var cur=getPT(dateKey,prayer).status;
  var next=PT_ORDER[(PT_ORDER.indexOf(cur)+1)%PT_ORDER.length];
  setPT(dateKey,prayer,'status',next);
}
// total «فاتت» (missed) across all history that haven't been marked «قضاء» yet
function qadaPending(){var n=0,pt=S.prayerTrack||{};Object.keys(pt).forEach(function(dk){PRAYER_KEYS.forEach(function(k){if(pt[dk][k]&&pt[dk][k].status==='missed')n++;});});return n;}
function renderPrayerTrack(){
  var body=document.getElementById('pt-body');if(!body)return;
  var days=ptWeekDates(),todayK=todayKey(),now=new Date();
  var lbl=document.getElementById('pt-date-label');
  if(lbl){var f=days[0],l=days[6];lbl.textContent=f.toLocaleDateString('ar-EG',{day:'numeric',month:'long'})+' – '+l.toLocaleDateString('ar-EG',{day:'numeric',month:'long'})+(ptWeekOffset===0?' · هذا الأسبوع':'');}
  var nb=document.getElementById('pt-next-btn');if(nb)nb.disabled=ptWeekOffset>=0;
  var html='<div class="pt-matrix"><div class="pt-cell-h pt-corner"></div>';
  PRAYER_KEYS.forEach(function(k){html+='<div class="pt-cell-h">'+PRAYER_AR[k]+'</div>';});
  days.forEach(function(d){
    var dk=ptDKey(d),isToday=dk===todayK,future=(d-now>0)&&!isToday;
    html+='<div class="pt-day'+(isToday?' today':'')+'">'+DAYS_AR[d.getDay()]+'<span>'+d.getDate()+'/'+(d.getMonth()+1)+'</span></div>';
    PRAYER_KEYS.forEach(function(k){
      var st=getPT(dk,k).status;
      if(future){html+='<div class="pt-tile pt-future" title="لم يحن بعد"></div>';}
      else{html+='<button class="pt-tile '+PT_CLASS[st]+'" onclick="cyclePTStatus(\''+dk+'\',\''+k+'\')" title="'+DAYS_AR[d.getDay()]+' · '+PRAYER_AR[k]+' — اضغط للتبديل">'+(st==='none'?'':PT_LABELS[st])+'</button>';}
    });
  });
  html+='</div><div class="pt-legend">';
  ['jama3a','solo','late','qada','missed'].forEach(function(s){html+='<span class="pt-leg"><i class="pt-dot '+PT_CLASS[s]+'"></i>'+PT_LABELS[s]+'</span>';});
  html+='<span class="pt-leg-hint">اضغط الخانة للتبديل: جماعة ← فذّ ← متأخر ← قضاء ← فاتت</span></div>';
  body.innerHTML=html;
  renderPtWeekSummary();icons();
}
function renderPtWeekSummary(){
  var el=document.getElementById('pt-week-summary');if(!el)return;
  var counts={jama3a:0,solo:0,late:0,qada:0,missed:0,none:0};
  ptWeekDates().forEach(function(d){var dk=ptDKey(d);PRAYER_KEYS.forEach(function(k){var st=getPT(dk,k).status;counts[st]=(counts[st]||0)+1;});});
  var pend=qadaPending();
  el.innerHTML=
    '<div class="qada-banner'+(pend>0?' on':'')+'"><i data-lucide="'+(pend>0?'alert-octagon':'check-circle-2')+'"></i>'+
      '<div><div class="qada-n">'+pend+'</div><div class="qada-lbl">صلوات فائتة بانتظار القضاء</div></div></div>'+
    '<div class="pt-sumgrid">'+
      '<div class="pt-sum pt-jama3a"><b>'+counts.jama3a+'</b>جماعة</div>'+
      '<div class="pt-sum pt-solo"><b>'+counts.solo+'</b>فذّ</div>'+
      '<div class="pt-sum pt-late"><b>'+counts.late+'</b>متأخر</div>'+
      '<div class="pt-sum pt-qada"><b>'+counts.qada+'</b>قضاء</div>'+
      '<div class="pt-sum pt-missed"><b>'+counts.missed+'</b>فاتت</div>'+
    '</div>';
}
// all-time prayer summary for the Statistics page
function renderPrayerStats(){
  var el=document.getElementById('prayer-stats'); if(!el)return;
  var c={jama3a:0,solo:0,late:0,qada:0,missed:0,total:0},pt=S.prayerTrack||{};
  Object.keys(pt).forEach(function(dk){PRAYER_KEYS.forEach(function(k){if(pt[dk][k]){var st=pt[dk][k].status;if(st&&st!=='none'){c[st]=(c[st]||0)+1;c.total++;}}});});
  var onTime=c.jama3a+c.solo, rate=c.total?Math.round(onTime/c.total*100):0;
  el.innerHTML='<div class="pstat-rate"><div class="pstat-rate-n">'+rate+'%</div><div class="pstat-rate-l">في وقتها (جماعة/فذّ) من '+c.total+' صلاة مسجّلة</div></div>'+
    '<div class="pt-sumgrid">'+
      '<div class="pt-sum pt-jama3a"><b>'+c.jama3a+'</b>جماعة</div>'+
      '<div class="pt-sum pt-solo"><b>'+c.solo+'</b>فذّ</div>'+
      '<div class="pt-sum pt-late"><b>'+c.late+'</b>متأخر</div>'+
      '<div class="pt-sum pt-qada"><b>'+c.qada+'</b>قضاء</div>'+
      '<div class="pt-sum pt-missed"><b>'+c.missed+'</b>فاتت</div>'+
    '</div>';
}
function fetchPrayerTimes(force){
  if(!S.settings)S.settings={};
  var city=S.settings.city,country=S.settings.country;
  if(!city||!country){notify('أدخل المدينة والدولة في الإعدادات أولاً','alert-circle');return;}
  // check if fetch needed (weekly)
  if(!force){var lf=S.settings.lastFetch;if(lf){var diff=(new Date()-new Date(lf))/86400000;if(diff<7)return;}}
  var badge=document.getElementById('fetch-status-badge');
  if(badge){badge.className='fetch-status fetch-idle';badge.textContent='جارٍ الجلب...';}
  notify('جارٍ جلب المواقيت...','download-cloud');
  // fetch 7 days
  var fetched=0,failed=false;
  var d=new Date();
  for(var i=0;i<7;i++){
    (function(day){
      var dd=new Date(d);dd.setDate(d.getDate()+day);
      var dateStr=(dd.getDate())+'-'+(dd.getMonth()+1)+'-'+dd.getFullYear();
      var dayKey=DAYS[dd.getDay()];
      var url='https://api.aladhan.com/v1/timingsByCity/'+dateStr+'?city='+encodeURIComponent(city)+'&country='+encodeURIComponent(country)+'&method='+(S.settings.method||4);
      fetch(url).then(function(r){return r.json();}).then(function(data){
        if(data.code===200&&data.data&&data.data.timings){
          var t=data.data.timings;
          if(!S.prayerWeek)S.prayerWeek=JSON.parse(JSON.stringify(emptyWeek));
          S.prayerWeek[dayKey]={fajr:t.Fajr.slice(0,5),dhuhr:t.Dhuhr.slice(0,5),asr:t.Asr.slice(0,5),maghrib:t.Maghrib.slice(0,5),isha:t.Isha.slice(0,5)};
          // احفظ الإحداثيات لحساب اتجاه القبلة (بطاقة التقويم الهجري في الرئيسية)
          if(data.data.meta&&typeof data.data.meta.latitude==='number'){ if(!S.settings)S.settings={}; S.settings.lat=data.data.meta.latitude; S.settings.lng=data.data.meta.longitude; }
        }else{failed=true;}
        fetched++;if(fetched===7){finishFetch(failed);}
      }).catch(function(){failed=true;fetched++;if(fetched===7){finishFetch(true);}});
    })(i);
  }
}
function finishFetch(failed){
  if(!failed){
    S.settings.lastFetch=new Date().toLocaleDateString('ar-EG');
    save();renderPrayerTable();renderTodayPrayers();renderHome();renderSettingsPage();
    notify('تم جلب المواقيت بنجاح ✓','check-circle');
    var badge=document.getElementById('fetch-status-badge');
    if(badge){badge.className='fetch-status fetch-ok';badge.textContent='تم الجلب ✓';}
  }else{
    notify('فشل الجلب — تحقق من الاتصال','x-circle');
    var badge=document.getElementById('fetch-status-badge');
    if(badge){badge.className='fetch-status fetch-err';badge.textContent='فشل الجلب';}
  }
}

// ==========================================================================
// ===== قضاء الفوائت — «صلوات العمر» =========================================
// عدّاد تراكمي لكل فرض فات على مدار العمر، ثم قضاء تدريجي مع عون لعمى الوقت
// (شريط تقدّم + «تنتهي بإذن الله في …» بالتاريخين الميلادي والهجري) ونبرة
// مشجّعة لا تلوم أبداً. أداة محايدة فقهياً — لا فتوى ولا حكم، مجرّد إحصاء ومتابعة.
// البيانات: S.qadaLife (قيَم افتراضية كسولة، بلا ترحيل) — تُحفظ عبر save().
// ==========================================================================
var QADA_FARD=['fajr','dhuhr','asr','maghrib','isha'];
var qadaSetupMode=false, qadaSetupMethod='duration', qadaSetupWitr=false;   // حالة نموذج الإعداد (غير محفوظة)

function qadaState(){
  if(!S.qadaLife)S.qadaLife={ on:false, witr:false, startedAt:0, log:{}, counts:{} };
  var q=S.qadaLife;
  if(q.nudge==null)q.nudge=false;     // اقتراح قضاء فائتة بعد كل صلاة حاضرة (opt-in)
  if(q.remind==null)q.remind=false;   // وِرد القضاء المسائي (opt-in، عبر إشعارات النظام)
  if(!q.counts)q.counts={};
  QADA_FARD.forEach(function(k){ if(!q.counts[k])q.counts[k]={total:0,done:0}; });
  if(q.witr && !q.counts.witr)q.counts.witr={total:0,done:0};
  if(!q.log)q.log={};
  return q;
}
function qadaKeys(){ var q=qadaState(); return q.witr?QADA_FARD.concat(['witr']):QADA_FARD.slice(); }
function qadaLabel(k){ return k==='witr'?'الوتر':(PRAYER_AR[k]||k); }

// ---- دوال حسابية صِرفة (مُختبَرة في tests/qada.test.js) ----
function qadaTotals(q){
  var total=0,done=0,counts=(q&&q.counts)||{};
  Object.keys(counts).forEach(function(k){
    var c=counts[k]||{}, t=Math.max(0,+c.total||0), dn=Math.min(Math.max(0,+c.done||0),t);
    total+=t; done+=dn;
  });
  return { total:total, done:done, remain:Math.max(0,total-done) };
}
function qadaPace(log, windowDays, now){          // متوسّط ما قُضِي/يوم خلال آخر windowDays
  now=now||Date.now(); windowDays=windowDays||7; var sum=0;
  for(var i=0;i<windowDays;i++){ var d=new Date(now-i*86400000); var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); sum+=(+((log&&log[k])||0)); }
  return sum/windowDays;
}
function qadaEtaDays(remain, pace){ if(remain<=0)return 0; if(!pace||pace<=0)return Infinity; return Math.ceil(remain/pace); }
function qadaStreak(log, now){                     // أيام متتالية فيها قضاء (يتسامح مع «اليوم لم يُسجَّل بعد»)
  log=log||{}; now=now||Date.now(); var s=0, d=new Date(now);
  for(var i=0;i<4000;i++){
    var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    if((+log[k]||0)>0){ s++; d.setDate(d.getDate()-1); }
    else if(i===0){ d.setDate(d.getDate()-1); }     // اليوم لم يُسجَّل → ابدأ من الأمس
    else break;
  }
  return s;
}

// ---- جسر المتتبّع الأسبوعي ⇄ عدّاد العمر ----
// الفوائت المعلَّمة «فاتت» في المتتبّع ولم تُضَمّ بعد لعدّاد العمر (cell.life = ضُمّت)
function qadaUnabsorbed(pt){
  pt=pt||S.prayerTrack||{}; var n=0,cells=[];
  Object.keys(pt).forEach(function(dk){ PRAYER_KEYS.forEach(function(k){ var c=pt[dk]&&pt[dk][k]; if(c&&c.status==='missed'&&!c.life){ n++; cells.push({dk:dk,k:k}); } }); });
  return {n:n,cells:cells};
}
function qadaAbsorbMissed(){
  var q=qadaState(), u=qadaUnabsorbed(); if(!u.n)return;
  u.cells.forEach(function(c){ if(!q.counts[c.k])q.counts[c.k]={total:0,done:0}; q.counts[c.k].total++; S.prayerTrack[c.dk][c.k].life=true; });
  save(); renderQadaLife();
  if(typeof undoToast==='function')undoToast('أُضيفت '+u.n+' فائتة من المتتبّع إلى عدّاد العمر ✓',function(){ u.cells.forEach(function(c){ q.counts[c.k].total=Math.max(0,q.counts[c.k].total-1); if(S.prayerTrack[c.dk]&&S.prayerTrack[c.dk][c.k])delete S.prayerTrack[c.dk][c.k].life; }); save(); renderQadaLife(); });
}
// قضاءٌ يُسقط أقدمَ فائتة مضمومة من نفس الفرض في المتتبّع (تُعلَّم «قضاء» تلقائياً) → dk أو null
function qadaSettleOldest(k){
  var pt=S.prayerTrack||{}, dks=Object.keys(pt).filter(function(dk){ var c=pt[dk][k]; return c&&c.status==='missed'&&c.life; });
  if(!dks.length)return null;
  dks.sort(function(a,b){ return new Date(a.replace(/-/g,'/'))-new Date(b.replace(/-/g,'/')); });
  pt[dks[0]][k].status='qada';
  return dks[0];
}

// ---- الأفعال (قضاء صلاة / يوم كامل، مع تراجُع) ----
function qadaDid(k){
  var q=qadaState(), c=q.counts[k]; if(!c||c.done>=c.total)return;
  c.done++; var tk=todayKey(); q.log[tk]=(+q.log[tk]||0)+1;
  var sdk=qadaSettleOldest(k);                                   // يُسوّي أقدم فائتة مضمومة في المتتبّع
  save(); if(typeof playClick==='function')playClick(); renderQadaLife();
  if(sdk){ try{renderPrayerTrack();}catch(e){} }
  if(c.done>=c.total && typeof notify==='function')notify('أتممت قضاء '+qadaLabel(k)+' — تقبّل الله 🤍','check-circle');
  qadaMaybeCelebrate();
  if(typeof undoToast==='function')undoToast('قضيت '+qadaLabel(k)+' ✓ (+١)',function(){ c.done=Math.max(0,c.done-1); q.log[tk]=Math.max(0,(+q.log[tk]||0)-1); if(sdk&&S.prayerTrack[sdk]&&S.prayerTrack[sdk][k])S.prayerTrack[sdk][k].status='missed'; save(); renderQadaLife(); try{renderPrayerTrack();}catch(e){} });
}
function qadaDidDay(){
  var q=qadaState(), tk=todayKey(), changed=[], settles=[];
  qadaKeys().forEach(function(k){ var c=q.counts[k]; if(c&&c.done<c.total){ c.done++; changed.push(k); var sdk=qadaSettleOldest(k); if(sdk)settles.push({k:k,dk:sdk}); } });
  if(!changed.length){ if(typeof notify==='function')notify('لا فوائت متبقّية — الحمد لله 🤍','check-circle'); return; }
  q.log[tk]=(+q.log[tk]||0)+changed.length;
  save(); if(typeof playClick==='function')playClick(); if(typeof flashDone==='function')flashDone(); renderQadaLife();
  if(settles.length){ try{renderPrayerTrack();}catch(e){} }
  var done=changed.length;
  if(typeof notify==='function' && done<5)notify('سجّلت قضاء '+done+' صلاة من يومٍ كامل ✓','check-circle');
  qadaMaybeCelebrate();
  if(typeof undoToast==='function')undoToast('قضيت يوماً كاملاً ✓ (+'+done+')',function(){ changed.forEach(function(k){ q.counts[k].done=Math.max(0,q.counts[k].done-1); }); settles.forEach(function(s){ if(S.prayerTrack[s.dk]&&S.prayerTrack[s.dk][s.k])S.prayerTrack[s.dk][s.k].status='missed'; }); q.log[tk]=Math.max(0,(+q.log[tk]||0)-done); save(); renderQadaLife(); try{renderPrayerTrack();}catch(e){} });
}
function qadaFlagsChange(){
  var q=qadaState();
  var n=document.getElementById('qada-nudge-chk'); if(n)q.nudge=!!n.checked;
  var r=document.getElementById('qada-remind-chk'); if(r)q.remind=!!r.checked;
  save();
}
function qadaMaybeCelebrate(){
  var t=qadaTotals(qadaState());
  if(t.total>0 && t.remain===0){ if(typeof celebrate==='function')celebrate(); if(typeof flashDone==='function')flashDone(); }
}
function qadaFinish(){
  if(!confirm('إنهاء رحلة القضاء وإخفاء البطاقة؟ أرقامك تبقى محفوظة، ويمكنك بدؤها من جديد لاحقاً.'))return;
  qadaState().on=false; save(); renderQadaLife();
}

// ---- نموذج الإعداد (فتح/طريقة/تأكيد) ----
function qadaBeginSetup(method){ qadaSetupMode=true; qadaSetupMethod=method||'duration'; qadaSetupWitr=!!qadaState().witr; renderQadaLife(); }
function qadaCancelSetup(){ qadaSetupMode=false; renderQadaLife(); }
function qadaSetMethod(m){ qadaSetupMethod=m; renderQadaLife(); }
function qadaToggleWitr(){ var c=document.getElementById('qd-witr'); qadaSetupWitr=c?!!c.checked:!qadaSetupWitr; renderQadaLife(); }
function qadaDurPreview(){
  var y=parseInt((document.getElementById('qd-years')||{}).value)||0;
  var mo=parseInt((document.getElementById('qd-months')||{}).value)||0;
  var n=Math.max(0,Math.round(y*365+mo*30));
  var el=document.getElementById('qd-preview'); if(!el)return;
  var per=qadaSetupWitr?6:5;
  el.innerHTML=n>0?('≈ <b>'+n.toLocaleString('ar-EG')+'</b> صلاة لكل فرض · الإجمالي <b>'+(n*per).toLocaleString('ar-EG')+'</b> صلاة'):'أدخِل المدة لتُحسَب الفوائت تلقائياً';
}
function qadaConfirmSetup(){
  var q=qadaState(); q.witr=!!qadaSetupWitr;
  if(q.witr && !q.counts.witr)q.counts.witr={total:0,done:0};
  if(!q.witr && q.counts.witr)delete q.counts.witr;
  var keys=q.witr?QADA_FARD.concat(['witr']):QADA_FARD.slice();
  if(qadaSetupMethod==='duration'){
    var y=parseInt((document.getElementById('qd-years')||{}).value)||0;
    var mo=parseInt((document.getElementById('qd-months')||{}).value)||0;
    var n=Math.max(0,Math.round(y*365+mo*30));
    keys.forEach(function(k){ if(!q.counts[k])q.counts[k]={total:0,done:0}; q.counts[k].total=n; q.counts[k].done=Math.min(q.counts[k].done||0,n); });
  }else{
    keys.forEach(function(k){ var inp=document.getElementById('qm-'+k); var v=Math.max(0,parseInt(inp&&inp.value)||0); if(!q.counts[k])q.counts[k]={total:0,done:0}; q.counts[k].total=v; q.counts[k].done=Math.min(q.counts[k].done||0,v); });
  }
  if(qadaTotals(q).total<=0){ if(typeof notify==='function')notify('أدخِل عدداً واحداً على الأقل لتبدأ','alert-circle'); return; }
  q.on=true; if(!q.startedAt)q.startedAt=Date.now();
  save(); qadaSetupMode=false; renderQadaLife();
  if(typeof notify==='function')notify('بدأت رحلة القضاء — وفّقك الله 🤍','play');
}

// ---- نصّ التقدير: «تنتهي بإذن الله في …» (مدة + ميلادي + هجري أمّ القرى) ----
function qadaEtaText(remain, pace, now){
  var days=qadaEtaDays(remain,pace);
  if(days===0)return null;
  if(!isFinite(days))return { none:true };
  now=now||Date.now(); var end=new Date(now+days*86400000);
  var greg='',hij='';
  try{ greg=end.toLocaleDateString('ar-EG',{year:'numeric',month:'long'}); }catch(e){}
  try{ hij=end.toLocaleDateString('ar-SA-u-ca-islamic',{month:'long',year:'numeric'}); }catch(e){}
  var ar=function(n){ try{ return n.toLocaleString('ar-EG'); }catch(e){ return String(n); } };
  var yrs=Math.floor(days/365), mos=Math.round((days%365)/30), dur;
  if(yrs>0)dur=ar(yrs)+' سنة'+(mos>0?(' و'+ar(mos)+' شهر'):'');
  else if(days>=30)dur=ar(Math.round(days/30))+' شهر';
  else dur=ar(days)+' يوم';
  return { dur:dur, greg:greg, hij:hij, days:days };   // hij يحوي «هـ» أصلاً من محلّية ar-SA
}

// ---- الرسم: بطاقة القضاء (فراغ ترحيبي / نموذج إعداد / عرض نشِط) ----
function renderQadaLife(){
  var el=document.getElementById('qada-life'); if(!el)return;
  var q=qadaState(), tot=qadaTotals(q);

  // (١) نموذج الإعداد
  if(qadaSetupMode){
    var per=qadaSetupWitr?6:5;
    var dur=
      '<div class="qada-dur">'+
        '<div class="qada-q">كم سنة (تقريباً) كنت لا تُصلّي فيها، أو تُصلّي متقطّعاً؟</div>'+
        '<div class="qada-dur-inputs">'+
          '<label><input type="number" id="qd-years" min="0" value="0" oninput="qadaDurPreview()"> سنة</label>'+
          '<label><input type="number" id="qd-months" min="0" max="11" value="0" oninput="qadaDurPreview()"> شهر</label>'+
        '</div>'+
        '<div class="qada-dur-preview" id="qd-preview">أدخِل المدة لتُحسَب الفوائت تلقائياً</div>'+
        '<div class="qada-note">حساب تقريبي (يوم = ٥ فروض). تستطيع تعديل أي رقم لاحقاً.</div>'+
      '</div>';
    var man='<div class="qada-manual">'+
      (qadaSetupWitr?QADA_FARD.concat(['witr']):QADA_FARD).map(function(k){
        var cur=(q.counts[k]&&q.counts[k].total)||0;
        return '<label class="qada-mrow"><span>'+qadaLabel(k)+'</span><input type="number" id="qm-'+k+'" min="0" value="'+cur+'"></label>';
      }).join('')+'</div>';
    el.innerHTML=
      '<div class="qada-setup">'+
        '<div class="qada-seg">'+
          '<button class="'+(qadaSetupMethod==='duration'?'on':'')+'" onclick="qadaSetMethod(\'duration\')">تقدير بالمدة</button>'+
          '<button class="'+(qadaSetupMethod==='manual'?'on':'')+'" onclick="qadaSetMethod(\'manual\')">إدخال يدوي</button>'+
        '</div>'+
        (qadaSetupMethod==='duration'?dur:man)+
        '<label class="qada-witr"><input type="checkbox" id="qd-witr" '+(qadaSetupWitr?'checked':'')+' onchange="qadaToggleWitr()"> إضافة الوتر (لمن يعدّه واجباً)</label>'+
        '<div class="qada-setup-foot">'+
          '<button class="btn ghost sm" onclick="qadaCancelSetup()">إلغاء</button>'+
          '<button class="btn pri" onclick="qadaConfirmSetup()"><i data-lucide="check"></i> ابدأ القضاء</button>'+
        '</div>'+
      '</div>';
    icons();
    if(qadaSetupMethod==='duration')qadaDurPreview();
    return;
  }

  // (٢) فراغ ترحيبي (لم تُفعَّل بعد)
  if(!q.on || tot.total<=0){
    el.innerHTML=
      '<div class="qada-intro">'+
        '<div class="qada-intro-ic">🕊️</div>'+
        '<div class="qada-intro-t">قضاء فوائت العمر</div>'+
        '<div class="qada-intro-s">أحصِ ما فاتك من الصلوات، وابدأ تُنقِص منها كل يوم — ولو صلاةً واحدة. رحلةٌ تبدأ بخطوة، وربُّك يفرح بعبده المُتدارِك.</div>'+
        '<button class="btn pri" onclick="qadaBeginSetup(\'duration\')"><i data-lucide="play"></i> ابدأ رحلة القضاء</button>'+
        '<div class="qada-note">قدّر العدد باجتهادك؛ وإن احتجت الدقّة في الحكم فاستشر من تثق بعلمه. هذه أداة متابعة لا فُتيا.</div>'+
      '</div>';
    icons();
    return;
  }

  // (٣) عرض نشِط
  var pct=tot.total?Math.round(tot.done/tot.total*100):0;
  var allDone=tot.remain===0;
  var pace=qadaPace(q.log,7);
  var streak=qadaStreak(q.log);
  var todayN=(+q.log[todayKey()]||0);
  var eta=qadaEtaText(tot.remain,pace);

  var rows=qadaKeys().map(function(k){
    var c=q.counts[k]||{total:0,done:0}, rem=Math.max(0,c.total-c.done), p=c.total?Math.round(c.done/c.total*100):0, full=rem===0&&c.total>0;
    return '<div class="qada-row'+(full?' full':'')+'">'+
      '<div class="qada-row-name">'+qadaLabel(k)+'</div>'+
      '<div class="qada-bar"><span style="width:'+p+'%"></span></div>'+
      '<div class="qada-row-n">'+(c.total-rem).toLocaleString('ar-EG')+' / '+c.total.toLocaleString('ar-EG')+'</div>'+
      (full
        ? '<div class="qada-done-ic" title="اكتمل">✓</div>'
        : '<button class="btn sm qada-plus" onclick="qadaDid(\''+k+'\')"><i data-lucide="plus"></i> قضيت</button>')+
    '</div>';
  }).join('');

  var etaLine;
  if(allDone) etaLine='<div class="qada-eta done"><i data-lucide="party-popper"></i> أتممت قضاء فوائتك كلّها — تقبّل الله منك 🤍</div>';
  else if(!eta || eta.none) etaLine='<div class="qada-eta soft"><i data-lucide="sparkles"></i> ابدأ اليوم بصلاة واحدة — وسيظهر هنا موعد إتمامك المتوقّع بمجرّد أن تبدأ.</div>';
  else etaLine='<div class="qada-eta"><i data-lucide="calendar-clock"></i> بمعدّل آخر أيامك، تنتهي بإذن الله خلال <b>'+eta.dur+'</b>'+(eta.greg?(' — نحو <b>'+eta.greg+'</b>'):'')+(eta.hij?(' <span class="qada-hij">('+eta.hij+')</span>'):'')+'</div>';

  el.innerHTML=
    '<div class="qada-head">'+
      '<div class="qada-pct"><div class="qada-pct-n">'+pct.toLocaleString('ar-EG')+'٪</div><div class="qada-pct-l">قُضِيت '+tot.done.toLocaleString('ar-EG')+' من '+tot.total.toLocaleString('ar-EG')+'</div></div>'+
      '<div class="qada-remain"><div class="qada-remain-n">'+tot.remain.toLocaleString('ar-EG')+'</div><div class="qada-remain-l">صلاة متبقّية</div></div>'+
    '</div>'+
    '<div class="qada-obar"><span style="width:'+pct+'%"></span></div>'+
    '<div class="qada-rows">'+rows+'</div>'+
    (allDone?'':'<button class="btn pri qada-daybtn" onclick="qadaDidDay()"><i data-lucide="check-check"></i> قضيت يوماً كاملاً ('+(qadaKeys().length)+' صلوات)</button>')+
    '<div class="qada-meta"><span title="سجّلته اليوم"><i data-lucide="sunrise"></i> اليوم: <b>'+todayN.toLocaleString('ar-EG')+'</b></span>'+
      '<span title="أيام متتالية"><i data-lucide="flame"></i> سلسلة: <b>'+streak.toLocaleString('ar-EG')+'</b> يوم</span>'+
      (q.startedAt?('<span title="عمر الرحلة"><i data-lucide="map"></i> منذ البداية: <b>'+Math.max(1,Math.ceil((Date.now()-q.startedAt)/86400000)).toLocaleString('ar-EG')+'</b> يوم</span>'+
        '<span title="متوسط القضاء اليومي منذ البداية"><i data-lucide="trending-up"></i> متوسّط: <b>'+(Math.round(tot.done/Math.max(1,Math.ceil((Date.now()-q.startedAt)/86400000))*10)/10).toLocaleString('ar-EG')+'</b>/يوم</span>'+
        '<span title="أفضل يوم"><i data-lucide="award"></i> أفضل يوم: <b>'+Math.max(0,Math.max.apply(null,[0].concat(Object.keys(q.log).map(function(dk){return +q.log[dk]||0;})))).toLocaleString('ar-EG')+'</b></span>'):'')+
    '</div>'+
    etaLine+
    (function(){ var u=qadaUnabsorbed(); return u.n>0?('<div class="qada-eta soft qada-absorb"><i data-lucide="inbox"></i> لديك <b>'+u.n.toLocaleString('ar-EG')+'</b> صلاة معلَّمة «فاتت» في المتتبّع الأسبوعي — <button class="btn sm" onclick="qadaAbsorbMissed()">أضِفها إلى العدّاد</button></div>'):''; })()+
    '<div class="qada-flags">'+
      '<label><input type="checkbox" id="qada-nudge-chk" '+(q.nudge?'checked':'')+' onchange="qadaFlagsChange()"> اقترح قضاء فائتة بعد تسجيل كل صلاة حاضرة (جماعة)</label>'+
      '<label><input type="checkbox" id="qada-remind-chk" '+(q.remind?'checked':'')+' onchange="qadaFlagsChange()"> وِرد القضاء المسائي — تذكير نظام لطيف بعد الثامنة إن لم تقضِ شيئاً</label>'+
    '</div>'+
    '<div class="qada-foot">'+
      '<button class="btn ghost sm" onclick="qadaBeginSetup(\'manual\')"><i data-lucide="pencil"></i> تعديل الأعداد</button>'+
      '<button class="btn ghost sm" onclick="qadaFinish()"><i data-lucide="check-circle-2"></i> إنهاء الرحلة</button>'+
    '</div>';
  icons();
}

