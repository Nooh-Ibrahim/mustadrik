// timer.js — pomodoro timer, ambient sound, focus mode, progress ring
// module 4/10 of the former renderer.js — classic script (globals shared, no ES modules)


// ===== السعي config (free inputs / sliders + long break + auto-start) =====
var sa3iRound=0, isLongBreak=false;
function getSa3iCfg(){
  if(!S.settings)S.settings={};
  if(!S.settings.sa3i)S.settings.sa3i={work:20,brk:5,longBreak:15,longBreakEnabled:false,rounds:4,autoStart:true,block:100};
  var c=S.settings.sa3i;
  if(c.work==null)c.work=20; if(c.brk==null)c.brk=5; if(c.longBreak==null)c.longBreak=15;
  if(c.longBreakEnabled==null)c.longBreakEnabled=false;   // الراحة الطويلة اختيارية (بطلب المستخدم) — مُطفأة افتراضياً
  if(c.rounds==null)c.rounds=4; if(c.autoStart==null)c.autoStart=true; if(c.block==null)c.block=100;
  return c;
}
// كتلة السعي: من المدة الكلية + مدة كل جلسة + الراحة → أكبر عدد جلسات يلائم الكتلة (مع احتساب الراحات بينها)
function sa3iPlan(){
  var cfg=getSa3iCfg();
  var block=cfg.block||100, work=cfg.work||20, brk=cfg.brk||5;
  var s=0,last=1;
  while(s<99){ s++; if(s*work + (s-1)*brk <= block)last=s; else break; }
  var sessions=Math.max(1,last);
  var used=sessions*work + Math.max(0,sessions-1)*brk;
  return {block:block,work:work,brk:brk,sessions:sessions,used:used,left:block-used};
}
function syncBlock(src){
  var cfg=getSa3iCfg();
  var num=document.getElementById('block-dur'), rng=document.getElementById('block-range'), lbl=document.getElementById('block-dur-lbl');
  var val;
  if(src==='range'&&rng){ val=parseInt(rng.value)||20; if(num)num.value=val; }
  else if(num){ val=parseInt(num.value)||20; if(rng){ var mn=parseInt(rng.min)||20,mx=parseInt(rng.max)||300; rng.value=Math.min(mx,Math.max(mn,val)); } }
  else val=cfg.block||100;
  if(lbl)lbl.textContent=val;
  cfg.block=val; save(); renderSa3iPlan();
}
function renderSa3iPlan(){
  var p=sa3iPlan(), cfg=getSa3iCfg();
  cfg.rounds=p.sessions;                                        // الكتلة الكاملة = راحة طويلة بعدها
  var rd=document.getElementById('rounds-input'); if(rd)rd.value=p.sessions;
  var el=document.getElementById('sa3i-block-plan'); if(!el)return;
  var fit=p.left>0?(' · يتبقّى '+arDigits(p.left)+' د'):(p.left<0?' · <span class="plan-over">تجاوز الكتلة!</span>':' · مضبوطة تماماً');
  el.innerHTML='<i data-lucide="calculator"></i> <b>'+arDigits(p.sessions)+'</b> جلسة × '+arDigits(p.work)+' د'+
    (p.sessions>1?(' + '+arDigits(p.sessions-1)+' راحة × '+arDigits(p.brk)+' د'):'')+' = '+arDigits(p.used)+' د'+fit;
  icons();
}
// Timer
function getWorkDur(){var el=document.getElementById('work-dur');return (el?(parseInt(el.value)||getSa3iCfg().work):getSa3iCfg().work)*60;}
function getBreakDur(){
  if(isLongBreak)return (getSa3iCfg().longBreak||15)*60;
  var el=document.getElementById('break-dur');
  return (el?(parseInt(el.value)||getSa3iCfg().brk):getSa3iCfg().brk)*60;
}
function setDuration(){if(!isRunning){isBreak=false;isLongBreak=false;timeLeft=getWorkDur();updateDisplay();}}
// keep range+number inputs in sync and persist to config
function syncDur(which,src){
  var cfg=getSa3iCfg();
  var numId=which==='work'?'work-dur':'break-dur';
  var rngId=which==='work'?'work-range':'break-range';
  var lblId=which==='work'?'work-dur-lbl':'break-dur-lbl';
  var num=document.getElementById(numId), rng=document.getElementById(rngId), lbl=document.getElementById(lblId);
  var val;
  if(src==='range'&&rng){ val=parseInt(rng.value)||1; if(num)num.value=val; }
  else if(num){ val=parseInt(num.value)||1; if(rng){ var mn=parseInt(rng.min)||1,mx=parseInt(rng.max)||120; rng.value=Math.min(mx,Math.max(mn,val)); } }
  else { val=which==='work'?cfg.work:cfg.brk; }
  if(lbl)lbl.textContent=val;
  if(which==='work')cfg.work=val; else cfg.brk=val;
  save();
  if(which==='work'&&!isRunning)setDuration();
  if(typeof renderSa3iPlan==='function')renderSa3iPlan();   // أعِد حساب عدد الجلسات للكتلة
}
function sa3iCfgChange(){
  var cfg=getSa3iCfg();
  var lb=document.getElementById('longbreak-dur'); if(lb)cfg.longBreak=Math.max(1,parseInt(lb.value)||15);
  var lbe=document.getElementById('longbreak-enabled-chk'); if(lbe)cfg.longBreakEnabled=!!lbe.checked;
  var rd=document.getElementById('rounds-input'); if(rd)cfg.rounds=Math.max(1,parseInt(rd.value)||4);
  var as=document.getElementById('autostart-chk'); if(as)cfg.autoStart=!!as.checked;
  save();
}
// populate all السعي inputs from config (called on boot + when opening the page)
function renderSa3iSettings(){
  var cfg=getSa3iCfg();
  function setv(id,v){var el=document.getElementById(id);if(el)el.value=v;}
  function settxt(id,v){var el=document.getElementById(id);if(el)el.textContent=v;}
  setv('block-dur',cfg.block); setv('block-range',Math.min(300,cfg.block)); settxt('block-dur-lbl',cfg.block);
  setv('work-dur',cfg.work); setv('work-range',Math.min(120,cfg.work)); settxt('work-dur-lbl',cfg.work);
  setv('break-dur',cfg.brk); setv('break-range',Math.min(60,cfg.brk)); settxt('break-dur-lbl',cfg.brk);
  setv('longbreak-dur',cfg.longBreak); setv('rounds-input',cfg.rounds);
  var lbe=document.getElementById('longbreak-enabled-chk'); if(lbe)lbe.checked=!!cfg.longBreakEnabled;
  var as=document.getElementById('autostart-chk'); if(as)as.checked=!!cfg.autoStart;
  settxt('round-count',arDigits(sa3iRound));
  var sn=document.getElementById('timer-shownum-chk'); if(sn)sn.checked=!(S.settings&&S.settings.timerShowNum===false);
  if(typeof renderTimerStyleCtrl==='function')renderTimerStyleCtrl();
  if(typeof renderFocusModeCtrl==='function')renderFocusModeCtrl();
  if(typeof renderSa3iPlan==='function')renderSa3iPlan();
  if(typeof initClockTicks==='function')initClockTicks();
  var cc=document.getElementById('companion-chk'); if(cc)cc.checked=companionOn();
  renderCompanion();
  if(!isRunning)setDuration();
  updateTimerVisual();
}
// ===== الرفيق الصامت (body doubling) =====
function companionOn(){ return !!(S.settings&&S.settings.companion); }
function toggleCompanion(){ if(!S.settings)S.settings={}; var c=document.getElementById('companion-chk'); S.settings.companion=c?!!c.checked:!S.settings.companion; save(); renderCompanion(); }
function renderCompanion(){
  var el=document.getElementById('companion'); if(!el)return;
  if(!companionOn()){ el.style.display='none'; return; }
  el.style.display='';
  el.innerHTML='<span class="comp-dot"></span><span>'+(isRunning&&!isBreak?'رفيقك الصامت يُذاكر معك الآن 🤝 — لستَ وحدك':'رفيقك الصامت حاضر — اضغط تشغيل لنبدأ سوياً')+'</span>';
}
// ===== مساومة الـ5 دقائق (عند المقاومة/التأجيل) =====
function fiveMinBargain(){
  var ov=document.getElementById('bargain-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='bargain-overlay'; ov.className='ritual-overlay'; document.body.appendChild(ov); }
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header">'+
      '<div class="ritual-icon">🤝</div><div class="ritual-title">مساومة لطيفة</div>'+
      '<div class="ritual-sub">المهمة تبدو ثقيلة اليوم… لا بأس</div></div>'+
    '<div class="ritual-body" style="text-align:center;align-items:center">'+
      '<div style="font-size:15px;font-weight:600;line-height:2;color:var(--text2)">هل تصمد <b style="color:var(--accent-text)">٥ دقائق فقط</b>؟<br>إن توقفت بعدها، تُحسب لك جلسة ناجحة كاملة.<br><span style="font-size:13px;color:var(--text3)">(غالباً لن تتوقف — محرّك تركيزك سيشتعل)</span></div>'+
    '</div>'+
    '<div class="ritual-foot"><button class="btn pri" onclick="acceptBargain()"><i data-lucide="play"></i> موافق، ٥ دقائق</button>'+
      '<button class="btn ghost" onclick="closeBargain()">ليس الآن</button></div>'+
  '</div>';
  icons();
}
function closeBargain(){ var ov=document.getElementById('bargain-overlay'); if(ov)ov.style.display='none'; }
function acceptBargain(){
  closeBargain();
  navTo('pomodoro');
  setTimeout(function(){
    resetTimer();
    isBreak=false; isLongBreak=false; timeLeft=5*60;   // جلسة ٥ دقائق
    var lbl=document.getElementById('timer-label'); if(lbl)lbl.innerHTML='<i data-lucide="zap"></i> ٥ دقائق فقط — تستطيع!';
    updateDisplay(); startTimer(); icons();
  },80);
}
function startTimer(){
  if(isRunning)return;isRunning=true;
  expectedEndTime=Date.now()+(timeLeft*1000);
  sessionStartTs=Date.now();
  document.getElementById('btn-start').style.display='none';document.getElementById('btn-pause').style.display='';
  if(!isBreak)document.body.classList.add('in-session');   // وضع التركيز المُطلق: يُخفي الشريط الجانبي وشريط الصلاة
  if(typeof resetDistract==='function')resetDistract();    // حارس التشتّت: صفّر العدّاد عند بدء جلسة
  if(!isBreak&&companionOn()&&ambientType==='none'){ var asel=document.getElementById('ambient-sel'); if(asel)asel.value='rain'; ambientType='rain'; }  // الرفيق الصامت: صوت محيط تلقائي
  startAmbient();updateDisplay();if(!isBreak)startBubbles();
  if(typeof renderCompanion==='function')renderCompanion();
  timerInterval=setInterval(function(){
    // drift-proof: always recalculate from wall clock
    timeLeft=Math.max(0,Math.round((expectedEndTime-Date.now())/1000));
    if(timeLeft<=0){
      clearInterval(timerInterval);isRunning=false;
      if(!isBreak){
        const dur=parseInt(document.getElementById('work-dur').value);
        S.sessions++;S.totalMin+=dur;
        const today=todayKey();S.activityLog[today]=(S.activityLog[today]||0)+dur;
        checkWeekReset();const di=new Date().getDay();if(!S.weekData)S.weekData=[0,0,0,0,0,0,0];S.weekData[di]=(S.weekData[di]||0)+dur;
        const subj=document.getElementById('pomo-subject');const subjKey=subj?subj.value:'gen';if(!S.subjectLog)S.subjectLog={};S.subjectLog[subjKey]=(S.subjectLog[subjKey]||0)+dur;if(!S.settings)S.settings={};S.settings.lastSubject=subjKey;   // تذكّر آخر مادة لاسترجاعها افتراضياً
        if(!Array.isArray(S.hourLog)||S.hourLog.length!==24)S.hourLog=new Array(24).fill(0);S.hourLog[new Date().getHours()]++;
        updateStreak(today);
        // round bookkeeping → decide whether the next break is a long one (الراحة الطويلة اختيارية)
        var cfg=getSa3iCfg();
        sa3iRound++; isLongBreak=(cfg.longBreakEnabled && cfg.rounds>0 && sa3iRound%cfg.rounds===0);
        var rc=document.getElementById('round-count');if(rc)rc.textContent=arDigits(sa3iRound);
        save();updateSessionCount();updateStats();updateGoalBar();renderWeekChart();renderHeatmap();renderSubjChart();renderAnalytics();playBeep();celebrate();checkAchievements();
        notifyDesktop('انتهت جلسة السعي! 🎉',withName('أحسنت')+' — أنجزت '+arN(dur)+' دقيقة تركيز. '+(isLongBreak?'خذ راحة طويلة تستحقها.':'خذ راحة قصيرة.'));
        stopBubbles();recordSa3iSession(dur,subjKey);     // persist session to IndexedDB + bump task actual + rating
        document.body.classList.remove('in-session');     // ينتهي وضع التركيز المُطلق مع الجلسة
        if(isLongBreak&&typeof showMindfulReward==='function'){ try{ showMindfulReward(getSa3iCfg().longBreak||15); }catch(e){} }  // المكافأة الواعية بعد دورة كاملة
      }else{ isLongBreak=false; playBeep();notifyDesktop('انتهت الراحة ☕','هيا نكمل السعي! 💪'); if(typeof flowAdvance==='function')flowAdvance(); }
      isBreak=!isBreak;timeLeft=isBreak?getBreakDur():getWorkDur();
      document.getElementById('timer-label').innerHTML=isBreak?('<i data-lucide="coffee"></i> '+(isLongBreak?'راحة طويلة':'وقت الراحة')):'<i data-lucide="book-open"></i> جلسة سعي';
      document.getElementById('btn-start').style.display='';document.getElementById('btn-pause').style.display='none';stopAmbient();icons();
      // auto-start the next phase if enabled, otherwise wait for the user
      if(getSa3iCfg().autoStart){ setTimeout(function(){ if(!isRunning)startTimer(); },900); }
    }
    updateDisplay();
  },500); // poll at 500ms for smoother UI without drifting
}
function pauseTimer(){
  clearInterval(timerInterval);isRunning=false;
  // freeze timeLeft at current drift-corrected value
  timeLeft=Math.max(0,Math.round((expectedEndTime-Date.now())/1000));
  syncTaskbarProgress();if(typeof twSync==='function')twSync();
  document.body.classList.remove('in-session');
  document.getElementById('btn-start').style.display='';document.getElementById('btn-pause').style.display='none';stopAmbient();stopBubbles();
}
function resetTimer(){clearInterval(timerInterval);isRunning=false;isBreak=false;isLongBreak=false;timeLeft=getWorkDur();expectedEndTime=0;document.body.classList.remove('in-session');updateDisplay();document.getElementById('btn-start').style.display='';document.getElementById('btn-pause').style.display='none';document.getElementById('timer-label').innerHTML='<i data-lucide="book-open"></i> جلسة سعي';stopAmbient();stopBubbles();icons();}
function updateDisplay(){var m=Math.floor(timeLeft/60),s=timeLeft%60;document.getElementById('timer-display').textContent=arDigits((m<10?'0':'')+m+':'+(s<10?'0':'')+s);updateTimerVisual();var bc=document.getElementById('break-controls');if(bc)bc.style.display=isBreak?'flex':'none';syncTaskbarProgress();if(typeof twSync==='function')twSync();}
// تقدّم الجلسة في شريط مهام ويندوز (عون لعمى الوقت — يبقى مرئياً والتطبيق مصغّر)
function syncTaskbarProgress(){
  try{
    if(!(window.noahAPI&&noahAPI.taskbarProgress))return;
    var tot=isBreak?getBreakDur():getWorkDur();
    noahAPI.taskbarProgress((isRunning&&tot>0)?Math.min(1,Math.max(0.01,1-timeLeft/tot)):-1);
  }catch(_){}
}
// skip the current break → jump straight to a fresh جلسة سعي
function skipBreak(){
  if(!isBreak)return;
  clearInterval(timerInterval);isRunning=false;isBreak=false;isLongBreak=false;timeLeft=getWorkDur();
  var lbl=document.getElementById('timer-label');if(lbl)lbl.innerHTML='<i data-lucide="book-open"></i> جلسة سعي';
  document.getElementById('btn-start').style.display='';document.getElementById('btn-pause').style.display='none';
  stopAmbient();updateDisplay();icons();
  if(typeof flowAdvance==='function')flowAdvance();   // تخطّي الراحة أثناء الانسياب = انتقل للمهمة التالية فوراً
}
// extend the current break by 5 minutes
function extendBreak(){
  if(!isBreak)return;
  timeLeft+=5*60; if(isRunning)expectedEndTime+=5*60*1000; updateDisplay();
}
function updateSessionCount(){document.getElementById('sess-count').textContent=arDigits(S.sessions||0);}
/* toggleFocus (deep version) is defined in the FOCUS MODE section below */
function playBeep(){try{var c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=660;g.gain.value=0.3;o.start();g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+1);o.stop(c.currentTime+1);}catch(e){}}
// ===== مكافأة حسّية فورية (ADHD): نقرة ميكانيكية مريحة + وميض عند إتمام خطوة =====
function playClick(){ try{ var c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain(); o.type='triangle'; o.frequency.setValueAtTime(1100,c.currentTime); o.frequency.exponentialRampToValueAtTime(540,c.currentTime+0.08); o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.14,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.13); o.start(); o.stop(c.currentTime+0.14); }catch(e){} }
function flashDone(){ try{ document.body.classList.add('pulse-done'); setTimeout(function(){ document.body.classList.remove('pulse-done'); },560); }catch(e){} }
// دفء يتزايد بصرياً مع دقائق تركيز اليوم (إحساس أن «حرارة» البرنامج تزداد بإنجازك)
function applyWarmth(){ try{ var m=(S.activityLog&&S.activityLog[todayKey()])||0; var lvl=Math.min(5,Math.floor(m/30)); document.body.setAttribute('data-warmth',String(lvl)); }catch(e){} }
// زر «عالق؟» — تدخّل فوري بلا احتكاك: مساومة ٥ دقائق أو تفريغ ما يعيقك
function stuckHelp(){
  var ov=document.getElementById('stuck-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='stuck-overlay'; ov.className='ritual-overlay'; document.body.appendChild(ov); ov.addEventListener('click',function(e){ if(e.target===ov)closeStuck(); }); }
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header"><div class="ritual-icon">🧊</div><div class="ritual-title">عالقٌ الآن؟</div>'+
      '<div class="ritual-sub">لا بأس — نكسر الجمود معاً بخطوة صغيرة</div></div>'+
    '<div class="ritual-body sanad-grid">'+
      '<button class="sanad-opt" onclick="closeStuck();fiveMinBargain()"><span class="so-ic">🤝</span><span class="so-t">مساومة ٥ دقائق</span><span class="so-s">ابدأ ٥ دقائق فقط — غالباً لن تتوقف</span></button>'+
      '<button class="sanad-opt" onclick="closeStuck();navTo(\'braindump\');setTimeout(function(){var i=document.getElementById(\'dump-input\');if(i)i.focus();},150)"><span class="so-ic">🎙️</span><span class="so-t">فرّغ ما يعيقك</span><span class="so-s">قُل/اكتب: «لا أفهم كذا» — النطق يكسر الجليد</span></button>'+
    '</div><div class="ritual-foot"><button class="btn ghost" onclick="closeStuck()">إغلاق</button></div></div>';
  icons();
}
function closeStuck(){ var ov=document.getElementById('stuck-overlay'); if(ov)ov.style.display='none'; }
function celebrate(){var d=document.getElementById('timer-display');d.style.color='var(--green)';setTimeout(function(){d.style.color='';},2000);}
function changeAmbient(){ambientType=document.getElementById('ambient-sel').value;if(isRunning){stopAmbient();startAmbient();}}
function setVolume(v){curVol=parseFloat(v);if(ambientNode&&ambientNode.gain)ambientNode.gain.gain.value=curVol;}
// مكتبة أصوات بترددات مختلفة مناسبة لدماغ ADHD (بيضاء/بنّية/وردية/مطر/كافيه) — مولّدة، آمنة CSP
function startAmbient(){
  if(ambientType==='none')return;
  try{
    if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    stopAmbient();
    var gain=audioCtx.createGain();gain.gain.value=curVol;gain.connect(audioCtx.destination);
    var len=Math.floor(audioCtx.sampleRate*4), buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate), d=buf.getChannelData(0), i;
    if(ambientType==='brown'){            // ضوضاء بنّية — عميقة هادئة، الأفضل للتركيز
      var last=0; for(i=0;i<len;i++){ var w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.2; }
    } else if(ambientType==='pink'){      // ضوضاء وردية — متوازنة ناعمة
      var b0=0,b1=0,b2=0; for(i=0;i<len;i++){ var x=Math.random()*2-1; b0=0.99765*b0+x*0.0990460; b1=0.96300*b1+x*0.2965164; b2=0.57000*b2+x*1.0526913; d[i]=(b0+b1+b2+x*0.1848)*0.16; }
    } else {                               // بيضاء/مطر/كافيه
      var amp=ambientType==='cafe'?0.12:ambientType==='rain'?0.35:0.5;
      for(i=0;i<len;i++)d[i]=(Math.random()*2-1)*amp;
    }
    var src=audioCtx.createBufferSource();src.buffer=buf;src.loop=true;
    if(ambientType==='rain'){ var f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=1000;f.Q.value=0.3;src.connect(f);f.connect(gain); }
    else if(ambientType==='brown'){ var lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=480;src.connect(lp);lp.connect(gain); }
    else if(ambientType==='pink'){ var lp2=audioCtx.createBiquadFilter();lp2.type='lowpass';lp2.frequency.value=1800;src.connect(lp2);lp2.connect(gain); }
    else { src.connect(gain); }
    src.start();ambientNode={src:src,gain:gain};
  }catch(e){}
}
function stopAmbient(){if(ambientNode){try{ambientNode.src.stop();}catch(e){}ambientNode=null;}}
function checkWeekReset(){var ws=weekStartKey();if(S.weekStart!==ws){if(S.weekStart){S.lastWeekTotal=(S.weekData||[]).reduce(function(a,b){return a+b;},0);}S.weekData=[0,0,0,0,0,0,0];S.weekStart=ws;}}
// السلسلة + «رحمة السلسلة»: انقطاع يومٍ واحدٍ فقط يُغفَر مرة كل أسبوع (رجاء لا قنوط — لا انهيار للسلسلة من كبوة)
function updateStreak(today){
  if(S.lastStudyDate===today)return;
  var y=new Date();y.setDate(y.getDate()-1);var yk=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();
  if(S.lastStudyDate===yk){ S.streak=(S.streak||0)+1; }
  else{
    var y2=new Date();y2.setDate(y2.getDate()-2);var y2k=y2.getFullYear()+'-'+(y2.getMonth()+1)+'-'+y2.getDate();
    if(!S.streakMercy||typeof S.streakMercy!=='object')S.streakMercy={week:'',used:false};
    var wk=weekStartKey();
    if(S.streakMercy.week!==wk){ S.streakMercy.week=wk; S.streakMercy.used=false; }
    if(S.lastStudyDate===y2k&&!S.streakMercy.used&&(S.streak||0)>=2){
      S.streakMercy.used=true; S.streak=(S.streak||0)+1;
      try{ notify('🌿 رحمة السلسلة: يومُ انقطاعٍ واحد مغفور — سلسلتك مستمرة ('+S.streak+' يوماً)','heart'); }catch(_){}
    } else S.streak=1;
  }
  S.lastStudyDate=today;
}

