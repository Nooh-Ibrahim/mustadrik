// shell.js — navigation, theme, settings, confirm dialog, shortcuts, desktop notifications
// module 3/10 of the former renderer.js — classic script (globals shared, no ES modules)

function refreshAll(){
  if(typeof renderTopNav==='function')renderTopNav();
  // المساقات أولاً: القوائم المنسدلة وتبويبات الفلترة تُبنى من الحالة (مش مكتوبة بالـHTML)
  if(typeof syncCourseSelects==='function'){ try{syncCourseSelects();renderCourseTabs();}catch(e){} }
  updateDisplay();updateSessionCount();updateStats();renderProgress();renderTasks();renderHabits();
  renderHeatmap();renderWeekChart();renderCalendar();updateGoalBar();
  renderPrayerTable();renderTodayPrayers();renderHome();showQuote();
  updateWeekGoalBar();applyBgColor();renderSubjChart();renderAchievements();renderAnalytics();renderPrayerStats();
  if(typeof renderDailyLight==='function')renderDailyLight();   // verse + hadith of the day (home widget)
  if(typeof renderCorrelation==='function')renderCorrelation();   // correlation analysis (stats page)
  syncQuickToggles();renderBellDot();   // المرحلة ١: مزامنة أزرار التفعيل السريع + شارة الجرس
  if(typeof syncCardChrome==='function'){ try{syncCardChrome();}catch(e){} }   // ست نقط + طيّ على كل بطاقة
  icons();
  // NOTE: prayer auto-fetch is intentionally NOT here — it must never be triggered by a theme
  //       change or a generic re-render. It runs once at boot (applyState) and on explicit action.
}
var currentPage='home';   // «المِنصّة» اندمجت في الرئيسية — لوحة واحدة غنية هي نقطة الإقلاع
// يُمرّر التركيز لحقل إضافة (من أزرار «حالة الفراغ») — يبرزه بلمسة ويضع المؤشّر فيه
function focusAdd(inputId){
  var inp=document.getElementById(inputId); if(!inp)return;
  try{ inp.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){}
  setTimeout(function(){ try{ inp.focus(); inp.classList.add('focus-flash'); setTimeout(function(){inp.classList.remove('focus-flash');},900); }catch(e){} },180);
}
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  var pg=document.getElementById('page-'+id); if(!pg)return;
  pg.classList.add('active');
  currentPage=id; markActiveNav();
  if(typeof applyPageCols==='function')applyPageCols();                   // أعمدة هذه الصفحة (مستقلّة)
  if(typeof renderOrganizePanel==='function')renderOrganizePanel();
  var mi=document.querySelector('.main-inner'); if(mi)mi.scrollTop=0;
  if(id==='stats'){
    // كل عرض محصّن وحده — خطأ واحد لا يُسقط بقية الإحصائيات (كان سبباً في «المختفي»)
    [updateStats,renderWeekChart,renderCalendar,renderSubjChart,renderAchievements,renderAnalytics,renderPrayerStats,
     (typeof renderCorrelation==='function'?renderCorrelation:null),
     (typeof renderDeepAnalysis==='function'?renderDeepAnalysis:null),
     (typeof renderWorshipStreaks==='function'?renderWorshipStreaks:null),
     (typeof renderSportStats==='function'?renderSportStats:null),
     (typeof renderPeriodInsight==='function'?renderPeriodInsight:null),
     (typeof renderStatsCalendars==='function'?renderStatsCalendars:null)
    ].forEach(function(f){ if(f){try{f();}catch(e){console.warn('[الميزان] render skip:',e&&e.message);}} });
    if(typeof buildStatsSections==='function'){ try{buildStatsSections();}catch(e){} }   // طيّ/ترتيب أقسام الميزان
  }
  if(id==='sport'&&typeof renderSport==='function')renderSport();
  if(id==='progress'){renderHeatmap();if(typeof renderSrsPanel==='function')renderSrsPanel();if(typeof renderProgress==='function')renderProgress();}
  if(id==='home')renderHome();
  if(id==='praytrack'){renderPrayerTrack();if(typeof renderQadaLife==='function')renderQadaLife();}
  if(id==='settings')renderSettingsPage();
  if(id==='pomodoro'){renderSa3iLog();if(typeof renderSa3iTasks==='function')renderSa3iTasks();if(typeof renderSa3iSettings==='function')renderSa3iSettings();if(typeof renderDayPlan==='function')renderDayPlan();if(typeof renderMaqasid==='function')renderMaqasid();if(typeof restorePomoSubject==='function')restorePomoSubject();}
  if(id==='recovery'&&typeof renderRecovery==='function')renderRecovery();
  if(id==='xp'){ if(typeof renderXP==='function')renderXP(); if(typeof renderRewards==='function')renderRewards(); }   // رحلة السعي + بنك المكافآت
  if(id==='braindump'&&typeof renderDumpInbox==='function')renderDumpInbox();
  if(id==='quran'&&typeof renderQuran==='function')renderQuran();
  if(id==='qiyam'&&typeof renderQiyam==='function')renderQiyam();
  if(id==='habits')renderHabits();   // يعرض العادات + الأذكار (مدمجتان)
  bumpUsage(id);                                         // ② عدّاد استخدام محلّي خاصّ (تعلُّم الميزات المستخدَمة فعلاً)
  if(typeof onPageShown==='function')onPageShown(id);   // المِنصّة: حدّث الشريط العلوي/القسم
  icons();
}

