// meds.js — متتبّع الدواء (خاصّ واختياري، زي رفيق الطُّهر): لا يظهر إلا بالتفعيل، ولا يدخل أي تقرير.
// classic script (globals shared, no ES modules). تذكير لطيف + تسجيل يومي + سلسلة التزام.

function medCfg(){
  if(!S.med||typeof S.med!=='object')S.med={on:false,name:'الدواء',time:'',log:{},notified:''};
  var m=S.med;
  if(m.on==null)m.on=false;
  if(!m.name)m.name='الدواء';
  if(m.time==null)m.time='';
  if(!m.log||typeof m.log!=='object')m.log={};
  if(m.notified==null)m.notified='';
  return m;
}
function medTakenToday(){ return !!medCfg().log[todayKey()]; }
function toggleMedToday(){
  var m=medCfg(), tk=todayKey();
  if(m.log[tk])delete m.log[tk]; else m.log[tk]=true;
  if(typeof save==='function')save(); renderMedCard();
}
// عدد الأيام المتتالية المسجَّلة حتى اليوم (يقيس حتى الأمس إن لم يُسجَّل اليوم بعد)
function medStreak(){
  var m=medCfg(), s=0, d=new Date();
  var k0=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  if(!m.log[k0])d.setDate(d.getDate()-1);
  for(var i=0;i<400;i++){
    var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    if(m.log[k]){ s++; d.setDate(d.getDate()-1); } else break;
  }
  return s;
}

// بطاقة الرئيسية (مخفية تماماً ما لم يُفعَّل المتتبّع)
function renderMedCard(){
  var card=document.getElementById('med-card'), el=document.getElementById('med-body'), m=medCfg();
  if(card)card.style.display=m.on?'':'none';
  if(!m.on||!el)return;
  var taken=medTakenToday(), st=medStreak();
  var t=document.getElementById('med-title'); if(t)t.textContent=m.name||'الدواء';
  el.innerHTML=
    '<button class="med-toggle'+(taken?' on':'')+'" onclick="toggleMedToday()">'+
      '<i data-lucide="'+(taken?'check-circle-2':'circle')+'"></i> '+(taken?'أخذت دوائي اليوم ✓':'لم آخذه بعد — اضغط عند الأخذ')+
    '</button>'+
    '<div class="med-meta"><span><i data-lucide="flame"></i> '+st+' يوم متواصل</span>'+
      (m.time?'<span><i data-lucide="clock"></i> تذكير '+m.time+'</span>':'')+'</div>';
  if(typeof icons==='function')icons();
}

// إعدادات (داخل صفحة الضبط)
function renderMedSettings(){
  var el=document.getElementById('med-ctrl'); if(!el)return; var m=medCfg();
  el.innerHTML=
    '<label class="grad-row"><span>تفعيل متتبّع الدواء (خاصّ)</span><input type="checkbox" id="med-on" '+(m.on?'checked':'')+' onchange="medChange()"></label>'+
    '<div class="grad-row"><span>اسم الدواء</span><input type="text" id="med-name" value="'+esc(m.name||'')+'" maxlength="30" style="width:160px" oninput="medChange()"></div>'+
    '<div class="grad-row"><span>وقت التذكير اليومي (اختياري)</span><input type="time" id="med-time" value="'+(m.time||'')+'" oninput="medChange()"></div>';
}
function medChange(){
  var m=medCfg();
  var on=document.getElementById('med-on'); if(on)m.on=!!on.checked;
  var nm=document.getElementById('med-name'); if(nm)m.name=(nm.value||'').trim()||'الدواء';
  var tm=document.getElementById('med-time'); if(tm)m.time=tm.value||'';
  if(typeof save==='function')save(); renderMedCard();
}

// تذكير الدواء (يُستدعى من حلقة الـ60ث) — إشعار نظام مرّة واحدة يومياً عند الوقت إن لم يُسجَّل
function checkMedReminder(){
  if(!window.noahAPI||!window.noahAPI.notifyNow)return;
  var m=medCfg(); if(!m.on||!m.time)return;
  var tk=todayKey(); if(m.log[tk]||m.notified===tk)return;
  var p=m.time.split(':'), t=new Date(); t.setHours(parseInt(p[0],10)||0,parseInt(p[1],10)||0,0,0);
  if(new Date()>=t){
    m.notified=tk; if(typeof save==='function')save();
    window.noahAPI.notifyNow('تذكير: '+(m.name||'الدواء')+' 💊','حان وقت دوائك — اضغط لتسجيله بعد الأخذ');
  }
}
