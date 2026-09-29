// widget.js — المؤقّت كويدجت (اختياري): أزرار شريط المهام + شارة الدقائق، قائمة Tray حيّة، Mini-HUD عائم.
// سكربت كلاسيكي (دوال عامة، لا ES modules). يُحمّل بعد timer/remind وقبل bootstrap.
// كل السلوك محروس بـ window.noahAPI.timerWidget → يتلاشى بأمان في نسخة الويب.
// المبدأ: الراسم مصدر الحقيقة — يدفع لقطة واحدة للـmain، والـmain يطبّقها على الطبقات الثلاث.
// كل طبقة مُطفأة افتراضياً (twThumbar/twTray/twHud=false) ولا تمسّ الـCSP.

// ---- توفّر الجسر (تطبيق سطح المكتب فقط) ----
function twElectron(){ return !!(window.noahAPI && noahAPI.timerWidget); }

// ---- الإعدادات (قيَم افتراضية كسولة، بلا ترحيل) — كلها OFF ----
function twCfg(){
  if(!S.settings)S.settings={};
  var s=S.settings;
  if(s.twThumbar==null)s.twThumbar=false;   // (أ) أزرار + شارة شريط المهام
  if(s.twTray==null)s.twTray=false;          // (ب) قائمة الـTray الحيّة
  if(s.twHud==null)s.twHud=false;            // (ج) نافذة Mini-HUD عائمة
  return s;
}
function twLayers(){ var s=twCfg(); return { thumbar:!!s.twThumbar, tray:!!s.twTray, hud:!!s.twHud }; }

// ---- لون الأكسنت الحالي (لشارة الدقائق و HUD) ----
function twAccent(){
  try{ var c=(getComputedStyle(document.body).getPropertyValue('--accent')||'').trim(); return c||'#5750d8'; }
  catch(_){ return '#5750d8'; }
}

// ---- دوال حسابية صِرفة (مُختبَرة في tests/widget.test.js) ----
function twMinLeft(sec){ return Math.ceil(Math.max(0,sec||0)/60); }                 // دقائق متبقّية (للشارة/التلميح)
function twComputeActive(running, remain, total){ return !!running || (remain>0 && remain<total); } // جلسة جارية أو موقوفة في المنتصف

// ---- رسم أيقونات الأزرار (فاتحة لتظهر على شريط المهام الداكن) — تُرسل مرّة ----
function twGlyph(kind){
  try{
    var d=32, cv=document.createElement('canvas'); cv.width=d; cv.height=d;
    var x=cv.getContext('2d'); x.clearRect(0,0,d,d); x.fillStyle='#eceaf2';
    if(kind==='play'){ x.beginPath(); x.moveTo(10,7); x.lineTo(26,16); x.lineTo(10,25); x.closePath(); x.fill(); }
    else if(kind==='pause'){ x.fillRect(9,7,5,18); x.fillRect(18,7,5,18); }
    else if(kind==='skip'){ x.beginPath(); x.moveTo(8,7); x.lineTo(20,16); x.lineTo(8,25); x.closePath(); x.fill(); x.fillRect(22,7,4,18); }
    return cv.toDataURL('image/png');
  }catch(_){ return null; }
}
var _twIconsSent=false;
function twSendIcons(){
  if(!twElectron())return;
  try{ noahAPI.timerWidget.icons({ play:twGlyph('play'), pause:twGlyph('pause'), skip:twGlyph('skip') }); _twIconsSent=true; }catch(_){}
}

// ---- شارة الدقائق فوق أيقونة شريط المهام (دائرة أكسنت + رقم أبيض) ----
function twOverlay(minLeft, isBrk){
  try{
    var d=32, cv=document.createElement('canvas'); cv.width=d; cv.height=d;
    var x=cv.getContext('2d'); x.clearRect(0,0,d,d);
    x.beginPath(); x.arc(16,16,15,0,Math.PI*2); x.closePath();
    x.fillStyle=isBrk?'#1f9d6b':twAccent(); x.fill();
    x.lineWidth=2; x.strokeStyle='rgba(255,255,255,.85)'; x.stroke();
    var t=String(Math.max(1,minLeft));
    x.fillStyle='#fff'; x.textAlign='center'; x.textBaseline='middle';
    x.font='bold '+(t.length>=2?15:19)+'px "Segoe UI",Tahoma,sans-serif';
    x.fillText(t,16,17);
    return cv.toDataURL('image/png');
  }catch(_){ return null; }
}

