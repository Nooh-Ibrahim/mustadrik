// palette.js — لوحة أوامر Ctrl+K + بحث شامل (Command Palette + Global Search)
// module — classic script (globals shared, no ES modules). CSP-safe (pure DOM).

var paletteOpen=false, palSelected=0, palResults=[];
var PAL_COMMANDS=[
  {label:'الرئيسية',icon:'home',kind:'صفحة',run:function(){navTo('home');}},
  {label:'الجِدّ (المؤقّت)',icon:'timer',kind:'صفحة',run:function(){navTo('pomodoro');}},
  {label:'ديوان الواجبات',icon:'check-square',kind:'صفحة',run:function(){navTo('tasks');}},
  {label:'استجلاء الذهن',icon:'inbox',kind:'صفحة',run:function(){navTo('braindump');}},
  {label:'مسار العلم',icon:'bar-chart-3',kind:'صفحة',run:function(){navTo('progress');}},
  {label:'الرياضة',icon:'dumbbell',kind:'صفحة',run:function(){navTo('sport');}},
  {label:'الميزان',icon:'line-chart',kind:'صفحة',run:function(){navTo('stats');}},
  {label:'المقاصد (هدف الوقت)',icon:'flag',kind:'مؤشّر',run:function(){navTo('home');setTimeout(function(){var m=document.getElementById('maqasid-card');if(m&&m.scrollIntoView)m.scrollIntoView({behavior:'smooth',block:'center'});},140);}},
  {label:'الصلاة',icon:'check-circle-2',kind:'صفحة',run:function(){navTo('praytrack');}},
  {label:'القرآن',icon:'book-open',kind:'صفحة',run:function(){navTo('quran');}},
  {label:'قيام الليل',icon:'moon',kind:'صفحة',run:function(){navTo('qiyam');}},
  {label:'الأذكار',icon:'heart',kind:'صفحة',run:function(){navTo('habits');}},
  {label:'المداومة (العادات والأذكار)',icon:'repeat',kind:'صفحة',run:function(){navTo('habits');}},
  {label:'الضبط',icon:'settings-2',kind:'صفحة',run:function(){navTo('settings');}},
  {label:'سَنَد — دعم نفسيّ (سكينة/النهوض/الطُّهر)',icon:'heart-handshake',kind:'إجراء',run:function(){if(typeof openSanad==='function')openSanad();else if(typeof openSakina==='function')openSakina();}},
  {label:'لحظة سكينة (تهدئة)',icon:'heart-handshake',kind:'إجراء',run:function(){if(typeof openSakina==='function')openSakina();}},
  {label:'أشعر برغبة — تدخّل سريع',icon:'life-buoy',kind:'إجراء',run:function(){if(typeof feelUrge==='function')feelUrge();}},
  {label:'النهوض — أعِد بناء ثقتي',icon:'sunrise',kind:'إجراء',run:function(){if(typeof startReframe==='function')startReframe();}},
  {label:'ابدأ جلسة جِدّ الآن',icon:'play',kind:'إجراء',run:function(){if(typeof quickStartSession==='function')quickStartSession();else navTo('pomodoro');}},
  {label:'واجب جديد',icon:'plus',kind:'إجراء',run:function(){navTo('tasks');setTimeout(function(){var i=document.getElementById('task-input');if(i)i.focus();},110);}},
  {label:'التقاط فكرة (استجلاء)',icon:'inbox',kind:'إجراء',run:function(){navTo('braindump');setTimeout(function(){var i=document.getElementById('dump-input');if(i)i.focus();},110);}},
  {label:'سجّل نيّة اليوم',icon:'sunrise',kind:'إجراء',run:function(){if(typeof showNiyyahModal==='function')showNiyyahModal();}},
  {label:'تصدير تقرير PDF',icon:'printer',kind:'إجراء',run:function(){if(typeof exportReport==='function')exportReport();}},
  {label:'تبديل الوضع الليلي',icon:'moon',kind:'إجراء',run:function(){toggleDark();}},
  {label:'تصدير نسخة (JSON)',icon:'download',kind:'إجراء',run:function(){if(typeof exportData==='function')exportData();}}
];
function togglePalette(){ paletteOpen?closePalette():openPalette(); }
// ذاكرة مؤقّتة للمستندات غير المتزامنة (ملاحظات + استجلاء الذهن) — تُحدَّث عند فتح اللوحة
var palDocsCache=[];
function prefetchPalDocs(){
  if(typeof dbGetAll!=='function'||typeof dbReady!=='function'||!dbReady())return;
  var me=curProfileId(); var out=[];
  // (أُزيلت الملاحظات من البحث — كانت توصل لصفحة «دراسة متقدمة» المحذوفة)
  dbGetAll('brainDump').then(function(rows){
    (rows||[]).forEach(function(d){ if(d&&d.profileId===me&&!d.processed&&d.type!=='audio')out.push({label:d.text,sub:'استجلاء',icon:'inbox',run:function(){navTo('braindump');}}); });
    palDocsCache=out;
    if(paletteOpen){ var inp=document.getElementById('palette-input'); paletteSearch(inp?inp.value:''); }  // أعِد البحث بعد وصول البيانات
  }).catch(function(){});
}
function openPalette(){
  var ov=document.getElementById('palette-overlay'); if(!ov)return;
  paletteOpen=true; ov.classList.add('show');
  prefetchPalDocs();   // يجلب الملاحظات والاستجلاء بالخلفية ثم يُحدّث النتائج
  var inp=document.getElementById('palette-input'); if(inp){ inp.value=''; }
  paletteSearch('');
  setTimeout(function(){ if(inp)inp.focus(); },30);
}
function closePalette(){ var ov=document.getElementById('palette-overlay'); if(ov)ov.classList.remove('show'); paletteOpen=false; }
// ---- global search across commands + S collections ----
function globalSearch(q){
  q=(q||'').trim().toLowerCase();
  var res=[];
  function hit(s){ return q&&String(s||'').toLowerCase().indexOf(q)>=0; }
  // commands (always shown; filtered when typing)
  PAL_COMMANDS.forEach(function(c){ if(!q||c.label.toLowerCase().indexOf(q)>=0)res.push({label:c.label,sub:c.kind,icon:c.icon,run:c.run}); });
  if(q){
    // tasks
    (S.tasks||[]).forEach(function(t){
      if(hit(t.text)||hit(t.category)){ res.push({label:t.text,sub:'مهمة'+(t.done?' · منجزة':''),icon:'check-square',run:function(){ if(typeof setTaskSearch==='function'){taskSearch=t.text;} navTo('tasks'); setTimeout(function(){var s=document.getElementById('task-search'); if(s){s.value=t.text; if(typeof setTaskSearch==='function')setTaskSearch(t.text);}},120); }}); }
    });
    // habits
    (S.habits||[]).forEach(function(h){ if(hit(h.name))res.push({label:h.name,sub:'عادة',icon:'repeat',run:function(){navTo('habits');}}); });
    // adhkar
    (S.adhkar||[]).forEach(function(a){ if(hit(a.name))res.push({label:a.name,sub:'ذِكر',icon:'heart',run:function(){navTo('habits');}}); });
    // subjects
    Object.keys(S.subjects||{}).forEach(function(k){ var su=S.subjects[k]; if(hit(su.label))res.push({label:su.label,sub:'مادة',icon:'bar-chart-3',run:function(){navTo('progress');}}); });
    // ملاحظات + استجلاء الذهن (من الذاكرة المؤقتة غير المتزامنة)
    palDocsCache.forEach(function(d){ if(hit(d.haystack||d.label))res.push(d); });
  }
  return res.slice(0,40);
}
function paletteSearch(q){
  palResults=globalSearch(q); palSelected=0; renderPaletteResults();
}
function renderPaletteResults(){
  var el=document.getElementById('palette-results'); if(!el)return;
  if(!palResults.length){ el.innerHTML='<div class="palette-empty"><i data-lucide="search-x"></i> لا نتائج</div>'; icons(); return; }
  el.innerHTML=palResults.map(function(r,i){
    return '<div class="palette-item'+(i===palSelected?' sel':'')+'" data-i="'+i+'" onmouseenter="palHover('+i+')" onclick="runPaletteResult('+i+')">'+
      '<span class="pi-icon"><i data-lucide="'+(r.icon||'arrow-left')+'"></i></span>'+
      '<span class="pi-label">'+esc(r.label)+'</span>'+
      '<span class="pi-kind">'+esc(r.sub||'')+'</span></div>';
  }).join('');
  icons();
  var sel=el.querySelector('.palette-item.sel'); if(sel&&sel.scrollIntoView)sel.scrollIntoView({block:'nearest'});
}
function palHover(i){ palSelected=i; var el=document.getElementById('palette-results'); if(!el)return; el.querySelectorAll('.palette-item').forEach(function(x){x.classList.toggle('sel',parseInt(x.getAttribute('data-i'))===i);}); }
function runPaletteResult(i){ var r=palResults[i]; if(!r)return; closePalette(); try{ r.run(); }catch(e){} }
function paletteKey(e){
  if(e.key==='ArrowDown'){ e.preventDefault(); palSelected=Math.min(palResults.length-1,palSelected+1); renderPaletteResults(); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); palSelected=Math.max(0,palSelected-1); renderPaletteResults(); }
  else if(e.key==='Enter'){ e.preventDefault(); runPaletteResult(palSelected); }
  else if(e.key==='Escape'){ e.preventDefault(); closePalette(); }
}