// ===== FOCUS MODE (deep) — نوعان: ملء شاشة البرنامج (app) أو ملء شاشة الويندوز (os) =====
function focusFullscreenMode(){ return (S.settings&&S.settings.focusFullscreen)||'app'; }
function setFocusFullscreen(v){ if(!S.settings)S.settings={}; S.settings.focusFullscreen=v; save(); if(typeof renderFocusModeCtrl==='function')renderFocusModeCtrl(); }
function renderFocusModeCtrl(){
  var el=document.getElementById('focus-mode-ctrl'); if(!el)return;
  var cur=focusFullscreenMode();
  var opts=[['app','شاشة البرنامج','app-window'],['os','الشاشة كاملة','maximize']];
  el.innerHTML=opts.map(function(o){ return '<button class="seg-btn'+(cur===o[0]?' on':'')+'" onclick="setFocusFullscreen(\''+o[0]+'\')" title="'+o[1]+'"><i data-lucide="'+o[2]+'"></i> '+o[1]+'</button>'; }).join('');
  icons();
}
function toggleFocus(){
  focusMode=!focusMode;
  document.body.classList.toggle('focus-active',focusMode);
  // التركيز مكانه المؤقّت — انتقل إليه عند الدخول
  if(focusMode&&currentPage!=='pomodoro'&&typeof navTo==='function')navTo('pomodoro');
  try{
    if(focusMode){ if(focusFullscreenMode()==='os'&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen(); }
    else { if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen(); }
  }catch(e){}
  const ftd=document.getElementById('focus-task-display');
  if(ftd){
    ftd.style.display=focusMode&&currentTaskName?'block':'none';
    if(focusMode&&currentTaskName)ftd.textContent='🎯 '+currentTaskName;
  }
  const btn=document.getElementById('btn-focus');
  if(btn){ btn.innerHTML=focusMode?'<i data-lucide="eye-off"></i>':'<i data-lucide="eye"></i>'; btn.title=focusMode?'إلغاء التركيز':'تركيز'; }
  icons();
}
// ===== TASK → TIMER INTEGRATION =====
// تحميل مهمة في المؤقّت «دون تشغيل» (بطلب المستخدم: الضغط يضعها فقط) + إلحاقها تلقائياً بالفترة الجارية
// المادة الحالية: اضبط مُنتقي pomo-subject على مفتاحٍ إن وُجد خياره (تحميل مهمة / استرجاع آخر مادة)
function setPomoSubject(key){
  if(!key)return; var sel=document.getElementById('pomo-subject'); if(!sel)return;
  if([].some.call(sel.options,function(o){return o.value===key;}))sel.value=key;
}
// عند دخول المؤقّت: مادة المهمة المحمّلة إن وُجدت، وإلا آخر مادة استُخدمت (بدل البقاء على «إنجليزي» الافتراضي)
function restorePomoSubject(){
  if(currentTaskId!=null){ var t=(S.tasks||[]).find(function(x){return x.id===currentTaskId;}); if(t&&t.subject){ setPomoSubject(t.subject); return; } }
  if(S.settings&&S.settings.lastSubject)setPomoSubject(S.settings.lastSubject);
}
function loadTaskToTimer(id){
  const t=(S.tasks||[]).find(function(x){return x.id===id;});
  if(!t)return;
  currentTaskName=t.text; currentTaskId=id; currentStepIdx=null;
  if(typeof dayPlanAttach==='function')dayPlanAttach(id);          // تظهر في فترة الصلاة الحالية تلقائياً
  navTo('pomodoro');
  setTimeout(function(){
    const lbl=document.getElementById('timer-label');
    if(lbl)lbl.innerHTML='<i data-lucide="book-open"></i> '+esc(t.text).slice(0,40);
    const ftd=document.getElementById('focus-task-display');
    if(ftd){ftd.textContent='🎯 '+t.text;ftd.style.display='block';}
    setPomoSubject(t.subject);                                      // المادة ترث من المهمة المحمّلة
    if(!isRunning)resetTimer();                                     // جاهزة — والتشغيل بزرّ ▶ عند قرارك
    icons();
  },60);
}
function startTaskTimer(id){
  const t=(S.tasks||[]).find(function(x){return x.id===id;});
  if(!t)return;
  currentTaskName=t.text; currentTaskId=id; currentStepIdx=null;   // link session → task (estimated vs actual)
  if(typeof dayPlanAttach==='function')dayPlanAttach(id);          // كل جلسة تُسجَّل في فترتها الصلاتية
  // navigate to «السعي» (page id stays 'pomodoro') — robust by id, not by label text
  navTo('pomodoro');
  setTimeout(function(){
    const lbl=document.getElementById('timer-label');
    if(lbl)lbl.innerHTML='<i data-lucide="book-open"></i> '+esc(t.text).slice(0,40);
    const ftd=document.getElementById('focus-task-display');
    if(ftd){ftd.textContent='🎯 '+t.text;ftd.style.display='block';}
    setPomoSubject(t.subject);                                      // المادة ترث من المهمة المحمّلة
    if(!isRunning){resetTimer();startTimer();}
    icons();
  },60);
}

// ===== POMODORO extras =====
var pomoSettOpen=false;
function togglePomoSettings(){
  pomoSettOpen=!pomoSettOpen;
  var p=document.getElementById('pomo-settings-panel');
  var c=document.getElementById('pomo-caret');
  if(p){
    p.classList.toggle('open',pomoSettOpen);
    // إصلاح: نقيس ارتفاع المحتوى ديناميكياً بدل max-height ثابت كان يقصّ «الراحة القصيرة» وما تحتها
    p.style.maxHeight=pomoSettOpen?(p.scrollHeight+48)+'px':'0px';
  }
  if(c)c.style.transform=pomoSettOpen?'rotate(180deg)':'';
  icons();
}
function timerRatio(){ var total=isBreak?getBreakDur():getWorkDur(); return total>0?Math.max(0,Math.min(1,timeLeft/total)):0; }
function updateEndsAt(){
  var es=document.getElementById('timer-endsat'); if(!es)return;
  if(isRunning&&expectedEndTime){ var d=new Date(expectedEndTime); es.textContent='ينتهي '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }
  else{ es.textContent=isBreak?'وقت راحة':''; }
}
function updateTimerRing(){
  var ratio=timerRatio();
  var fg=document.getElementById('timer-ring-fg');
  if(fg){ var C=2*Math.PI*54; fg.style.strokeDasharray=C; fg.style.strokeDashoffset=C*(1-ratio); fg.style.stroke=isBreak?'var(--green)':'var(--accent)'; }
}
// ===== المؤقت الفيزيائي متعدد الأنواع (حلقة / قرص / ساعة رملية / عقارب) =====
function timerStyle(){ return (S.settings&&S.settings.timerStyle)||'ring'; }
function updateTimerVisual(){
  var wrap=document.getElementById('timer-visual'); if(!wrap)return;
  var style=timerStyle(); wrap.setAttribute('data-style',style);
  wrap.classList.toggle('no-num', S.settings&&S.settings.timerShowNum===false);
  var r=timerRatio(); var accent=isBreak?'var(--green)':'var(--accent)';
  if(style==='ring'){ updateTimerRing(); }
  else if(style==='disc'){
    var disc=document.getElementById('timer-disc');
    if(disc){ var deg=r*360; disc.style.background='conic-gradient('+accent+' '+deg+'deg, var(--surface3) '+deg+'deg)'; }
  }
  else if(style==='hourglass'){
    var top=document.getElementById('hg-top'), bot=document.getElementById('hg-bot');
    if(top){ var Lt=70-r*56; var hw=29*r; top.setAttribute('points',(50-hw)+','+Lt+' '+(50+hw)+','+Lt+' 50,70'); top.style.fill='var(--sand)'; }   // رمل ذهبي واقعي بدل لون الثيم
    if(bot){ var Lb=128-(1-r)*56; var hwb=29*(1-r); bot.setAttribute('points',(50-hwb)+','+Lb+' '+(50+hwb)+','+Lb+' 74,128 26,128'); bot.style.fill='var(--sand)'; }
  }
  else if(style==='clock'){
    var hand=document.getElementById('clk-hand');
    if(hand){ var ang=(1-r)*360; hand.setAttribute('transform','rotate('+ang+' 60 60)'); hand.style.stroke=accent; }
  }
  updateEndsAt();
}
function initClockTicks(){
  var g=document.getElementById('clk-ticks'); if(!g||g.childNodes.length)return;
  var html='';
  for(var i=0;i<12;i++){
    var a=i*30*Math.PI/180;
    var major=(i%3===0);                 // 12/3/6/9 ساعات رئيسية
    var r1=major?47:50.5, r2=54;         // الدقائق أقصر حتى لا تتداخل مع العقرب
    var x1=60+r1*Math.sin(a),y1=60-r1*Math.cos(a),x2=60+r2*Math.sin(a),y2=60-r2*Math.cos(a);
    html+='<line'+(major?' class="major"':'')+' x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'"/>';
  }
  g.innerHTML=html;
}
function setTimerStyle(v){ if(!S.settings)S.settings={}; S.settings.timerStyle=v; save(); renderTimerStyleCtrl(); updateTimerVisual(); }
function toggleTimerNum(){ if(!S.settings)S.settings={}; var c=document.getElementById('timer-shownum-chk'); S.settings.timerShowNum=c?!!c.checked:true; save(); updateTimerVisual(); }
function renderTimerStyleCtrl(){
  var el=document.getElementById('timer-style-ctrl'); if(!el)return;
  var cur=timerStyle();
  var opts=[['ring','حلقة','circle'],['disc','قرص','pie-chart'],['hourglass','ساعة رملية','hourglass'],['clock','عقارب','clock']];
  el.innerHTML=opts.map(function(o){ return '<button class="seg-btn'+(cur===o[0]?' on':'')+'" onclick="setTimerStyle(\''+o[0]+'\')" title="'+o[1]+'"><i data-lucide="'+o[2]+'"></i> '+o[1]+'</button>'; }).join('');
  icons();
}

// ===== السعي advanced: session log (IndexedDB) + rating + mindful bubbles =====
var sessionStartTs=0, bubbleInt=null, lastSessionRec=null, rateValue=0;
function recordSa3iSession(dur,subjKey){
  if(currentTaskId){ S.tasks=(S.tasks||[]).map(function(t){ if(t.id===currentTaskId){ t.actualSessions=(t.actualSessions||0)+1; if(currentStepIdx!=null&&t.steps&&t.steps[currentStepIdx])t.steps[currentStepIdx].actualSessions=(t.steps[currentStepIdx].actualSessions||0)+1; } return t; }); save(); try{renderTasks();}catch(e){} }
  var rec={ id:'s_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    profileId:curProfileId(),
    start:sessionStartTs||(Date.now()-dur*60000), end:Date.now(), durationMin:dur,
    subject:subjKey||'gen', taskId:currentTaskId||null, taskName:currentTaskName||'',
    period:(typeof currentPeriodKey==='function'?currentPeriodKey():null),   // الفترة الصلاتية للجلسة (لإحصاء أنشط فترة)
    focusRating:null, note:'', date:todayKey() };
  if(typeof dbReady==='function'&&dbReady()){ try{ dbPut('sessions',rec); }catch(e){} }
  openSa3iRating(rec);
}
function openSa3iRating(rec){
  lastSessionRec=rec; rateValue=0;
  var ov=document.getElementById('sa3i-rating');
  if(!ov){
    ov=document.createElement('div'); ov.id='sa3i-rating'; ov.className='confirm-overlay';
    ov.innerHTML='<div class="confirm-box" style="max-width:380px">'+
      '<div style="font-size:17px;font-weight:800;margin-bottom:.25rem">كيف كان تركيزك؟ 🎯</div>'+
      '<div style="font-size:13px;color:var(--text3);margin-bottom:1rem">قيّم الجلسة ودوّن ما أنجزته</div>'+
      '<div class="rate-stars" id="rate-stars"></div>'+
      '<textarea id="rate-note" placeholder="ماذا أنجزت؟ (اختياري)" style="width:100%;margin-top:1rem;min-height:64px;resize:vertical"></textarea>'+
      '<div class="confirm-actions" style="margin-top:1rem"><button class="btn" onclick="skipSa3iRating()">تخطٍّ</button><button class="btn pri" onclick="saveSa3iRating()"><i data-lucide="check"></i> حفظ</button></div>'+
      '</div>';
    document.body.appendChild(ov);
  }
  var note=document.getElementById('rate-note'); if(note)note.value='';
  renderRateStars(); icons();
  requestAnimationFrame(function(){ ov.classList.add('show'); });
}
function renderRateStars(){ var el=document.getElementById('rate-stars'); if(!el)return; var h=''; for(var i=1;i<=5;i++){h+='<button class="rate-star'+(i<=rateValue?' on':'')+'" onclick="setRate('+i+')">★</button>';} el.innerHTML=h; }
function setRate(v){ rateValue=v; renderRateStars(); }
function saveSa3iRating(){
  if(lastSessionRec){ lastSessionRec.focusRating=rateValue||null; var n=document.getElementById('rate-note'); lastSessionRec.note=n?n.value.trim():''; if(typeof dbReady==='function'&&dbReady()){try{dbPut('sessions',lastSessionRec);}catch(e){}} }
  closeSa3iRating(); renderSa3iLog();
}
function skipSa3iRating(){ closeSa3iRating(); renderSa3iLog(); }
function closeSa3iRating(){ var ov=document.getElementById('sa3i-rating'); if(ov)ov.classList.remove('show'); }
function renderSa3iLog(){
  var el=document.getElementById('sa3i-log'); if(!el)return;
  var me=curProfileId();
  function paint(list){
    list=(list||[]).filter(function(s){return s.profileId===me;}).sort(function(a,b){return b.end-a.end;}).slice(0,12);
    if(!list.length){ el.innerHTML='<div class="empty" style="padding:1rem"><i data-lucide="history"></i><div>لا جلسات بعد — ابدأ أوّل جلسة سعي</div></div>'; icons(); return; }
    el.innerHTML=list.map(function(s){
      var subj=((S.subjects&&S.subjects[s.subject])||{label:(s.subject==='gen'?'عام':s.subject)}).label;
      var d=new Date(s.end), stars=s.focusRating?'★★★★★'.slice(0,s.focusRating):'—';
      return '<div class="sa3i-log-row"><div class="slr-main"><div class="slr-top">'+(s.taskName?esc(s.taskName):('جلسة '+subj))+'</div>'+
        '<div class="slr-sub">'+d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})+' · '+arDigits(s.durationMin)+' د'+(s.note?(' · '+esc(s.note)):'')+'</div></div>'+
        '<div class="slr-stars" title="تقييم التركيز">'+stars+'</div></div>';
    }).join(''); icons();
  }
  if(typeof dbGetAll==='function'&&typeof dbReady==='function'&&dbReady()){ dbGetAll('sessions').then(paint).catch(function(){paint([]);}); }
  else paint([]);
}
// mindful bubbles — gentle reminders that fade by themselves during a focus session
var BUBBLES=['جدّد النية ☁️','اذكر الله 🤍','نفَس عميق… وواصل','أنت تبلي بلاءً حسناً','الإتقان عبادة','خطوة خطوة تصل','اللهم أعنّي وسدّدني','ركّز على هذه اللحظة'];
function startBubbles(){ stopBubbles(); if(!document.getElementById('mindful-bubbles'))return; bubbleInt=setInterval(showBubble,72000); setTimeout(showBubble,9000); }
function stopBubbles(){ if(bubbleInt){clearInterval(bubbleInt);bubbleInt=null;} }
function showBubble(){
  var c=document.getElementById('mindful-bubbles'); if(!c||!isRunning||isBreak)return;
  var b=document.createElement('div'); b.className='mindful-bubble'; b.textContent=BUBBLES[Math.floor(Math.random()*BUBBLES.length)];
  c.appendChild(b); setTimeout(function(){ if(b.parentNode)b.parentNode.removeChild(b); },6200);
}