// ② عدّادات استخدام محلّية خاصة (بلا خادم) — لمعرفة الصفحات/الميزات المستخدَمة فعلاً، فتغذّي «جولة التقليم» لاحقاً.
// تُخزَّن في S.settings.usage{pageId:{n,last}}؛ الحفظ مكبوح (مرّة/٤٥ث كحدّ أقصى) فلا يثقل التنقّل.
var _usageSaveAt=0;
function bumpUsage(id){
  if(!id||id==='hub')return;
  if(!S.settings)S.settings={};
  if(!S.settings.usage)S.settings.usage={};
  var u=S.settings.usage[id]||{n:0,last:0};
  u.n++; u.last=Date.now(); S.settings.usage[id]=u;
  var now=Date.now();
  if(now-_usageSaveAt>45000){ _usageSaveAt=now; if(typeof save==='function')save(); }
}
// تقرير مرتّب (الأكثر→الأقل استخداماً) — يُستدعى من الإعدادات لاحقاً أو من وحدة التحكّم؛ يكشف المهمل لتقليمه.
function usageReport(){
  var u=(S.settings&&S.settings.usage)||{};
  return Object.keys(u).map(function(k){ return {page:k,n:u[k].n||0,last:u[k].last||0}; })
    .sort(function(a,b){ return b.n-a.n; });
}

// ===== التنقّل: تمييز الزر الفعّال (يُعيد استخدامه «الشريط العلوي» في المِنصّة) =====
// (أُزيل الشريط الجانبي القديم نهائياً — التنقّل صار عبر المِنصّة + الشريط العلوي في hub.js)
function markActiveNav(){
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('active');});
  var b=document.querySelector('.nav-btn[data-page="'+currentPage+'"]'); if(b)b.classList.add('active');
}

// Theme
function renderThemeDots(){
  var el=document.getElementById('theme-dots'); if(!el)return;   // sidebar dots removed; settings page has its own
  el.innerHTML=THEMES.map(function(t){
    return '<div class="tdot'+(S.theme===t.id?' sel':'')+'" style="background:'+t.c+'" onclick="setTheme(\''+t.id+'\')" title="ثيم"></div>';
  }).join('');
}
function setTheme(id){
  S.theme=id;
  document.body.className=id;if(S.dark)document.body.classList.add('dark');
  renderThemeDots();save();refreshAll();
}
function toggleDark(){S.dark=!S.dark;document.body.classList.toggle('dark',S.dark);updateDarkBtn();applyGradient();save();}
function updateDarkBtn(){
  var b=document.getElementById('dark-btn');                         // legacy sidebar button (now removed) — guard null
  if(b)b.innerHTML=S.dark?'<i data-lucide="sun"></i> وضع نهاري':'<i data-lucide="moon"></i> وضع ليلي';
  var sb=document.getElementById('sett-dark-btn');                   // settings page button (the only place now)
  if(sb)sb.innerHTML=S.dark?'<i data-lucide="sun"></i> تعطيل':'<i data-lucide="moon"></i> تفعيل';
  icons();
}
// progressive disclosure for add-bars (reduces choices shown at once)
function toggleAddOptions(panelId,btnId){
  var p=document.getElementById(panelId);var b=document.getElementById(btnId);
  if(!p)return;var open=p.classList.toggle('open');
  if(b)b.classList.toggle('active',open);
  icons();
}

