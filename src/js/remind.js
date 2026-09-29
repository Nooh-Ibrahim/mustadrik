// remind.js — background reminders + global quick-capture + idle handling
// classic script (globals shared, no ES modules). Loads after home/cards, before bootstrap.
// All OS-level behaviour is guarded by window.noahAPI → degrades gracefully on the web build.

// ---- settings (lazy defaults, no migration needed) ----
function remindCfg(){
  if(!S.settings)S.settings={};
  var s=S.settings;
  if(s.bgReminders==null)s.bgReminders=true;        // close button → stay in tray, reminders keep firing
  if(s.autoLaunch==null)s.autoLaunch=false;          // opt-in: launch at Windows login
  if(s.autoLaunchHidden==null)s.autoLaunchHidden=true;
  if(s.quickCapture==null)s.quickCapture=true;       // global Ctrl+Alt+N popup
  if(s.idlePause==null)s.idlePause=true;             // auto-pause timer when away
  if(s.dlRemind==null)s.dlRemind=true;               // تذكير مواعيد الترم (مثل تذكير الواجبات: مُفعَّل، وقابل للإطفاء)
  return s;
}

// push the current preferences down to the main process
function applyRemindSettings(){
  var s=remindCfg();
  if(!window.noahAPI)return;
  try{ if(window.noahAPI.tray&&window.noahAPI.tray.setClose)window.noahAPI.tray.setClose(s.bgReminders!==false); }catch(e){}
  try{ if(window.noahAPI.hotkey&&window.noahAPI.hotkey.set)window.noahAPI.hotkey.set(s.quickCapture!==false); }catch(e){}
  try{ if(window.noahAPI.autoLaunch&&window.noahAPI.autoLaunch.set)window.noahAPI.autoLaunch.set({enabled:!!s.autoLaunch,hidden:s.autoLaunchHidden!==false}); }catch(e){}
}

// أي نافذة تذكير يستحقّها هذا الموعد الآن؟ دالة صِرفة (بلا DOM ولا noahAPI) — مُختبَرة.
// النوافذ: بكرة مساءً · صبح اليوم · بعد الفوات (٣ أيام فقط — الأعلام تُمسح يومياً فبلا قيدٍ يُنبّه للأبد)
// · وللامتحانات وحدها تنبيه مبكّر قبل ٣ أيام يكفي لخطة مراجعة.
function dlRemindWindow(d,now){
  if(!d||d.done||!d.date)return null;
  var dm=new Date(d.date+'T'+(d.time||'08:00')+':00').getTime();
  if(isNaN(dm))return null;
  var h=now.getHours();
  var mid=new Date(now); mid.setHours(0,0,0,0);
  var days=Math.round((new Date(d.date+'T00:00:00').getTime()-mid.getTime())/86400000);
  if(days<0)  return (days>=-3&&h>=9) ? {kind:'over',flag:'dlo_'} : null;
  if(days===0)return h>=8  ? {kind:'today',flag:'dld_'} : null;
  if(days===1)return h>=18 ? {kind:'tomorrow',flag:'dlt_'} : null;
  if(days===3&&d.kind==='exam')return h>=9 ? {kind:'exam3',flag:'dle_'} : null;
  return null;
}