// ===== السعي task bank (drag a task onto the timer to start a session for it) =====
// بنك الجِدّ: المهمة الرئيسية + خطواتها الفرعية — كلاهما قابل للسحب على المؤقّت أو الضغط للبدء
function renderSa3iTasks(){
  var el=document.getElementById('sa3i-tasks'); if(!el)return;
  var list=(S.tasks||[]).filter(function(t){return !t.done&&!t.archived;});
  if(!list.length){ el.innerHTML='<div class="empty" style="padding:1rem"><i data-lucide="clipboard-list"></i><div>لا مهام مفتوحة — أضِفها من بنك المهام</div></div>'; icons(); if(typeof renderSa3iEta==='function')renderSa3iEta(); return; }
  var showEst=taskEtaOn();
  el.innerHTML=list.slice(0,40).map(function(t){
    var sub=S.subjects[t.subject]||{label:'?'};
    var estInp=showEst?'<input class="sa3i-est" type="number" min="5" max="480" step="5" value="'+(t.estMin||'')+'" placeholder="د؟" title="تقديرك بالدقائق لهذه المهمة" onclick="event.stopPropagation()" onchange="setTaskEst('+t.id+',this.value)">':'';
    var stepsHtml=(t.steps||[]).map(function(s,si){
      if(s.done)return '';
      return '<div class="sa3i-substep" draggable="true" ondragstart="taskDragStart(event,'+t.id+')" ondragend="taskDragEnd(event)" onclick="loadStepToTimer('+t.id+','+si+')" title="اسحب للمؤقّت أو اضغط لوضعها (دون تشغيل)">'+
        '<i data-lucide="corner-down-left"></i><span class="st-name">'+esc(s.text)+'</span><span class="st-sess" title="جلسات: منجزة/مخطّطة">'+(s.actualSessions||0)+'/'+(s.sessions||1)+'</span></div>';
    }).join('');
    return '<div class="sa3i-task-group">'+
      '<div class="sa3i-task" draggable="true" ondragstart="taskDragStart(event,'+t.id+')" ondragend="taskDragEnd(event)" onclick="loadTaskToTimer('+t.id+')" title="اسحب إلى المؤقّت أو اضغط لوضعها (دون تشغيل)">'+
        '<i data-lucide="grip-vertical"></i><span class="st-name">'+esc(t.text)+'</span>'+estInp+'<span class="badge bd-'+t.subject+'">'+sub.label+'</span></div>'+
      (stepsHtml?'<div class="sa3i-substeps">'+stepsHtml+'</div>':'')+
    '</div>';
  }).join(''); icons();
  if(typeof renderSa3iEta==='function')renderSa3iEta();
}
// خطوة فرعية → المؤقّت (المفتت: نُظهِر الخطوة الصغيرة فقط لخداع الدماغ ببدايةٍ سهلة)
function _stepIntoTimer(taskId,si,autostart){
  var t=(S.tasks||[]).find(function(x){return x.id===taskId;}); if(!t)return;
  var step=(t.steps||[])[si];
  currentTaskId=taskId; currentStepIdx=si; currentTaskName=step?step.text:t.text;
  if(typeof dayPlanAttach==='function')dayPlanAttach(taskId);
  navTo('pomodoro');
  setTimeout(function(){
    var lbl=document.getElementById('timer-label'); if(lbl)lbl.innerHTML='<i data-lucide="book-open"></i> '+esc(currentTaskName).slice(0,46);
    var ftd=document.getElementById('focus-task-display'); if(ftd){ ftd.textContent='🎯 '+currentTaskName; ftd.style.display='block'; }
    setPomoSubject(t.subject);                                      // المادة ترث من مهمة الخطوة
    if(!isRunning){ resetTimer(); if(autostart)startTimer(); }
    icons();
  },60);
}
function startStepTimer(taskId,si){ _stepIntoTimer(taskId,si,true); }
function loadStepToTimer(taskId,si){ _stepIntoTimer(taskId,si,false); }
function sa3iDropOver(e){ e.preventDefault(); if(e.dataTransfer)e.dataTransfer.dropEffect='move'; var z=document.getElementById('sa3i-drop'); if(z)z.classList.add('over'); }
function sa3iDropLeave(e){ var z=document.getElementById('sa3i-drop'); if(z)z.classList.remove('over'); }
function sa3iDropTask(e){
  e.preventDefault();
  var z=document.getElementById('sa3i-drop'); if(z)z.classList.remove('over');
  var id=dragTaskId;
  if(id==null&&e.dataTransfer){ try{ id=parseInt(e.dataTransfer.getData('text/plain')); }catch(_){} }
  if(id!=null&&!isNaN(id))loadTaskToTimer(id);   // الإفلات يضعها فقط — التشغيل بقرارك
}

