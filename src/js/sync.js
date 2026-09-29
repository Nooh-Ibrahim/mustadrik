// sync.js — ⑧ مزامنة تلقائية ثنائية عبر «مجلد مُزامَن» (Drive/OneDrive) — خاصّة بلا حساب ولا خادم.
// classic script (globals shared, no ES modules). تكتب أحدث نسخة في noah-live.json داخل مجلد النسخ،
// وعميل المزامنة في النظام يرفعها/ينزّلها بين أجهزتك. عند الفتح تسحب الأحدث (آخر كاتب يفوز).
// هويّة الجهاز والطابع الزمني محلّيان (localStorage) فلا يُزامَنان — كي تعرف نسختك من نسخة الجهاز الآخر.

function syncDeviceId(){
  var v=null; try{ v=localStorage.getItem(LS_DEVICE_ID_KEY); }catch(e){}
  if(!v){ v='dev_'+Math.random().toString(36).slice(2,10); try{localStorage.setItem(LS_DEVICE_ID_KEY,v);}catch(e){} }
  return v;
}
function syncStamp(){ var v=0; try{ v=parseInt(localStorage.getItem(LS_SYNC_STAMP_KEY),10)||0; }catch(e){} return v; }
function setSyncStamp(t){ try{ localStorage.setItem(LS_SYNC_STAMP_KEY,String(t)); }catch(e){} }
function syncEnabled(){ if(!S.settings)S.settings={}; return !!S.settings.autoSync; }   // التفضيل يُزامَن (الجهازان يريدانها)
function cheapHash(str){ var h=0; for(var i=0;i<str.length;i++){ h=(h*31+str.charCodeAt(i))|0; } return h; }

var _lastPushHash=null;
// يكتب الحالة لمجلد المزامنة فقط عند تغيّرها فعلاً (يتجنّب كتابة لا داعي لها)
function autoSyncMaybePush(){
  if(!syncEnabled()||!(window.noahAPI&&window.noahAPI.syncWrite))return;
  var json=JSON.stringify(S), hash=cheapHash(json);
  if(hash===_lastPushHash)return;
  var now=Date.now();
  var payload=JSON.stringify({ v:1, updatedAt:now, device:syncDeviceId(),
    name:(typeof userName==='function'?userName():''), data:json });
  window.noahAPI.syncWrite(payload).then(function(r){
    if(r&&r.ok){ _lastPushHash=hash; setSyncStamp(now); }
  }).catch(function(){});
}
// عند الفتح: اقرأ الملف الحيّ؛ إن كان من جهاز آخر وأحدث ممّا نعرف، اعرض تحميله
function autoSyncPullCheck(){
  if(!syncEnabled()||!(window.noahAPI&&window.noahAPI.syncRead))return;
  window.noahAPI.syncRead().then(function(r){
    if(!r||!r.ok||!r.content)return;
    var remote; try{ remote=JSON.parse(r.content); }catch(e){ return; }
    if(!remote||!remote.data)return;
    if(remote.device===syncDeviceId())return;                 // نسختنا نحن — تجاهل
    if((remote.updatedAt||0)<=syncStamp())return;             // ليست أحدث ممّا نعرف
    askConfirm('وجدت نسخة أحدث على المزامنة'+(remote.name?(' (من: '+remote.name+')'):'')+
      ' بتاريخ '+new Date(remote.updatedAt).toLocaleString('ar-EG')+'. تحميلها فوق بياناتك الحالية على هذا الجهاز؟',
      function(){ applySyncedData(remote); },
      {confirmText:'نعم، حمّل الأحدث',danger:false});
  }).catch(function(){});
}
function applySyncedData(remote){
  try{
    var obj=JSON.parse(remote.data);
    if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('bad sync payload');
    if(typeof sanitizeState==='function')sanitizeState(obj);
    // 🛡️ احفظ لقطة لحالتك الحالية قبل الكتابة فوقها — فأي سحبة مزامنة خاطئة قابلة للتراجع (تظهر في «اللقطات»)
    if(typeof createSnapshot==='function')createSnapshot('قبل سحب مزامنة — '+new Date().toLocaleString('ar-EG'),'sync');
    S=Object.assign(freshState(),obj); if(typeof migrate==='function')migrate(S);
    setSyncStamp(remote.updatedAt||Date.now());
    _lastPushHash=cheapHash(JSON.stringify(S));   // لا تُعِد دفع ما سحبته للتوّ
    save();
    document.body.className=S.theme; document.body.classList.toggle('dark',!!S.dark);
    if(typeof updateDarkBtn==='function')updateDarkBtn();
    if(typeof renderThemeDots==='function')renderThemeDots();
    if(typeof applyBgColor==='function')applyBgColor();
    if(typeof refreshAll==='function')refreshAll();
    if(typeof renderSettingsPage==='function')renderSettingsPage();
    if(typeof notify==='function')notify('تمت المزامنة — حُمِّلت أحدث نسخة ✓','refresh-cw');
  }catch(e){ if(typeof notify==='function')notify('تعذّرت المزامنة','x-circle'); }
}

// إعدادات (مفتاح في بطاقة البيانات والنسخ)
function renderSyncSettings(){ var c=document.getElementById('autosync-chk'); if(c)c.checked=syncEnabled(); }
function toggleAutoSync(){
  if(!S.settings)S.settings={};
  var c=document.getElementById('autosync-chk');
  S.settings.autoSync=c?!!c.checked:!S.settings.autoSync;
  save();
  if(S.settings.autoSync){
    if(!(window.noahAPI&&window.noahAPI.syncWrite)){ if(typeof notify==='function')notify('المزامنة بمجلد متاحة في تطبيق سطح المكتب فقط','info'); }
    else { if(typeof notify==='function')notify('فُعّلت المزامنة التلقائية ✓','refresh-cw'); autoSyncMaybePush(); autoSyncPullCheck(); }
  }else if(typeof notify==='function')notify('أُوقفت المزامنة التلقائية','info');
}