// ===== task + study reminders (run from the 60s loop, like checkPrayerReminders) =====
function checkTaskReminders(){
  if(!window.noahAPI||!window.noahAPI.notifyNow)return;   // OS reminders only in the desktop app
  if(!S||!Array.isArray(S.tasks))return;
  var now=new Date(),h=now.getHours(),tk=todayKey();
  if(!S.taskNotified)S.taskNotified={};
  Object.keys(S.taskNotified).forEach(function(k){ if(k!==tk)delete S.taskNotified[k]; });  // keep state tiny
  if(!S.taskNotified[tk])S.taskNotified[tk]={};
  var flags=S.taskNotified[tk],changed=false;
  var todayMid=new Date();todayMid.setHours(0,0,0,0);var todayMs=todayMid.getTime();
  // morning+ : surface today's and overdue tasks once each (mirrors hub.js overdue logic)
  if(h>=9){
    S.tasks.forEach(function(t){
      if(!t||t.done||t.archived||!t.deadline)return;
      var dm=new Date(t.deadline).getTime(); if(isNaN(dm))return;
      if(dm<todayMs&&!flags['over_'+t.id]){
        flags['over_'+t.id]=true;changed=true;
        // (إصلاح) الحقل اسمه text مش title — كانت الإشعارات تظهر بلا اسم الواجب دائماً
        window.noahAPI.notifyNow('واجب متأخّر ⏰',(t.text||'واجب')+' — تداركه اليوم','tasks');
      }else if(dm>=todayMs&&dm<todayMs+86400000&&!flags['due_'+t.id]){
        flags['due_'+t.id]=true;changed=true;
        window.noahAPI.notifyNow('واجب اليوم 📌',t.text||'لديك واجب مستحقّ اليوم','tasks');
      }
    });
  }
  // ---- مواعيد الترم (امتحانات وتسليمات) — نوافذ محدودة بلا إزعاج ----
  if(S.settings&&S.settings.dlRemind!==false&&Array.isArray(S.deadlines)){
    S.deadlines.forEach(function(d){
      var w=dlRemindWindow(d,now);
      if(!w||flags[w.flag+d.id])return;
      flags[w.flag+d.id]=true;changed=true;
      var kindAr=(typeof dlKindLabel==='function')?dlKindLabel(d.kind):'موعد';
      var sub=d.subject?(' — '+((typeof subjLabel==='function')?subjLabel(d.subject):'')):'';
      var msg={
        over:    [kindAr+' فات ⏰',       (d.title||'موعد')+sub+' — راجع مواعيدك'],
        today:   [kindAr+' النهارده 📌',  (d.title||'موعد')+sub],
        tomorrow:[kindAr+' بكرة 🔔',      (d.title||'موعد')+sub+' — جهّز نفسك الليلة'],
        exam3:   ['امتحان بعد ٣ أيام 📚', (d.title||'امتحان')+sub+' — ابدأ مراجعتك من دلوقتي']
      }[w.kind];
      window.noahAPI.notifyNow(msg[0],msg[1],'progress');
    });
  }
  // evening nudge: nothing studied yet today
  if(h>=19&&!flags.nostudy){
    var mins=(S.activityLog&&S.activityLog[tk])||0;
    if(!mins){
      flags.nostudy=true;changed=true;
      window.noahAPI.notifyNow('لسه ما بدأتش 🌙','جلسة سعي صغيرة (٥ دقائق) تكسر الجمود — تبدأ؟','pomodoro');
    }
  }
  // وِرد القضاء المسائي (opt-in من بطاقة القضاء): لم يقضِ شيئاً اليوم وثمّة فوائت باقية
  if(h>=20&&!flags.qadaWird){
    try{
      if(typeof qadaState==='function'){
        var q=qadaState();
        if(q.on&&q.remind&&qadaTotals(q).remain>0&&!(+q.log[tk]||0)){
          flags.qadaWird=true;changed=true;
          window.noahAPI.notifyNow('وِرد القضاء 🕊️','صلاة واحدة الليلة تُنقِص فوائتك — يسّر الله لك','praytrack');
        }
      }
    }catch(e){}
  }
  if(changed&&typeof save==='function')save();
}

// ===== global quick-capture → brain-dump inbox =====
function quickCaptureAdd(text){
  text=(text||'').trim(); if(!text)return;
  var rec={ id:'bd_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
            profileId:curProfileId(),
            text:text, createdAt:Date.now(), processed:false };
  if(typeof dbPut==='function'&&typeof dbReady==='function'&&dbReady()){
    try{ dbPut('brainDump',rec).then(function(){ if(typeof renderDumpInbox==='function')renderDumpInbox(); }); }catch(e){}
  }
  if(typeof notify==='function')notify('أُلتقِطت فكرة سريعة — تجدها في «استجلاء الذهن»','inbox');
}

// ===== idle / power awareness: pause the timer when Noah steps away =====
var _idlePausedSession=false;
function onSystemIdle(){
  if(remindCfg().idlePause===false)return;
  if(typeof isRunning!=='undefined'&&isRunning&&typeof isBreak!=='undefined'&&!isBreak){
    if(typeof pauseTimer==='function'){ pauseTimer(); _idlePausedSession=true; }
  }
}
function onSystemActive(){
  if(_idlePausedSession){
    _idlePausedSession=false;
    if(typeof notify==='function')notify('أهلاً برجوعك 🤍 — أوقفت المؤقّت أثناء غيابك، اضغط ▶ لتُكمل','coffee');
  }
}