// ==========================================================================
// ===== تقديرات الوقت «ينتهي الكل الساعة X» + وضع الانسياب (اختياريان) ======
// فكرة Llama Life: قدّر دقائق كل مهمة من مهام اليوم ⭐ فيظهر موعد انتهاء
// القائمة كلها لحظياً (علاج عمى الوقت) — والانسياب (NovaFocus) يسلسل مهام
// اليوم تلقائياً: جلسة ← راحة ← المهمة التالية، دون أي قرار بينها.
// كلاهما خلف مفتاح opt-in مُطفأ افتراضياً (S.settings.taskEta / flowMode).
// ==========================================================================
function taskEtaOn(){ if(!S.settings)S.settings={}; if(S.settings.taskEta==null)S.settings.taskEta=false; return !!S.settings.taskEta; }
function flowModeOn(){ if(!S.settings)S.settings={}; if(S.settings.flowMode==null)S.settings.flowMode=false; return !!S.settings.flowMode; }
function flowTasks(){ return (S.tasks||[]).filter(function(t){return t.today&&!t.done&&!t.archived;}); }

// دالة صِرفة (مُختبرة في tests/eta.test.js): مجموع التقديرات + الراحات المتخلّلة → لحظة الانتهاء
function taskEtaCompute(mins, nowMs, workMin, brkMin){
  mins=(mins||[]).map(function(m){return Math.max(0,+m||0);}).filter(function(m){return m>0;});
  if(!mins.length)return {n:0,totalMin:0,breaks:0,endMs:0};
  var total=mins.reduce(function(a,b){return a+b;},0);
  var sessions=Math.max(1,Math.ceil(total/Math.max(1,workMin||20)));
  var breaks=Math.max(0,sessions-1);
  return {n:mins.length,totalMin:total,breaks:breaks,endMs:nowMs+(total+breaks*Math.max(0,brkMin||0))*60000};
}