// ===== SETTINGS =====
var BG_COLORS=[
  {id:'bg-default',label:'افتراضي',light:'#f6f4ef',dark:'#15130f'},
  {id:'bg-warm',label:'دافئ',light:'#fdf8f3',dark:'#1a1410'},
  {id:'bg-cool',label:'بارد',light:'#f3f7fd',dark:'#101520'},
  {id:'bg-green',label:'أخضر',light:'#f3fdf6',dark:'#0e1a12'},
  {id:'bg-purple',label:'بنفسجي',light:'#f8f3fd',dark:'#150e1a'}
];
function renderSettingsPage(){
  // sync fields
  var city=document.getElementById('sett-city');var country=document.getElementById('sett-country');var method=document.getElementById('sett-method');
  if(city)city.value=(S.settings&&S.settings.city)||'';
  if(country)country.value=(S.settings&&S.settings.country)||'';
  if(method){ var mv=(S.settings&&S.settings.method)||DEFAULT_PRAYER_METHOD; if(!method.options.length||method.dataset.filled!=='1'){ method.innerHTML=prayerMethodOptions(mv); method.dataset.filled='1'; } method.value=mv; }
  // last fetch label
  var lf=document.getElementById('sett-last-fetch');
  if(lf)lf.textContent=S.settings&&S.settings.lastFetch?'آخر جلب: '+S.settings.lastFetch:'لم يتم الجلب بعد';
  // theme dots clone
  var td=document.getElementById('settings-theme-dots');
  if(td)td.innerHTML=THEMES.map(function(t){return '<div class="tdot'+(S.theme===t.id?' sel':'')+'" style="background:'+t.c+'" onclick="setTheme(\''+t.id+'\')" title="'+t.id+'"></div>';}).join('');
  var ca=document.getElementById('custom-accent'); if(ca&&S.settings&&S.settings.customAccent)ca.value=S.settings.customAccent;
  // dark btn
  var db=document.getElementById('sett-dark-btn');
  if(db)db.innerHTML=S.dark?'<i data-lucide="sun"></i> تعطيل':'<i data-lucide="moon"></i> تفعيل';
  var rtb=document.getElementById('recovery-toggle-btn'); if(rtb)rtb.textContent=(S.recovery&&S.recovery.enabled)?'تعطيل':'تفعيل';
  if(typeof renderFeatureToggles==='function')renderFeatureToggles();
  var pub=document.getElementById('proui-btn'); if(pub)pub.textContent=(S.settings&&S.settings.proUI)?'تعطيل':'تفعيل';
  var rmb=document.getElementById('reduce-motion-btn'); if(rmb)rmb.textContent=(S.settings&&S.settings.reduceMotion)?'تعطيل':'تفعيل';
  var cmb=document.getElementById('calm-btn'); if(cmb)cmb.textContent=(S.settings&&S.settings.calm)?'تعطيل':'تفعيل';
  // templates gallery + font scale + exam countdown fields
  if(typeof renderTemplates==='function')renderTemplates();
  if(typeof renderFontScaleCtrl==='function')renderFontScaleCtrl();
  if(typeof renderHeadFontCtrl==='function')renderHeadFontCtrl();
  // الفصل الدراسي (حلّ محلّ حقول امتحان الثانوية المفردة)
  var _t=(typeof termState==='function')?termState():(S.term||{});
  var tn=document.getElementById('sett-term-name'); if(tn)tn.value=_t.name||'';
  var ts=document.getElementById('sett-term-start'); if(ts)ts.value=_t.start||'';
  var te=document.getElementById('sett-term-end'); if(te)te.value=_t.end||'';
  if(typeof syncLightLoadBtn==='function')syncLightLoadBtn();
  // bg swatches
  var bs=document.getElementById('bg-swatches');
  if(bs)bs.innerHTML=BG_COLORS.map(function(b){
    var cur=(S.settings&&S.settings.bgId)===b.id;
    return '<div class="color-swatch'+(cur?' sel':'')+'" style="background:'+(S.dark?b.dark:b.light)+';border:2px solid var(--border2)" title="'+b.label+'" onclick="setBgColor(\''+b.id+'\',\''+b.light+'\',\''+b.dark+'\')"></div>';
  }).join('');
  // auto-fetch check
  var badge=document.getElementById('fetch-status-badge');
  if(badge){
    var ok=S.settings&&S.settings.lastFetch;
    badge.className='fetch-status '+(ok?'fetch-ok':'fetch-idle');
    badge.textContent=ok?'تم الجلب ✓':'لم يُجلب';
  }
  // gradient controls (target / colors / angle / intensity / animated)
  var gc=document.getElementById('gradient-ctrl');
  if(gc){
    var g=gradientCfg();
    var tgt=g.target||'bg';
    var tgtBtns=[['bg','الخلفية'],['cards','البطاقات'],['both','كلاهما']].map(function(o){
      return '<button class="seg-btn'+(tgt===o[0]?' active':'')+'" onclick="setGradient(\'target\',\''+o[0]+'\');renderSettingsPage()">'+o[1]+'</button>';
    }).join('');
    gc.innerHTML=
      '<label class="grad-row"><span>تفعيل التدرّج</span><input type="checkbox" '+(g.on?'checked':'')+' onchange="toggleGradient()"></label>'+
      '<div class="grad-row"><span>المكان</span><div class="seg-ctrl">'+tgtBtns+'</div></div>'+
      '<div class="grad-row"><span>اللون الأول</span><input type="color" value="'+(g.c1||'#5750d8')+'" oninput="setGradient(\'c1\',this.value)"></div>'+
      '<label class="grad-row"><span>استخدام لونين</span><input type="checkbox" '+(g.both?'checked':'')+' onchange="setGradient(\'both\',this.checked);renderSettingsPage()"></label>'+
      (g.both?'<div class="grad-row"><span>اللون الثاني</span><input type="color" value="'+(g.c2||'#0d9488')+'" oninput="setGradient(\'c2\',this.value)"></div>':'')+
      '<div class="grad-row"><span>الزاوية <b>'+(g.angle!=null?g.angle:135)+'°</b></span><input type="range" min="0" max="360" step="5" value="'+(g.angle!=null?g.angle:135)+'" oninput="setGradient(\'angle\',parseInt(this.value));var bb=this.parentNode.querySelector(\'b\');if(bb)bb.textContent=this.value+\'°\'"></div>'+
      '<div class="grad-row"><span>الشدّة</span><input type="range" min="0" max="0.6" step="0.02" value="'+(g.intensity!=null?g.intensity:0.16)+'" oninput="setGradient(\'intensity\',parseFloat(this.value))"></div>'+
      '<label class="grad-row"><span>تدرّج متحرك (بطيء)</span><input type="checkbox" '+(g.animate?'checked':'')+' onchange="setGradient(\'animate\',this.checked)"></label>';
  }
  // app logo control
  var lc=document.getElementById('logo-ctrl');
  if(lc){
    var has=!!(S.settings&&S.settings.logoSet);
    lc.innerHTML='<div class="logo-ctrl-row">'+
      (has?'<span class="logo-prev" id="logo-prev"></span>':'<span class="logo-prev logo-prev-empty" id="logo-prev"><i data-lucide="image"></i></span>')+
      '<label class="btn sm" style="cursor:pointer"><i data-lucide="upload"></i> رفع شعار<input type="file" accept="image/*" onchange="uploadLogo(event)" style="display:none"></label>'+
      (has?'<button class="btn sm dan-outline" onclick="removeLogo()"><i data-lucide="trash-2"></i> إزالة</button>':'')+
      '</div>';
    if(has)applyLogo();   // paint the preview swatch
  }
  if(typeof renderWorshipSettings==='function')renderWorshipSettings();   // prayer reminder + adhan controls
  if(typeof renderRemindSettings==='function')renderRemindSettings();     // background reminders + tray + auto-launch + hotkey
  if(typeof renderWidgetSettings==='function')renderWidgetSettings();     // timer widget: taskbar/tray/mini-HUD (opt-in)
  if(typeof renderMedSettings==='function')renderMedSettings();           // متتبّع الدواء (خاص واختياري)
  if(typeof renderIconBank==='function')renderIconBank();                 // بنك الأيقونات (المخفية بزر X)
  if(typeof refreshProfiles==='function')refreshProfiles();               // profiles list (multi-profile)
  if(typeof renderSnapshots==='function')renderSnapshots();               // version-history snapshots
  if(typeof renderBackupFolder==='function')renderBackupFolder();         // custom backup folder (Drive-via-sync)
  if(typeof renderSyncSettings==='function')renderSyncSettings();         // ⑧ مفتاح المزامنة التلقائية الثنائية
  updateBackupStatus();
  icons();
}
function settChanged(){
  if(!S.settings)S.settings={};
  var city=document.getElementById('sett-city');var country=document.getElementById('sett-country');var method=document.getElementById('sett-method');
  if(city)S.settings.city=city.value.trim();
  if(country)S.settings.country=country.value.trim();
  if(method){ var nm=parseInt(method.value,10); if(nm!==S.settings.method){ S.settings.method=nm||DEFAULT_PRAYER_METHOD; S.settings.lastFetchAt=0; } }   // تغيير الطريقة = المواقيت الحالية لم تعد صالحة
  save();
}
// (حُذفت settExamChanged — حقول امتحان الثانوية المفردة اتشالت في 10.8.0؛
//  بديلها settTermChanged + قائمة S.deadlines في courses.js)
function setBgColor(id,light,dark){
  if(!S.settings)S.settings={};
  S.settings.bgId=id;S.settings.bgLight=light;S.settings.bgDark=dark;
  applyBgColor();save();renderSettingsPage();
}
function applyBgColor(){
  var bg=S.dark?(S.settings&&S.settings.bgDark):(S.settings&&S.settings.bgLight);
  document.body.style.setProperty('--bg',bg||'');
  applyGradient();
}
// ===== لون ثيم مخصّص (يصنعه المستخدم) — يتجاوز ألوان القالب =====
function applyCustomAccent(){
  var c=S.settings&&S.settings.customAccent, b=document.body;
  if(c){ b.style.setProperty('--accent',c); b.style.setProperty('--accent-text',c); b.style.setProperty('--accent-soft','color-mix(in srgb,'+c+' 14%, var(--surface))'); }
  else { b.style.removeProperty('--accent'); b.style.removeProperty('--accent-text'); b.style.removeProperty('--accent-soft'); }
}
function setCustomAccent(hex){ if(!S.settings)S.settings={}; S.settings.customAccent=hex; save(); applyCustomAccent(); }
function clearCustomAccent(){ if(!S.settings)S.settings={}; S.settings.customAccent=''; save(); applyCustomAccent(); notify('عُدنا لألوان الثيم','palette'); }
// الرصّ التلقائي للبطاقات (ملء الفراغات في الشبكة) — حرية: شغّال افتراضياً وقابل للإيقاف
// (حُذف toggleGridDense — كان ميتاً؛ زر الكثافة أُزيل، وصنف grid-dense يُطبَّق عند الإقلاع)
// ===== gradient effect (configurable: background / cards / both, angle, animated) =====
function gradientCfg(){
  if(!S.settings)S.settings={};
  if(!S.settings.gradient)S.settings.gradient={on:false,c1:'#5750d8',c2:'#0d9488',intensity:0.16,both:false,target:'bg',angle:135,animate:false};
  var g=S.settings.gradient;
  if(g.target==null)g.target='bg'; if(g.angle==null)g.angle=135; if(g.animate==null)g.animate=false;
  return g;
}
function hexToRgba(hex,a){
  hex=String(hex||'#000').replace('#','');
  if(hex.length===3)hex=hex.replace(/(.)/g,'$1$1');
  var r=parseInt(hex.slice(0,2),16)||0,g=parseInt(hex.slice(2,4),16)||0,b=parseInt(hex.slice(4,6),16)||0;
  return 'rgba('+r+','+g+','+b+','+(a!=null?a:0.16)+')';
}
function applyGradient(){
  var g=gradientCfg();
  var angle=(g.angle!=null?g.angle:135);
  var inten=(g.intensity!=null?g.intensity:0.16);
  var target=g.target||'bg';
  var c1=g.c1||'#5750d8', c2=g.both?(g.c2||'#0d9488'):c1;
  var b=document.body;
  // shared CSS vars used by card gradients (rgba carries the intensity as alpha)
  b.style.setProperty('--grad-angle',angle+'deg');
  b.style.setProperty('--grad-c1',hexToRgba(c1,inten));
  b.style.setProperty('--grad-c2',hexToRgba(c2,inten));
  // full-background layer
  var el=document.getElementById('app-gradient');
  var bgOn=g.on&&(target==='bg'||target==='both');
  if(el){
    if(bgOn){
      el.style.display='block';
      var stops=g.both ? (c1+' 0%, '+c2+' 45%, transparent 82%') : (c1+' 0%, transparent 72%');
      el.style.backgroundImage='linear-gradient('+angle+'deg, '+stops+')';   // backgroundImage (not shorthand) so animated background-size survives
      el.style.opacity=inten;
      el.classList.toggle('grad-animated',!!g.animate);
    }else{ el.style.display='none'; el.classList.remove('grad-animated'); }
  }
  // card tint layer
  var cardsOn=g.on&&(target==='cards'||target==='both');
  b.classList.toggle('grad-cards',!!cardsOn);
  b.classList.toggle('grad-two',!!(cardsOn&&g.both));
  b.classList.toggle('grad-animated',!!(g.animate&&(cardsOn||bgOn)));
}
function setGradient(field,val){ var g=gradientCfg(); g[field]=val; applyGradient(); save(); }
function toggleGradient(){ var g=gradientCfg(); g.on=!g.on; applyGradient(); save(); renderSettingsPage(); }