// ===== settings UI (rendered into #remind-ctrl on the settings page) =====
function renderRemindSettings(){
  var el=document.getElementById('remind-ctrl'); if(!el)return;
  if(!window.noahAPI){ el.innerHTML='<div class="setting-sub">التنبيهات الخلفية والاختصار العام متاحة في تطبيق سطح المكتب فقط.</div>'; return; }
  var s=remindCfg();
  el.innerHTML=
    '<label class="grad-row"><span>الاستمرار في الخلفية عند الإغلاق — تصلك التنبيهات دائماً</span><input type="checkbox" id="rm-bg" '+(s.bgReminders!==false?'checked':'')+' onchange="remindChange()"></label>'+
    '<label class="grad-row"><span>التشغيل تلقائياً عند بدء ويندوز</span><input type="checkbox" id="rm-auto" '+(s.autoLaunch?'checked':'')+' onchange="remindChange()"></label>'+
    '<label class="grad-row"><span>البدء مصغّراً في شريط المهام (مع التشغيل التلقائي)</span><input type="checkbox" id="rm-autohide" '+(s.autoLaunchHidden!==false?'checked':'')+' onchange="remindChange()"></label>'+
    '<label class="grad-row"><span>التقاط فكرة سريعة باختصار عام <b style="color:var(--accent-text)">Ctrl+Alt+N</b></span><input type="checkbox" id="rm-cap" '+(s.quickCapture!==false?'checked':'')+' onchange="remindChange()"></label>'+
    '<label class="grad-row"><span>إيقاف المؤقّت تلقائياً عند الابتعاد عن الجهاز</span><input type="checkbox" id="rm-idle" '+(s.idlePause!==false?'checked':'')+' onchange="remindChange()"></label>'+
    '<label class="grad-row"><span>تذكير مواعيد الترم — قبلها بيوم، وصبح يومها (والامتحانات قبلها بـ٣ أيام)</span><input type="checkbox" id="rm-dl" '+(s.dlRemind!==false?'checked':'')+' onchange="remindChange()"></label>'+
    '<div class="grad-row"><span>تجربة إشعار</span><button class="btn sm" onclick="testRemind()"><i data-lucide="bell"></i> اختبار</button></div>';
  if(typeof icons==='function')icons();
}
function remindChange(){
  var s=remindCfg();
  var bg=document.getElementById('rm-bg'); if(bg)s.bgReminders=!!bg.checked;
  var au=document.getElementById('rm-auto'); if(au)s.autoLaunch=!!au.checked;
  var ah=document.getElementById('rm-autohide'); if(ah)s.autoLaunchHidden=!!ah.checked;
  var cp=document.getElementById('rm-cap'); if(cp)s.quickCapture=!!cp.checked;
  var id=document.getElementById('rm-idle'); if(id)s.idlePause=!!id.checked;
  var dl=document.getElementById('rm-dl'); if(dl)s.dlRemind=!!dl.checked;
  if(typeof save==='function')save();
  applyRemindSettings();
}
function testRemind(){
  if(window.noahAPI&&window.noahAPI.notifyNow)window.noahAPI.notifyNow('تجربة إشعار 🔔','يعمل بنجاح — هكذا ستصلك تذكيرات الصلاة والواجبات.');
  else if(typeof notify==='function')notify('الإشعارات الخلفية متاحة في تطبيق سطح المكتب','info');
}

// ===== one-time wiring (called from bootstrap after hydrate) =====
function initRemind(){
  if(!window.noahAPI)return;
  try{ if(window.noahAPI.onQuickCapture)window.noahAPI.onQuickCapture(quickCaptureAdd); }catch(e){}
  try{ if(window.noahAPI.onReminderNav)window.noahAPI.onReminderNav(function(nav){ if(typeof navTo==='function'&&nav)navTo(nav); }); }catch(e){}
  try{ if(window.noahAPI.onSystemIdle)window.noahAPI.onSystemIdle(onSystemIdle); }catch(e){}
  try{ if(window.noahAPI.onSystemActive)window.noahAPI.onSystemActive(onSystemActive); }catch(e){}
  applyRemindSettings();
}