function sa3iFeatChange(){
  if(!S.settings)S.settings={};
  var a=document.getElementById('se-eta-chk'); if(a)S.settings.taskEta=!!a.checked;
  var b=document.getElementById('se-flow-chk'); if(b)S.settings.flowMode=!!b.checked;
  save(); renderSa3iTasks();   // يعيد رسم خانات التقدير + سطر الخطة
}

// ---- وضع الانسياب: تشغيل مهام اليوم ⭐ كسلسلة تلقائية ----
var flowActive=false;
function startFlow(){
  var l=flowTasks();
  if(!l.length){ notify('علّم مهمة واحدة على الأقل بنجمة «اليوم» ⭐ أولاً','star'); return; }
  flowActive=true;
  loadTaskToTimer(l[0].id);
  setTimeout(function(){ if(!isRunning)startTimer(); },200);
  notify('بدأ الانسياب — '+l.length+' '+(l.length===1?'مهمة':'مهام')+' بالتتابع 🌊','waves');
  renderSa3iEta();
}
function stopFlow(){ flowActive=false; renderSa3iEta(); notify('توقّف الانسياب — أنت القبطان','anchor'); }
function flowAdvance(){
  if(!flowActive)return;
  var l=flowTasks();
  if(!l.length){ flowActive=false; try{celebrate();}catch(e){} notifyDesktop('اكتمل الانسياب 🌊','أنجزت كل مهام اليوم — أحسنت صنعاً!'); renderSa3iEta(); return; }
  var i=l.findIndex(function(t){return t.id===currentTaskId;});
  var nxt=l[(i+1)%l.length]||l[0];                     // بالدور بين مهام اليوم؛ المنجزة تسقط تلقائياً
  if(nxt)loadTaskToTimer(nxt.id);
  renderSa3iEta();
}