// ---- بناء لقطة الحالة من متغيّرات المؤقّت العامّة (timer.js) ----
function twSnapshot(){
  var running=(typeof isRunning!=='undefined')&&isRunning;
  var brk=(typeof isBreak!=='undefined')&&isBreak;
  var lbrk=(typeof isLongBreak!=='undefined')&&isLongBreak;
  var total=brk?getBreakDur():getWorkDur();
  var remain=Math.max(0,(typeof timeLeft!=='undefined')?timeLeft:0);
  var endAt=running ? ((typeof expectedEndTime!=='undefined'&&expectedEndTime)?expectedEndTime:(Date.now()+remain*1000)) : 0;
  return {
    running:running, isBreak:brk, isLongBreak:lbrk,
    remainSec:remain, totalSec:total, endAt:endAt,
    active:twComputeActive(running,remain,total), accent:twAccent(),
    label: brk?(lbrk?'راحة طويلة':'راحة'):'جلسة سعي',
    layers:twLayers()
  };
}

// ---- دفع الحالة للـmain (مخنوق بالتوقيع: يدفع فقط عند تغيّر ذي معنى) ----
var _twLastSig='', _twLastEnd=0;
function twSync(){
  if(!twElectron())return;
  var st=twSnapshot(), L=st.layers, min=twMinLeft(st.remainSec);
  var sig=[st.running,st.isBreak,st.isLongBreak,min,st.active,L.thumbar,L.tray,L.hud,st.accent].join('|');
  if(sig===_twLastSig && st.endAt===_twLastEnd)return;
  _twLastSig=sig; _twLastEnd=st.endAt;
  if(L.thumbar && st.running) st.overlay=twOverlay(min, st.isBreak);   // ارسم الشارة فقط عند الحاجة
  try{ noahAPI.timerWidget.state(st); }catch(_){}
}

// ---- أمر تحكّم وصل من ثمبار/tray/HUD → طبّقه على المؤقّت الحقيقي ----
function twOnCommand(cmd){
  try{
    if(cmd==='start'){ if(typeof isRunning!=='undefined'&&!isRunning&&typeof startTimer==='function')startTimer(); }
    else if(cmd==='pause'){ if(typeof isRunning!=='undefined'&&isRunning&&typeof pauseTimer==='function')pauseTimer(); }
    else if(cmd==='skip'){ if(typeof isBreak!=='undefined'&&isBreak&&typeof skipBreak==='function')skipBreak(); }
    else if(cmd==='reset'){ if(typeof resetTimer==='function')resetTimer(); }
    else if(cmd==='hud-off'){ var s=twCfg(); s.twHud=false; if(typeof save==='function')save(); if(typeof renderWidgetSettings==='function')renderWidgetSettings(); }
  }catch(e){ try{ if(window.noahAPI&&noahAPI.logError)noahAPI.logError('tw-cmd '+cmd+': '+((e&&e.stack)||e)); }catch(_){} }
  twSync();
}

// ---- واجهة الضبط (تُرسم في #timerwidget-ctrl) ----
function renderWidgetSettings(){
  var el=document.getElementById('timerwidget-ctrl'); if(!el)return;
  if(!twElectron()){ el.innerHTML='<div class="setting-sub">ويدجت المؤقّت متاح في تطبيق سطح المكتب فقط.</div>'; return; }
  var s=twCfg();
  el.innerHTML=
    '<label class="grad-row"><span>أزرار المؤقّت على شريط المهام <b style="color:var(--accent-text)">▶ ⏸ ⏭</b> + شارة الدقائق المتبقية</span><input type="checkbox" id="tw-thumb" '+(s.twThumbar?'checked':'')+' onchange="widgetChange()"></label>'+
    '<label class="grad-row"><span>عرض المؤقّت والتحكّم به من قائمة أيقونة شريط المهام (Tray) — يعمل حتى والنافذة مغلقة</span><input type="checkbox" id="tw-tray" '+(s.twTray?'checked':'')+' onchange="widgetChange()"></label>'+
    '<label class="grad-row"><span>نافذة عائمة صغيرة (Mini-HUD) تطفو فوق كل النوافذ أثناء الجلسة — تُسحب وتتذكّر مكانها</span><input type="checkbox" id="tw-hud" '+(s.twHud?'checked':'')+' onchange="widgetChange()"></label>'+
    '<div class="setting-sub" style="margin-top:.5rem">كل الطبقات اختيارية ومطفأة افتراضياً، ولا تمسّ إعدادات الأمان. تظهر عناصر التحكّم بعد بدء جلسة سعي (وأزرار شريط المهام فور التفعيل).</div>';
  if(typeof icons==='function')icons();
}
function widgetChange(){
  var s=twCfg();
  var a=document.getElementById('tw-thumb'); if(a)s.twThumbar=!!a.checked;
  var b=document.getElementById('tw-tray');  if(b)s.twTray=!!b.checked;
  var c=document.getElementById('tw-hud');   if(c)s.twHud=!!c.checked;
  if(typeof save==='function')save();
  if(!_twIconsSent)twSendIcons();
  _twLastSig='';            // اجبر الدفع بعد تغيّر الطبقات
  twSync();
}

// ---- تهيئة لمرّة واحدة (من bootstrap بعد الهيدرة) ----
function initWidget(){
  if(!twElectron())return;
  try{ noahAPI.timerWidget.onCommand(twOnCommand); }catch(_){}
  twSendIcons();
  twSync();
}