// ===== custom app logo (stored as a Blob in IndexedDB mediaBlobs) =====
function logoId(){ return 'applogo-'+curProfileId(); }
// شعار «مُستدرِك» الافتراضي = حرف الميم (لفّة) — يُحقَن إن لم يوجد شعار مخصّص
var BRAND_MEEM='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M23 16a7 7 0 1 0-7 7"/><path d="M16 21a5 5 0 1 0-5-5"/><path d="M23 16v8"/></svg>';
function applyLogo(){
  if(typeof mediaURL!=='function')return;
  mediaURL(logoId()).then(function(url){
    var tl=document.getElementById('tb-logo');
    var bi=document.querySelector('.brand-icon');
    var pv=document.getElementById('logo-prev');
    if(url){
      if(tl){tl.classList.add('has-img');tl.style.backgroundImage='url('+url+')';tl.innerHTML='';}
      if(bi){bi.classList.add('has-img');bi.style.backgroundImage='url('+url+')';bi.innerHTML='';}
      if(pv){pv.style.backgroundImage='url('+url+')';}
    }else{
      if(tl){tl.classList.remove('has-img');tl.style.backgroundImage='';if(!tl.querySelector('svg'))tl.innerHTML=BRAND_MEEM;}
      if(bi){bi.classList.remove('has-img');bi.style.backgroundImage='';if(!bi.querySelector('svg'))bi.innerHTML=BRAND_MEEM;}
    }
    icons();
  }).catch(function(){});
}
function uploadLogo(e){
  var f=e.target&&e.target.files&&e.target.files[0]; if(!f)return;
  if(typeof mediaPut!=='function'){ notify('غير متاح هنا','x-circle'); return; }
  mediaPut({id:logoId(),kind:'appLogo',profileId:curProfileId()},f).then(function(){
    if(!S.settings)S.settings={}; S.settings.logoSet=true; save(); applyLogo(); renderSettingsPage();
    notify('تم تعيين الشعار ✓','check-circle');
  }).catch(function(){ notify('تعذّر حفظ الشعار','x-circle'); });
}
function removeLogo(){
  if(typeof mediaDelete==='function'){ try{ mediaDelete(logoId()); }catch(e){} }
  if(!S.settings)S.settings={}; S.settings.logoSet=false; save(); applyLogo(); renderSettingsPage();
  notify('أُزيل الشعار','info');
}