// ---- سطر الخطة فوق بنك المهام: مفاتيح التفعيل + «ينتهي الكل ~» + زر الانسياب ----
function renderSa3iEta(){
  var el=document.getElementById('sa3i-eta'); if(!el)return;
  var etaOn=taskEtaOn(), flowOn=flowModeOn();
  var html='<div class="se-row">'+
    '<label title="قدّر دقائق كل مهمة فيظهر موعد انتهاء يومك"><input type="checkbox" id="se-eta-chk" '+(etaOn?'checked':'')+' onchange="sa3iFeatChange()"> ⏱ تقديرات الوقت</label>'+
    '<label title="تشغيل مهام اليوم ⭐ كسلسلة تلقائية بلا قرارات"><input type="checkbox" id="se-flow-chk" '+(flowOn?'checked':'')+' onchange="sa3iFeatChange()"> 🌊 وضع الانسياب</label>'+
  '</div>';
  if(etaOn){
    var l=flowTasks(), cfg=getSa3iCfg();
    if(!l.length){ html+='<div class="se-eta off">علّم مهام اليوم بنجمة ⭐ (حتى ٣) وقدّر دقائق كلٍّ منها — فيظهر هنا موعد انتهاء يومك كاملاً.</div>'; }
    else{
      var e=taskEtaCompute(l.map(function(t){return t.estMin||cfg.work;}),Date.now(),cfg.work,cfg.brk);
      var end=new Date(e.endMs),hh='';
      try{ hh=end.toLocaleTimeString('ar-EG',{hour:'numeric',minute:'2-digit'}); }catch(_){ hh=end.getHours()+':'+String(end.getMinutes()).padStart(2,'0'); }
      var noEst=l.filter(function(t){return !t.estMin;}).length;
      html+='<div class="se-eta"><i data-lucide="calendar-clock"></i> '+l.length.toLocaleString('ar-EG')+' '+(l.length===1?'مهمة':'مهام')+' · '+e.totalMin.toLocaleString('ar-EG')+' د'+(e.breaks?(' + '+e.breaks.toLocaleString('ar-EG')+' راحات'):'')+' ← ينتهي كل شيء نحو <b>'+hh+'</b>'+(noEst?(' <span class="se-hint">('+noEst.toLocaleString('ar-EG')+' بلا تقدير — حُسبت '+cfg.work.toLocaleString('ar-EG')+' د)</span>'):'')+'</div>';
    }
  }
  if(flowOn){
    html+='<div class="se-flow">'+
      (flowActive
        ? '<button class="btn sm" onclick="stopFlow()"><i data-lucide="square"></i> إيقاف الانسياب</button><span class="flowing">🌊 الانسياب جارٍ — جلسة ← راحة ← التالية تلقائياً</span>'
        : '<button class="btn sm pri" onclick="startFlow()"><i data-lucide="waves"></i> ابدأ الانسياب</button><span style="font-size:12px;color:var(--text3)">مهام اليوم ⭐ تتسلسل وحدها — قرارك الوحيد: البدء</span>')+
    '</div>';
  }
  el.innerHTML=html; icons();
}
