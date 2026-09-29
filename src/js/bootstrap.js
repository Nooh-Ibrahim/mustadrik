// bootstrap.js — initV10 + boot sequence (load/intervals) — LOAD LAST
// module 10/10 of the former renderer.js — classic script (globals shared, no ES modules)


function initV10(){
  document.title=BASE_TITLE;
  if(typeof initTitlebar==='function')initTitlebar();      // frameless custom title-bar (controls + hamburger)
  if(typeof renderTopNav==='function')renderTopNav();   // paint top nav immediately; refreshAll re-renders post-hydrate
  if(typeof renderSa3iSettings==='function')renderSa3iSettings();  // populate السعي duration inputs from config
  // restore task UI state
  const srch=document.getElementById('task-search'); if(srch)srch.value=taskSearch||'';
  syncSortToggle();
  // global keyboard shortcuts
  document.addEventListener('keydown',onShortcut);
  // stop title flashing the moment the user looks at the window
  window.addEventListener('focus',stopTitleFlash);
  // نظام البطاقة الموحّد (ست نقط + طيّ على كل بطاقة، في كل صفحة)
  if(typeof initCardSystem==='function'){ try{initCardSystem();}catch(e){} }
  // تحديث تلقائي: عند اكتمال تنزيل نسخة جديدة تظهر شارة خضراء في شريط العنوان — نقرة = تثبيت وإعادة تشغيل
  try{
    if(window.noahAPI&&noahAPI.updates&&noahAPI.updates.onReady){
      noahAPI.updates.onReady(function(v){
        if(document.getElementById('update-chip'))return;
        var tb=document.querySelector('.tb-left'); if(!tb)return;
        var b=document.createElement('button'); b.id='update-chip'; b.className='update-chip';
        b.innerHTML='<i data-lucide="download"></i> تحديث '+esc(v||'')+' جاهز';
        b.title='نسخة جديدة جاهزة — اضغط للتثبيت وإعادة التشغيل';
        b.onclick=function(){ noahAPI.updates.restart(); };
        tb.appendChild(b); icons();
        notify('نسخة جديدة جاهزة — اضغط الشارة الخضراء بالأعلى للتثبيت','download');
      });
    }
  }catch(e){}
}

// ---- async boot: open IndexedDB → run migrations → hydrate S → render → schedule ----
(function boot(){
  function finish(){
    initV10();
    var hydrate = (typeof loadAsync==='function') ? loadAsync() : Promise.resolve(load());
    Promise.resolve(hydrate).then(function(){
      updateBackupStatus();
      try{ if(typeof initRemind==='function')initRemind(); }catch(e){}        // wire tray/hotkey/idle/quick-capture once S is loaded
      try{ if(typeof initWidget==='function')initWidget(); }catch(e){}        // wire timer widget (taskbar/tray/HUD) — opt-in, off by default
      try{ if(typeof checkTaskReminders==='function')checkTaskReminders(); }catch(e){}  // surface today's agenda on open
      try{ if(typeof autoSyncPullCheck==='function')autoSyncPullCheck(); }catch(e){}    // ⑧ اسحب أحدث نسخة من مجلد المزامنة عند الفتح
    });
    setInterval(save,30000);
    // periodic light refresh — but never while the user is typing (no focus loss)
    setInterval(function(){
      try{ if(typeof checkPrayerReminders==='function')checkPrayerReminders(); }catch(e){}   // −10min prayer reminders + adhan (independent of typing)
      try{ if(typeof checkTaskReminders==='function')checkTaskReminders(); }catch(e){}        // واجبات اليوم/المتأخرة + تنبيه «لم تذاكر» (مستقلّ عن الكتابة)
      try{ if(typeof checkMedReminder==='function')checkMedReminder(); }catch(e){}            // تذكير الدواء (خاص، إن فُعّل)
      try{ if(typeof autoSyncMaybePush==='function')autoSyncMaybePush(); }catch(e){}          // ⑧ ادفع أحدث نسخة لمجلد المزامنة عند التغيّر
      try{ if(typeof updatePrayerStatusBar==='function')updatePrayerStatusBar(); }catch(e){}  // شريط الصلاة السفلي
      try{ if(typeof autoAdhkarReset==='function')autoAdhkarReset(); }catch(e){}              // تصفير الأذكار تلقائياً عند منتصف الليل (بلا فتح الصفحة)
      if(isTyping())return;
      try{ var pp=document.getElementById('page-pomodoro'); if(pp&&pp.classList.contains('active')&&typeof renderSa3iEta==='function')renderSa3iEta(); }catch(e){}  // «ينتهي الكل ~» يزحف مع الساعة
      try{renderTodayPrayers();renderHome();renderTasks();}catch(e){}
    },60000);
  }
  if(typeof dmBootstrap==='function'){
    dmBootstrap().then(finish).catch(function(e){
      console.error('[Mustadrik] DB init failed; falling back to localStorage:',e);
      finish();
    });
  }else{
    finish(); // db.js/migrate.js unavailable → pure localStorage mode
  }
})();