// ===== frameless custom title-bar =====
function winAction(a){
  if(window.noahAPI&&window.noahAPI.win){ window.noahAPI.win.action(a); return; }
  // web fallback (no Electron): do what the browser allows
  if(a==='reload')location.reload();
  else if(a==='fullscreen'){ try{ if(document.fullscreenElement)document.exitFullscreen(); else document.documentElement.requestFullscreen(); }catch(e){} }
}
function updateMaxBtn(max){
  var b=document.getElementById('tb-max-btn'); if(!b)return;
  b.innerHTML='<i data-lucide="'+(max?'copy':'square')+'"></i>'; b.title=max?'استعادة':'تكبير'; icons();
}
function toggleAppMenu(e){ if(e){try{e.stopPropagation();}catch(_){}} var m=document.getElementById('app-menu'); if(m)m.classList.toggle('open'); }
function closeAppMenu(){ var m=document.getElementById('app-menu'); if(m)m.classList.remove('open'); }
function initTitlebar(){
  // hide OS-style window controls when not running inside Electron
  if(!(window.noahAPI&&window.noahAPI.win)){ var c=document.getElementById('tb-controls'); if(c)c.style.display='none'; }
  else if(window.noahAPI.win.onState){ window.noahAPI.win.onState(function(max){ updateMaxBtn(max); }); }
  // close the hamburger menu on any outside click
  document.addEventListener('click',function(ev){
    var m=document.getElementById('app-menu');
    if(m&&m.classList.contains('open')&&!(ev.target.closest&&(ev.target.closest('#app-menu')||ev.target.closest('.tb-menu-btn'))))m.classList.remove('open');
    var bp=document.getElementById('bell-panel');
    if(bp&&bp.classList.contains('open')&&!(ev.target.closest&&(ev.target.closest('#bell-panel')||ev.target.closest('#tb-bell'))))bp.classList.remove('open');
    var op=document.getElementById('organize-panel');
    if(op&&op.classList.contains('open')&&!(ev.target.closest&&(ev.target.closest('#organize-panel')||ev.target.closest('#tb-organize'))))op.classList.remove('open');
  });
}
// ============================================================
//  v10 ENHANCEMENTS  (notifications, data-safety, shortcuts,
//  analytics, confirm-dialog, drag&drop, search)
// ============================================================
const BASE_TITLE=APP_NAME;
let titleFlashInt=null, exportReminderShown=false, dragTaskId=null;

