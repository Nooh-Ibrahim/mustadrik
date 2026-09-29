// profiles.js — تعدّد الملفات الشخصية (multi-profile) + الجولة التعريفية (onboarding)
// module — classic script. كل البيانات معزولة بـ activeProfileId (مخزن profiles + profileState + المجموعات).
// الملف الأساسي (isPrimary) محميّ — لا يُحذف. اسمه يختاره المستخدم في الجولة التعريفية.

var PROFILES=[], activeProfileName='';
// اسم المستخدم كما أدخله (قد يكون فارغاً إن تخطّى الجولة) — استخدم withName() لبناء عبارات النداء
function userName(){ return activeProfileName||''; }
// «أحسنت» + « يا فلان» إن وُجد اسم؛ وإلا العبارة وحدها — لا نفترض اسماً أبداً
function withName(phrase,sep){ var n=userName(); return n?(phrase+(sep==null?' يا ':sep)+n):phrase; }
function applyProfileName(){
  var sub=document.querySelector('.brand-sub'); if(sub)sub.textContent=userName()?('لوحة '+userName()):'رفيقك الهادئ';
  var tb=document.querySelector('.tb-title'); if(tb)tb.textContent=APP_NAME;
  try{ if(typeof renderHome==='function')renderHome(); }catch(e){}
}
function refreshProfiles(){
  if(typeof dbGetAll!=='function')return Promise.resolve();
  return dbGetAll('profiles').then(function(list){
    PROFILES=list||[];
    var me=PROFILES.find(function(p){return p.id===activeProfileId;});
    activeProfileName=(me&&me.name)|| (S&&S.profileName) ||'';
    applyProfileName(); renderProfiles();
  }).catch(function(){});
}
// ===== الصور الرمزية للملفات (avatars) — Blob في mediaBlobs، img-src يسمح بـ blob: =====
function avatarId(pid){ return 'pava-'+(pid||curProfileId()); }
function uploadAvatar(e,pid){
  var f=e.target&&e.target.files&&e.target.files[0]; if(!f)return;
  if(typeof mediaPut!=='function'){ notify('غير متاح هنا','x-circle'); return; }
  if(!/^image\//.test(f.type)){ notify('اختر صورة','x-circle'); return; }
  mediaPut({id:avatarId(pid),kind:'avatar',profileId:pid},f).then(function(){
    var p=PROFILES.find(function(x){return x.id===pid;}); if(p){ p.avatarId=avatarId(pid); if(typeof dbPut==='function')dbPut('profiles',p); }
    renderProfiles(); applyHubAvatar();
    notify('تم تعيين الصورة ✓','check-circle');
  }).catch(function(){ notify('تعذّر حفظ الصورة','x-circle'); });
}
function removeAvatar(pid){
  if(typeof mediaDelete==='function'){ try{ mediaDelete(avatarId(pid)); }catch(e){} }
  var p=PROFILES.find(function(x){return x.id===pid;}); if(p){ p.avatarId=null; if(typeof dbPut==='function')dbPut('profiles',p); }
  renderProfiles(); applyHubAvatar();
  notify('أُزيلت الصورة','info');
}
// رسم صورة الملف النشط في رأس المِنصّة (الحرف الأول إن لم توجد صورة)
function applyHubAvatar(){
  var el=document.getElementById('hub-ava'); if(!el)return;
  var nm=userName();
  el.classList.remove('has-img'); el.style.backgroundImage=''; el.textContent=(nm||'؟').slice(0,1);
  var p=PROFILES.find(function(x){return x.id===activeProfileId;});
  if(p&&p.avatarId&&typeof mediaURL==='function'){
    mediaURL(p.avatarId).then(function(url){ if(url){ el.classList.add('has-img'); el.style.backgroundImage='url('+url+')'; el.textContent=''; } }).catch(function(){});
  }
}
function renderProfiles(){
  var el=document.getElementById('profiles-list'); if(!el)return;
  applyHubAvatar();
  if(!PROFILES.length){ el.innerHTML='<div class="setting-sub">الملف الأساسي فقط</div>'; return; }
  el.innerHTML=PROFILES.sort(function(a,b){return (b.isPrimary?1:0)-(a.isPrimary?1:0)||a.createdAt-b.createdAt;}).map(function(p){
    var active=p.id===activeProfileId;
    return '<div class="profile-row'+(active?' active':'')+'">'+
      '<label class="profile-ava" id="pava-'+p.id+'" title="غيّر الصورة" style="cursor:pointer">'+esc((p.name||'؟').slice(0,1))+'<input type="file" accept="image/*" onchange="uploadAvatar(event,\''+p.id+'\')" style="display:none"></label>'+
      '<span class="profile-name">'+esc(p.name||'بلا اسم')+(p.isPrimary?' <span class="profile-tag">أساسي</span>':'')+(active?' <span class="profile-tag on">نشط</span>':'')+'</span>'+
      '<span class="profile-acts">'+
        (p.avatarId?'<button class="icon-btn" onclick="removeAvatar(\''+p.id+'\')" title="إزالة الصورة"><i data-lucide="image-off"></i></button>':'')+
        (active?'':'<button class="btn sm" onclick="switchProfile(\''+p.id+'\')"><i data-lucide="log-in"></i> تبديل</button>')+
        '<button class="icon-btn" onclick="renameProfile(\''+p.id+'\')" title="إعادة تسمية"><i data-lucide="pencil"></i></button>'+
        (p.isPrimary?'':'<button class="icon-btn" onclick="deleteProfile(\''+p.id+'\')" title="حذف"><i data-lucide="trash-2"></i></button>')+
      '</span></div>';
  }).join('');
  icons();
  // حمّل صور البروفايل غير المتزامنة داخل خلايا .profile-ava
  PROFILES.forEach(function(p){
    if(p.avatarId&&typeof mediaURL==='function'){
      mediaURL(p.avatarId).then(function(url){ var c=document.getElementById('pava-'+p.id); if(c&&url){ c.classList.add('has-img'); c.style.backgroundImage='url('+url+')'; c.childNodes[0]&&(c.childNodes[0].textContent=''); } }).catch(function(){});
    }
  });
}
function createProfile(){
  var inp=document.getElementById('new-profile-name'); var name=(inp&&inp.value||'').trim(); if(!name)return;
  if(typeof dbPut!=='function')return;
  var id='p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  dbPut('profiles',{id:id,name:name,isPrimary:false,createdAt:Date.now(),avatarId:null,coverId:null}).then(function(){
    if(inp)inp.value='';
    save();                                   // persist current profile before switching away
    activeProfileId=id; if(typeof metaSet==='function')metaSet('activeProfileId',id);
    loadProfileState(id,true);                // fresh state + onboarding
    refreshProfiles();
    notify('أُنشئ ملف «'+name+'» — أهلاً بك','user-plus');
  }).catch(function(){ notify('تعذّر إنشاء الملف','x-circle'); });
}
function switchProfile(id){
  if(id===activeProfileId)return;
  save();
  activeProfileId=id; if(typeof metaSet==='function')metaSet('activeProfileId',id);
  loadProfileState(id,false);
  refreshProfiles();
}
// clean REPLACE of S for the target profile (never merge — avoids cross-profile leakage)
function loadProfileState(id,isNew){
  function apply(state){
    S=state; if(typeof migrate==='function')migrate(S);
    document.body.className=S.theme; if(S.dark)document.body.classList.add('dark');
    if(typeof updateDarkBtn==='function')updateDarkBtn();
    if(typeof renderThemeDots==='function')renderThemeDots();
    if(typeof applyBgColor==='function')applyBgColor();
    if(typeof refreshAll==='function')refreshAll();
    if(typeof renderSa3iSettings==='function')renderSa3iSettings();
    if(typeof applyLogo==='function')applyLogo();
    if(typeof renderDumpInbox==='function')renderDumpInbox();
    if(typeof renderNotes==='function')renderNotes();
    if(typeof renderSettingsPage==='function')renderSettingsPage();
    applyProfileName(); save();
    if(!S.onboarded&&typeof startOnboarding==='function')setTimeout(startOnboarding,400);
  }
  if(isNew){ var ns=freshState(); ns.onboarded=false; apply(ns); return; }
  if(typeof dbGet!=='function'){ apply(freshState()); return; }
  dbGet('profileState',id).then(function(rec){ apply(rec&&rec.state?rec.state:(function(){var f=freshState();f.onboarded=false;return f;})()); }).catch(function(){ apply(freshState()); });
}
function renameProfile(id){
  var p=PROFILES.find(function(x){return x.id===id;}); if(!p)return;
  // إصلاح: prompt() لا يعمل في Electron (كان لا يُظهر شيئاً) → نافذة الإدخال المخصّصة
  openInputDialog({title:'إعادة تسمية الملف',sub:'اكتب الاسم الجديد للملف الشخصي',value:p.name||'',placeholder:'اسم الملف',confirmText:'حفظ',onOk:function(nv){
    nv=(nv||'').trim(); if(!nv)return;
    p.name=nv; try{dbPut('profiles',p);}catch(e){}
    if(id===activeProfileId){ S.profileName=nv; save(); }
    refreshProfiles();
    notify('تمت إعادة التسمية ✓','check-circle');
  }});
}
function deleteProfile(id){
  var p=PROFILES.find(function(x){return x.id===id;}); if(!p||p.isPrimary)return;
  askConfirm('حذف ملف «'+(p.name||'')+'» وكل بياناته؟ لا يمكن التراجع.',function(){
    // remove profile-scoped records across the stores, then the state + profile entry
    ['brainDump','notes','sessions','mediaBlobs','tasks','habits','grades'].forEach(function(store){
      try{ dbGetAll(store).then(function(rows){ (rows||[]).forEach(function(r){ if(r&&r.profileId===id&&typeof dbDelete==='function')dbDelete(store,r.id); }); }); }catch(e){}
    });
    if(typeof dbDelete==='function'){ dbDelete('profileState',id); dbDelete('profiles',id); }
    var primary=(PROFILES.find(function(x){return x.isPrimary;})||{}).id||PRIMARY_PROFILE_ID;
    if(id===activeProfileId){ activeProfileId=primary; if(typeof metaSet==='function')metaSet('activeProfileId',primary); loadProfileState(primary,false); }
    refreshProfiles(); notify('حُذف الملف','trash-2');
  },{confirmText:'نعم، احذف',danger:true});
}

