// backup.js — المرحلة 8: لقطات مؤرّخة (Snapshots / تاريخ نسخ) + مجلد نسخ مخصّص (مزامنة Drive عبر مجلد مُزامَن)
// module — classic script. اللقطات في مخزن IndexedDB `snapshots` (موجود منذ المرحلة 0). آمن CSP بالكامل.

function snapProfile(){ return curProfileId(); }
function snapDayKey(ts){ var d=new Date(ts); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }

// create a point-in-time snapshot of the current profile state
function createSnapshot(label,kind){
  if(typeof dbPut!=='function'||typeof dbReady!=='function'||!dbReady())return Promise.resolve();
  var json=JSON.stringify(S);
  var rec={ ts:Date.now(), label:label||('لقطة '+new Date().toLocaleString('ar-EG')), json:json, size:json.length, profileId:snapProfile(), kind:kind||'user' };
  return dbPut('snapshots',rec).then(function(){ return pruneSnapshots(); }).catch(function(){});
}
function pruneSnapshots(){
  if(typeof dbGetAll!=='function')return Promise.resolve();
  return dbGetAll('snapshots').then(function(list){
    var mine=(list||[]).filter(function(s){return s.profileId===snapProfile()&&(s.kind==='user'||s.kind==='auto'||s.kind==='sync');}).sort(function(a,b){return b.ts-a.ts;});
    mine.slice(20).forEach(function(s){ if(typeof dbDelete==='function')dbDelete('snapshots',s.id); });  // keep newest 20 per profile
  }).catch(function(){});
}
function snapshotNow(){ createSnapshot(null,'user').then(function(){ renderSnapshots(); notify('حُفظت لقطة لحالتك الآن ✓','camera'); }); }
// one automatic snapshot per day (restore-point safety net)
function maybeAutoSnapshot(){
  if(typeof dbGetAll!=='function'||typeof dbReady!=='function'||!dbReady())return;
  dbGetAll('snapshots').then(function(list){
    var today=snapDayKey(Date.now());
    var has=(list||[]).some(function(s){return s.profileId===snapProfile()&&s.kind==='auto'&&snapDayKey(s.ts)===today;});
    if(!has)createSnapshot('تلقائية — '+today,'auto');
  }).catch(function(){});
}
function renderSnapshots(){
  var el=document.getElementById('snapshots-list'); if(!el)return;
  if(typeof dbGetAll!=='function'||typeof dbReady!=='function'||!dbReady()){ el.innerHTML='<div class="setting-sub">غير متاح</div>'; return; }
  dbGetAll('snapshots').then(function(list){
    list=(list||[]).filter(function(s){return s.profileId===snapProfile()&&(s.kind==='user'||s.kind==='auto'||s.kind==='sync');}).sort(function(a,b){return b.ts-a.ts;}).slice(0,20);
    if(!list.length){ el.innerHTML='<div class="setting-sub">لا لقطات بعد — أنشئ أول لقطة لحالتك</div>'; return; }
    el.innerHTML=list.map(function(s){
      var d=new Date(s.ts);
      return '<div class="snap-row"><span class="snap-icon"><i data-lucide="'+(s.kind==='auto'?'history':'camera')+'"></i></span>'+
        '<span class="snap-main"><span class="snap-label">'+esc(s.label||'لقطة')+'</span>'+
        '<span class="snap-meta">'+d.toLocaleDateString('ar-EG',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})+' · '+Math.max(1,Math.round((s.size||0)/1024))+'KB</span></span>'+
        '<span class="snap-acts"><button class="btn sm" onclick="restoreSnapshot('+s.id+')"><i data-lucide="history"></i> استعادة</button>'+
        '<button class="icon-btn" onclick="deleteSnapshot('+s.id+')" title="حذف"><i data-lucide="trash-2"></i></button></span></div>';
    }).join(''); icons();
  }).catch(function(){});
}
function restoreSnapshot(id){
  askConfirm('استعادة هذه اللقطة؟ ستحل محل بياناتك الحالية في هذا الملف.',function(){
    dbGet('snapshots',id).then(function(s){
      if(!s||!s.json){ notify('اللقطة غير موجودة','x-circle'); return; }
      try{
        var obj=JSON.parse(s.json); S=Object.assign(freshState(),obj); migrate(S); save();
        document.body.className=S.theme; document.body.classList.toggle('dark',!!S.dark);
        updateDarkBtn(); renderThemeDots(); if(typeof applyBgColor==='function')applyBgColor(); refreshAll();
        if(typeof renderSa3iSettings==='function')renderSa3iSettings();
        if(typeof applyLogo==='function')applyLogo();
        if(typeof renderSettingsPage==='function')renderSettingsPage();
        notify('تمت الاستعادة من اللقطة ✓','shield-check');
      }catch(e){ notify('اللقطة تالفة','x-circle'); }
    }).catch(function(){ notify('تعذّرت الاستعادة','x-circle'); });
  },{confirmText:'نعم، استعد',danger:false});
}
function deleteSnapshot(id){ if(typeof dbDelete==='function')dbDelete('snapshots',id).then(function(){ renderSnapshots(); }).catch(function(){}); }

// ===== custom backup folder (point it at a Google Drive / OneDrive / Dropbox synced folder) =====
function renderBackupFolder(){
  var el=document.getElementById('backup-folder'); if(!el)return;
  if(!(window.noahAPI&&window.noahAPI.getBackupFolder)){ el.textContent='متاح في تطبيق سطح المكتب فقط'; return; }
  window.noahAPI.getBackupFolder().then(function(r){ el.textContent=(r&&r.folder)?r.folder:'(المجلد الافتراضي)'; el.title=el.textContent; }).catch(function(){});
}
function chooseBackupFolder(){
  if(!(window.noahAPI&&window.noahAPI.chooseBackupFolder)){ notify('متاح في تطبيق سطح المكتب فقط','info'); return; }
  window.noahAPI.chooseBackupFolder().then(function(r){
    if(r&&r.ok){ renderBackupFolder(); notify('سيُحفظ النسخ في المجلد المختار ✓','folder-check'); }
    else if(r&&!r.canceled)notify('تعذّر تعيين المجلد','x-circle');
  }).catch(function(){ notify('تعذّر تعيين المجلد','x-circle'); });
}