// ---- helpers ----
function isTyping(){
  const el=document.activeElement; if(!el)return false;
  const tag=(el.tagName||'').toLowerCase();
  return tag==='input'||tag==='textarea'||tag==='select'||el.isContentEditable;
}

// ===== KEYBOARD SHORTCUTS =====
function onShortcut(e){
  // Ctrl/⌘+K → command palette (works even while typing)
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'){ e.preventDefault(); if(typeof togglePalette==='function')togglePalette(); return; }
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.key==='Escape'){ if(typeof closePalette==='function')closePalette(); if(focusMode)toggleFocus(); closeBadgePopup(); closeConfirm(); var _ko=document.getElementById('kbd-overlay'); if(_ko)_ko.style.display='none'; return; }
  if(isTyping())return;
  if(e.key==='?'){ e.preventDefault(); toggleKbdOverlay(); return; }
  if(e.code==='Space'){ e.preventDefault(); if(isRunning)pauseTimer(); else startTimer(); return; }
  const k=e.key.toLowerCase();
  if(k==='f'){ e.preventDefault(); toggleFocus(); return; }
  if(k==='n'){ e.preventDefault(); navTo('tasks'); setTimeout(function(){var i=document.getElementById('task-input');if(i)i.focus();},90); return; }
  if(/^[1-9]$/.test(e.key)){ clickNav(parseInt(e.key)-1); return; }
  if(e.key==='0'){ clickNav(9); return; }
}
function clickNav(i){ const b=document.querySelectorAll('.nav-btn'); if(b[i])b[i].click(); }
// لوحة الاختصارات (Shift+?) — مرجع سريع دون كرت دائم يزحم الضبط
function toggleKbdOverlay(){
  var ov=document.getElementById('kbd-overlay');
  if(ov&&ov.style.display==='flex'){ ov.style.display='none'; return; }
  if(!ov){ ov=document.createElement('div'); ov.id='kbd-overlay'; ov.className='ritual-overlay';
    ov.onclick=function(e){if(e.target===ov)ov.style.display='none';}; document.body.appendChild(ov); }
  var rows=[
    ['Ctrl+K','لوحة الأوامر والبحث الشامل'],
    ['Space','تشغيل / إيقاف جلسة السعي'],
    ['F','وضع التركيز'],
    ['N','واجب جديد (ينقلك للديوان)'],
    ['1-9','التنقل بين الصفحات'],
    ['Esc','إغلاق أي نافذة / خروج من التركيز'],
    ['Shift+?','هذه اللوحة'],
    ['Ctrl+Alt+N','التقاط فكرة من أي مكان في ويندوز']
  ];
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header">'+
    '<div class="ritual-icon">⌨️</div><div class="ritual-title">اختصارات لوحة المفاتيح</div></div>'+
    '<div class="ritual-body"><div class="kbd-list">'+rows.map(function(r){
      return '<div class="kbd-row"><span>'+r[1]+'</span><kbd>'+r[0]+'</kbd></div>';
    }).join('')+'</div></div>'+
    '<div class="ritual-foot"><button class="btn ghost" onclick="toggleKbdOverlay()">إغلاق</button></div></div>';
}
// (navTo معرّفة في hub.js — تحدّد القسم ثم تعرض الصفحة)
// (حُذفت renderKbdGrid — كرت الاختصارات أُزيل من الواجهة منذ المرحلة ١)