// ===== ONBOARDING WIZARD (gentle, calm, short) =====
// يظهر لأي ملف جديد (S.onboarded=false) — ومنه أول تشغيل على جهاز جديد. كل خطوة قابلة للتخطّي.
var obStep=0, obState=null;
// مجموعات المزايا التي يمكن إخفاؤها من البداية (المعرّفات = معرّفات settings.hidden المعتمدة في migrate)
var OB_FEATURES=[
  {key:'worship', ids:['praytrack','quran','qiyam','prayerbar'], icon:'moon',     label:'العبادات',   sub:'الصلاة وتذكيرها، القرآن، قيام الليل'},
  {key:'sport',   ids:['sport'],                                 icon:'dumbbell', label:'الرياضة',    sub:'سجلّ تمارين بسيط'},
  {key:'xp',      ids:['xp'],                                    icon:'map',      label:'رحلة السعي', sub:'درجات ومستويات تكافئ المداومة'}
];
function startOnboarding(){
  obStep=0;
  var hidden=(S.settings&&Array.isArray(S.settings.hidden))?S.settings.hidden:[];
  var feats={}; OB_FEATURES.forEach(function(f){ feats[f.key]=!f.ids.every(function(id){return hidden.indexOf(id)>=0;}); });
  obState={ name:(S.profileName||activeProfileName||''), theme:S.theme||'t-terracotta', feats:feats,
            city:(S.settings&&S.settings.city)||'', country:(S.settings&&S.settings.country)||'',
            method:(S.settings&&S.settings.methodChosen&&S.settings.method)||0 };
  var ov=document.getElementById('onboard-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='onboard-overlay'; ov.className='onboard-overlay'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); document.body.appendChild(ov); }
  obRender(); ov.classList.add('show');
}
function closeOnboarding(){ var ov=document.getElementById('onboard-overlay'); if(ov)ov.classList.remove('show'); }
var OB_STEPS=[
  {id:'hello', icon:'sparkles',title:'أهلاً بك في «'+APP_NAME+'»',body:'<p>رفيقُك الهادئ للعبادة والدراسة والإنجاز. فلسفتنا بسيطة:</p><div class="ob-philo"><div><b>الهدوء افتراضي</b><span>والقوة عند الطلب</span></div><div><b>🕌 الغاية</b><span>عبادتك وقربك</span></div><div><b>🛡️ الثغر</b><span>دراستك وإنتاجك</span></div></div><p class="ob-soft">بياناتك تبقى على جهازك فقط — لا حساب ولا خادم. خطوة صغيرة كل يوم… تكفي.</p>'},
  {id:'name',  icon:'user',title:'بمَ نناديك؟',body:'<input id="ob-name" class="ob-input" placeholder="اسمك (اختياري)..." maxlength="24" aria-label="اسمك">'},
  {id:'theme', icon:'palette',title:'اختر لونك',body:'<div class="ob-themes" id="ob-themes"></div><p class="ob-soft">يمكنك تغييره متى شئت من «الضبط».</p>'},
  {id:'feats', icon:'layout-grid',title:'ماذا تريد أن ترى؟',body:'<p class="ob-soft">الدراسة والمهام والعادات أساسية دائماً. اختر ما تحتاجه أيضاً — ويمكنك تغييره لاحقاً من «الضبط».</p><div class="ob-feats" id="ob-feats"></div>'},
  {id:'prayer',icon:'sun',title:'مواقيت الصلاة (اختياري)',body:'<p class="ob-soft">أدخل مدينتك ودولتك لجلب المواقيت تلقائياً من الإنترنت — أو تجاوز الخطوة وأضِفها لاحقاً.</p><div class="ob-row"><input id="ob-city" class="ob-input" placeholder="المدينة (مثلاً: Cairo)" aria-label="المدينة"><input id="ob-country" class="ob-input" placeholder="الدولة (مثلاً: Egypt)" aria-label="الدولة" oninput="obCountryChanged()"></div><label class="ob-lbl" for="ob-method">طريقة الحساب</label><select id="ob-method" class="ob-input" onchange="obState.method=parseInt(this.value,10)||0"></select>'},
  {id:'done',  icon:'rocket',title:'كل شيء جاهز 🌿',body:'<p>تذكّر:</p><ul class="ob-tips"><li><b>Ctrl + K</b> — لوحة الأوامر والبحث الشامل في أي لحظة.</li><li><b>Shift + ?</b> — كل اختصارات لوحة المفاتيح.</li><li><b>التفريغ الذهني</b> — فرّغ ما يشغلك ثم فرّزه لاحقاً.</li><li>كل صفحة تكشف خياراتها <b>عند الطلب</b> فقط.</li></ul>'}
];
// خطوة الصلاة تُتخطّى إن أخفى المستخدم العبادات
function obStepSkipped(i){ return OB_STEPS[i].id==='prayer'&&obState&&obState.feats&&obState.feats.worship===false; }
function obRender(){
  var ov=document.getElementById('onboard-overlay'); if(!ov)return;
  var s=OB_STEPS[obStep], last=obStep===OB_STEPS.length-1;
  ov.innerHTML='<div class="onboard-box">'+
    '<div class="ob-dots">'+OB_STEPS.map(function(_,i){return '<span class="ob-dot'+(i===obStep?' on':'')+(i<obStep?' done':'')+'"></span>';}).join('')+'</div>'+
    '<div class="ob-icon"><i data-lucide="'+s.icon+'"></i></div>'+
    '<div class="ob-title">'+s.title+'</div>'+
    '<div class="ob-body">'+s.body+'</div>'+
    '<div class="ob-actions">'+
      (obStep>0?'<button class="btn" onclick="obPrev()"><i data-lucide="chevron-right"></i> السابق</button>':'<span></span>')+
      (last?'<button class="btn pri" onclick="obFinish()"><i data-lucide="check"></i> لنبدأ</button>'
           :'<button class="btn pri" onclick="obNext()">التالي <i data-lucide="chevron-left"></i></button>')+
    '</div></div>';
  if(s.id==='name'){ var n=document.getElementById('ob-name'); if(n){n.value=obState.name||''; setTimeout(function(){n.focus();},40);} }
  if(s.id==='theme'){ var t=document.getElementById('ob-themes'); if(t)t.innerHTML=THEMES.map(function(th){return '<button type="button" class="ob-theme'+(obState.theme===th.id?' sel':'')+'" style="background:'+th.c+'" aria-label="'+th.id.replace('t-','')+'" onclick="obPickTheme(\''+th.id+'\')"></button>';}).join(''); }
  if(s.id==='feats'){ var fe=document.getElementById('ob-feats'); if(fe)fe.innerHTML=OB_FEATURES.map(function(f){
      return '<label class="ob-feat"><input type="checkbox"'+(obState.feats[f.key]?' checked':'')+' onchange="obState.feats[\''+f.key+'\']=this.checked"><i data-lucide="'+f.icon+'"></i><span><b>'+f.label+'</b><small>'+f.sub+'</small></span></label>';
    }).join(''); }
  if(s.id==='prayer'){
    var c=document.getElementById('ob-city'),co=document.getElementById('ob-country'),m=document.getElementById('ob-method');
    if(c)c.value=obState.city||''; if(co)co.value=obState.country||'';
    if(m){ var mv=obState.method||methodForCountry(obState.country); m.innerHTML=prayerMethodOptions(mv); m.value=mv; }
  }
  icons();
}
// اقتراح طريقة الحساب تلقائياً من الدولة — ما لم يخترها المستخدم يدوياً
function obCountryChanged(){
  var co=document.getElementById('ob-country'), m=document.getElementById('ob-method'); if(!co||!m)return;
  if(!obState.method){ m.value=methodForCountry(co.value); }
}
function obCapture(){
  var s=OB_STEPS[obStep]; if(!s)return;
  if(s.id==='name'){ var n=document.getElementById('ob-name'); if(n)obState.name=n.value.trim(); }
  if(s.id==='prayer'){
    var c=document.getElementById('ob-city'),co=document.getElementById('ob-country'),m=document.getElementById('ob-method');
    if(c)obState.city=c.value.trim(); if(co)obState.country=co.value.trim();
    if(m)obState.pickedMethod=parseInt(m.value,10)||0;
  }
}
function obPickTheme(id){ obState.theme=id; document.body.className=id; if(S.dark)document.body.classList.add('dark'); obRender(); }
function obNext(){ obCapture(); var i=obStep+1; while(i<OB_STEPS.length-1&&obStepSkipped(i))i++; if(i<OB_STEPS.length){ obStep=i; obRender(); } }
function obPrev(){ obCapture(); var i=obStep-1; while(i>0&&obStepSkipped(i))i--; if(i>=0){ obStep=i; obRender(); } }
function obFinish(){
  obCapture();
  var name=(obState.name||'').trim();
  if(name){ S.profileName=name; activeProfileName=name; var p=PROFILES.find(function(x){return x.id===activeProfileId;}); if(p){p.name=name; if(typeof dbPut==='function')dbPut('profiles',p);} }
  S.theme=obState.theme||'t-terracotta'; document.body.className=S.theme; if(S.dark)document.body.classList.add('dark');
  if(!S.settings)S.settings={};
  // المزايا: أضف/أزل معرّفات كل مجموعة من settings.hidden (بلا لمس ما أخفاه المستخدم سابقاً من غيرها)
  var hidden=Array.isArray(S.settings.hidden)?S.settings.hidden.slice():[];
  OB_FEATURES.forEach(function(f){
    f.ids.forEach(function(id){ var at=hidden.indexOf(id); if(obState.feats[f.key]===false){ if(at<0)hidden.push(id); } else if(at>=0){ hidden.splice(at,1); } });
  });
  S.settings.hidden=hidden;
  if(obState.feats.worship!==false){
    if(obState.city)S.settings.city=obState.city; if(obState.country)S.settings.country=obState.country;
    if(obState.pickedMethod){ S.settings.method=obState.pickedMethod; S.settings.methodChosen=true; S.settings.lastFetchAt=0; }
  }
  S.onboarded=true; save();
  if(typeof applyFeatureVisibility==='function'){ try{applyFeatureVisibility();}catch(e){} }
  if(typeof renderThemeDots==='function')renderThemeDots();
  applyProfileName(); if(typeof renderTopNav==='function')renderTopNav(); if(typeof refreshAll==='function')refreshAll(); if(typeof renderSettingsPage==='function')renderSettingsPage(); if(typeof renderProfiles==='function')renderProfiles();
  closeOnboarding();
  notify(withName('أهلاً',' ')+' — لنبدأ 🌿','sparkles');
  if(obState.feats.worship!==false&&S.settings.city&&S.settings.country&&S.settings.autoFetch&&typeof fetchPrayerTimes==='function'){ try{fetchPrayerTimes(true);}catch(e){} }
}