// ===== DESKTOP NOTIFICATIONS + TITLE/TASKBAR FLASH =====
function requestNotifyPermission(){
  try{ if('Notification'in window&&Notification.permission==='default')Notification.requestPermission(); }catch(e){}
}
function notifyDesktop(title,body){
  // Desktop app: route the OS notification through the main process so it shows even when the
  // window is hidden in the tray (and only flashes once). Web build: fall back to web Notification.
  if(window.noahAPI&&window.noahAPI.notifyNow){
    try{ window.noahAPI.notifyNow(title,body); }catch(e){}   // main shows the toast + flashes the taskbar
  }else{
    try{
      if('Notification'in window&&Notification.permission==='granted'){ new Notification(title,{body:body}); }
      else if('Notification'in window&&Notification.permission!=='denied'){
        Notification.requestPermission().then(function(p){ if(p==='granted')new Notification(title,{body:body}); });
      }
    }catch(e){}
    if(window.noahAPI&&window.noahAPI.flashFrame)window.noahAPI.flashFrame(); // taskbar flash
  }
  flashTitle(title);
  notify(title,'bell'); // in-app toast as well
}
function flashTitle(msg){
  if(document.hasFocus())return;
  clearInterval(titleFlashInt); let on=false;
  titleFlashInt=setInterval(function(){ document.title=on?BASE_TITLE:('🔔 '+msg); on=!on; },1000);
}
function stopTitleFlash(){ clearInterval(titleFlashInt); titleFlashInt=null; document.title=BASE_TITLE; }

// ===== CUSTOM CONFIRM DIALOG =====
// opts: { confirmText, danger:true|false }  — danger=true → red (delete), false → accent (safe action)
let confirmCb=null;
function askConfirm(msg,onYes,opts){
  opts=opts||{};
  const confirmText=opts.confirmText||'تأكيد';
  const danger=opts.danger!==false; // default = destructive (red)
  confirmCb=onYes;
  let ov=document.getElementById('confirm-overlay');
  if(!ov){
    ov=document.createElement('div');ov.id='confirm-overlay';ov.className='confirm-overlay';
    ov.innerHTML='<div class="confirm-box"><div class="confirm-icon" id="confirm-icon"><i data-lucide="alert-triangle"></i></div>'+
      '<div class="confirm-msg" id="confirm-msg"></div>'+
      '<div class="confirm-actions"><button class="btn" onclick="closeConfirm()">إلغاء</button>'+
      '<button class="btn pri" id="confirm-yes" onclick="confirmYes()"></button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){ if(e.target===ov)closeConfirm(); });
  }
  document.getElementById('confirm-msg').textContent=msg;
  const yb=document.getElementById('confirm-yes');
  yb.textContent=confirmText;
  yb.style.background=danger?'var(--red)':'var(--accent)';
  yb.style.borderColor=danger?'var(--red)':'var(--accent)';
  const ic=document.getElementById('confirm-icon');
  if(ic){
    ic.style.background=danger?'var(--red-soft)':'var(--accent-soft)';
    ic.style.color=danger?'var(--red-text)':'var(--accent-text)';
    ic.innerHTML='<i data-lucide="'+(danger?'alert-triangle':'history')+'"></i>';
  }
  icons();
  requestAnimationFrame(function(){ ov.classList.add('show'); });
}
function confirmYes(){ const cb=confirmCb; closeConfirm(); if(cb)cb(); }
function closeConfirm(){ const ov=document.getElementById('confirm-overlay'); if(ov)ov.classList.remove('show'); confirmCb=null; }

// ============================================================
//  المرحلة ١: جرس الإشعارات + أزرار التفعيل السريع + نافذة إدخال احترافية
// ============================================================

// ===== (المهمة ١٣) جرس الإشعارات: سجل الصلوات الفائتة وغير المسجّلة =====
// يجمع الصلوات المعلّمة «فائتة» في المتتبّع + صلوات اليوم التي مرّ وقتها ولم تُسجَّل بعد.
function bellData(){
  var missed=[]; var pt=S.prayerTrack||{};
  Object.keys(pt).forEach(function(dk){ if(!pt[dk])return; PRAYER_KEYS.forEach(function(k){ if(pt[dk][k]&&pt[dk][k].status==='missed')missed.push({day:dk,name:PRAYER_AR[k]}); }); });
  var tp=(S.prayerWeek&&S.prayerWeek[DAYS[new Date().getDay()]])||{}, now=new Date(), tkey=todayKey(), unlogged=[];
  PRAYER_KEYS.forEach(function(k){ var v=tp[k]; if(!v||v.indexOf(':')<0)return; var p=v.split(':'); var t=new Date(); t.setHours(+p[0],+p[1],0,0); var st=(typeof getPT==='function')?getPT(tkey,k).status:'none'; if(t<now&&st==='none')unlogged.push(PRAYER_AR[k]); });
  return {missed:missed,unlogged:unlogged};
}
function renderBellDot(){
  var dot=document.getElementById('tb-bell-dot'); if(!dot)return;
  var d=bellData(); var n=d.missed.length+d.unlogged.length;
  if(n>0){ dot.style.display=''; dot.textContent=n>9?'9+':String(n); } else dot.style.display='none';
}
function renderBellPanel(){
  var el=document.getElementById('bell-panel'); if(!el)return;
  var d=bellData(); var html='<div class="bell-panel-title"><i data-lucide="bell"></i> الصلوات الفائتة وغير المسجّلة</div>';
  if(!d.missed.length&&!d.unlogged.length){
    html+='<div class="empty" style="padding:1.2rem"><i data-lucide="check-circle-2"></i><div>لا صلوات فائتة — أحسنت 🤍</div></div>';
  }else{
    d.missed.slice(0,40).forEach(function(m){ html+='<div class="bell-item missed"><i data-lucide="alert-octagon"></i><div class="bi-main"><div class="bi-t">'+m.name+' — فائتة</div><div class="bi-s">'+m.day+' · تنتظر القضاء</div></div></div>'; });
    d.unlogged.forEach(function(nm){ html+='<div class="bell-item warn"><i data-lucide="bell-ring"></i><div class="bi-main"><div class="bi-t">'+nm+' — لم تُسجَّل</div><div class="bi-s">مرّ وقتها اليوم</div></div></div>'; });
    html+='<div style="text-align:center;margin-top:.6rem"><button class="btn sm pri" onclick="closeBellPanel();navTo(\'praytrack\')"><i data-lucide="arrow-left"></i> فتح المتتبّع</button></div>';
  }
  el.innerHTML=html; icons();
}
function toggleBellPanel(e){ if(e){try{e.stopPropagation();}catch(_){}} var el=document.getElementById('bell-panel'); if(!el)return; var open=el.classList.toggle('open'); if(open)renderBellPanel(); }
function closeBellPanel(){ var el=document.getElementById('bell-panel'); if(el)el.classList.remove('open'); }

// ===== (المهمة ٢٢) أزرار التفعيل السريع: واجهة Pro + رفيق الطُّهر =====
function syncQuickToggles(){
  var p=document.getElementById('tb-quick-pro'); if(p)p.classList.toggle('on',!!(S.settings&&S.settings.proUI));
  var r=document.getElementById('tb-quick-recovery'); if(r)r.classList.toggle('on',!!(S.recovery&&S.recovery.enabled));
}
// (حُذف quickTogglePro/quickToggleRecovery — كانا ميتين؛ أُزيل زرّا tb-quick من الشريط)

// ===== (المهمة ١٢) نافذة إدخال احترافية — بديل prompt البدائي (تاريخ/أرقام/نصوص) =====
var _ioCb=null;
function openInputDialog(opts){
  opts=opts||{}; _ioCb=opts.onOk||null;
  var ov=document.getElementById('io-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='io-overlay'; ov.className='io-overlay'; document.body.appendChild(ov);
    ov.addEventListener('click',function(e){ if(e.target===ov)closeInputDialog(); }); }
  ov.innerHTML='<div class="io-box"><div class="io-title">'+esc(opts.title||'')+'</div>'+
    (opts.sub?('<div class="io-sub">'+esc(opts.sub)+'</div>'):'')+
    '<input id="io-input" type="'+(opts.type||'text')+'" value="'+esc(opts.value!=null?String(opts.value):'')+'" placeholder="'+esc(opts.placeholder||'')+'">'+
    '<div class="io-actions"><button class="btn" onclick="closeInputDialog()">إلغاء</button>'+
    '<button class="btn pri" onclick="confirmInputDialog()"><i data-lucide="check"></i> '+esc(opts.confirmText||'حفظ')+'</button></div></div>';
  icons();
  requestAnimationFrame(function(){ ov.classList.add('show'); var i=document.getElementById('io-input'); if(i){ i.focus(); try{i.select();}catch(_){ } i.onkeydown=function(e){ if(e.key==='Enter'){e.preventDefault();confirmInputDialog();} else if(e.key==='Escape')closeInputDialog(); }; } });
}
function confirmInputDialog(){ var i=document.getElementById('io-input'); var v=i?i.value:''; var cb=_ioCb; closeInputDialog(); if(cb)cb(v); }
function closeInputDialog(){ var ov=document.getElementById('io-overlay'); if(ov)ov.classList.remove('show'); _ioCb=null; }
