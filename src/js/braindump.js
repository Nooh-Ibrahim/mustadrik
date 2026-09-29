// braindump.js — صندوق التفريغ الذهني: التقاط بلا احتكاك + فرز بالسحب والإفلات
// module — classic script (globals shared, no ES modules). Items live in IndexedDB store `brainDump`.
// التقاط سريع → فرز لاحق: كل عنصر يُسحب إلى «بنك المهام» (يتحوّل لمهمة) أو «سلة المهملات» (حذف مع تراجُع).

var dragDumpId=null, lastDeletedDump=null, dumpUndoTimer=null;
function dumpProfile(){ return curProfileId(); }

// ---- capture ----
function addDump(){
  var inp=document.getElementById('dump-input'); if(!inp)return;
  var txt=(inp.value||'').trim(); if(!txt)return;
  var rec={ id:'bd_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), profileId:dumpProfile(),
            text:txt, createdAt:Date.now(), processed:false };
  if(typeof dbReady==='function'&&dbReady()){ try{ dbPut('brainDump',rec).then(renderDumpInbox); }catch(e){ renderDumpInbox(); } }
  inp.value=''; inp.focus();
  notify('أُلتقِطت الفكرة — فرّزها لاحقاً','inbox');
}

// ---- render the unprocessed inbox (async, like the session log) ----
function renderDumpInbox(){
  var el=document.getElementById('dump-inbox'); if(!el)return;
  var me=dumpProfile();
  function paint(list){
    list=(list||[]).filter(function(d){return d.profileId===me&&!d.processed;}).sort(function(a,b){return b.createdAt-a.createdAt;});
    var badge=document.getElementById('dump-count'); if(badge)badge.textContent=list.length;
    if(!list.length){ el.innerHTML='<div class="empty" style="padding:1.5rem 1rem"><i data-lucide="wind"></i><div>الصندوق فارغ — اكتب أي فكرة عابرة بالأعلى ثم فرّزها متى شئت</div></div>'; icons(); return; }
    el.innerHTML=list.map(function(d){
      var isAudio=d.type==='audio';
      var acts=isAudio
        ? '<button class="btn sm" onclick="playVoiceDump(\''+(d.audioId||'')+'\')" title="تشغيل"><i data-lucide="play"></i></button>'+
          '<button class="icon-btn" onclick="downloadVoiceDump(\''+(d.audioId||'')+'\','+(d.dur||0)+')" title="تحميل التسجيل"><i data-lucide="download"></i></button>'+
          '<button class="icon-btn" onclick="dumpDelete(\''+d.id+'\')" title="حذف"><i data-lucide="trash-2"></i></button>'
        : '<button class="btn sm" onclick="dumpToTask(\''+d.id+'\')" title="حوّل إلى مهمة"><i data-lucide="check-square"></i></button>'+
          '<button class="icon-btn" onclick="dumpDelete(\''+d.id+'\')" title="حذف"><i data-lucide="trash-2"></i></button>';
      return '<div class="dump-card'+(isAudio?' is-audio':'')+'" draggable="true" data-id="'+d.id+'" ondragstart="dumpDragStart(event,\''+d.id+'\')" ondragend="dumpDragEnd(event)">'+
        '<span class="dump-grip" title="اسحب للفرز"><i data-lucide="'+(isAudio?'mic':'grip-vertical')+'"></i></span>'+
        '<div class="dump-text">'+esc(d.text)+'</div>'+
        '<div class="dump-acts">'+acts+'</div></div>';
    }).join(''); icons();
  }
  if(typeof dbGetAll==='function'&&typeof dbReady==='function'&&dbReady()){ dbGetAll('brainDump').then(paint).catch(function(){paint([]);}); }
  else paint([]);
}

// ---- drag & drop triage ----
function dumpDragStart(e,id){ dragDumpId=id; if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',id);}catch(_){} } if(e.currentTarget)e.currentTarget.classList.add('dragging'); }
function dumpDragEnd(e){ if(e.currentTarget)e.currentTarget.classList.remove('dragging'); document.querySelectorAll('.dump-zone.over').forEach(function(z){z.classList.remove('over');}); dragDumpId=null; }
function dumpZoneOver(e){ e.preventDefault(); if(e.dataTransfer)e.dataTransfer.dropEffect='move'; if(e.currentTarget)e.currentTarget.classList.add('over'); }
function dumpZoneLeave(e){ if(e.currentTarget)e.currentTarget.classList.remove('over'); }
function dumpZoneDrop(e,which){
  e.preventDefault(); if(e.currentTarget)e.currentTarget.classList.remove('over');
  var id=dragDumpId; if(id==null&&e.dataTransfer){ try{id=e.dataTransfer.getData('text/plain');}catch(_){} }
  if(!id)return;
  if(which==='task')dumpToTask(id); else dumpDelete(id);
}

// ---- convert a captured thought into a real task (non-destructive) ----
function dumpToTask(id){
  if(typeof dbGet!=='function'){ return; }
  dbGet('brainDump',id).then(function(rec){
    if(!rec)return;
    var firstSubj=(typeof courseActive==='function'?courseActive()[0]:Object.keys(S.subjects||{})[0])||'gen';
    S.tasks.unshift({
      id:Date.now(), text:rec.text, subject:firstSubj, category:'تفريغ',
      priority:'mid', pomo:1, actualSessions:0, deadline:'', repeat:'none',
      lastReset:todayKey(), today:false, archived:false, done:false, steps:[], expanded:false
    });
    save();
    if(typeof dbDelete==='function')dbDelete('brainDump',id);
    if(rec.type==='audio'&&rec.audioId&&typeof mediaDelete==='function'){ try{ mediaDelete(rec.audioId); }catch(e){} }   // consumed → free the audio blob
    renderDumpInbox(); if(typeof renderTasks==='function')renderTasks(); if(typeof updateStats==='function')updateStats();
    notify('تحوّلت إلى مهمة في بنك المهام ✓','check-square');
  }).catch(function(){});
}

// ---- delete with an Undo toast (kinder than a confirm dialog) ----
function dumpDelete(id){
  if(typeof dbGet!=='function'){ return; }
  dbGet('brainDump',id).then(function(rec){
    if(!rec)return;
    lastDeletedDump=rec;
    if(typeof dbDelete==='function')dbDelete('brainDump',id);
    renderDumpInbox();
    showDumpUndo('حُذفت الفكرة');
  }).catch(function(){});
}
function dumpUndo(){
  if(!lastDeletedDump)return;
  var rec=lastDeletedDump; lastDeletedDump=null;
  if(typeof dbPut==='function'){ try{ dbPut('brainDump',rec).then(renderDumpInbox); }catch(e){ renderDumpInbox(); } }
  hideDumpUndo();
}
function showDumpUndo(msg){
  var t=document.getElementById('dump-undo');
  if(!t){
    t=document.createElement('div'); t.id='dump-undo'; t.className='undo-toast';
    t.innerHTML='<span id="dump-undo-msg"></span><button class="undo-btn" onclick="dumpUndo()"><i data-lucide="rotate-ccw"></i> تراجع</button>';
    document.body.appendChild(t);
  }
  var m=document.getElementById('dump-undo-msg'); if(m)m.textContent=msg;
  icons(); t.classList.add('show');
  clearTimeout(dumpUndoTimer); dumpUndoTimer=setTimeout(hideDumpUndo,5000);
}
function hideDumpUndo(){ var t=document.getElementById('dump-undo'); if(t)t.classList.remove('show'); clearTimeout(dumpUndoTimer); lastDeletedDump=null; }

// ===== voice brain dump (record → mediaBlobs; playback via WebAudio decodeAudioData — no blob: URL, CSP-safe) =====
var mediaRec=null, recChunks=[], recStartTs=0;
function dumpVoiceToggle(){ if(mediaRec&&mediaRec.state==='recording'){ stopVoiceDump(); } else { startVoiceDump(); } }
function startVoiceDump(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined'){ notify('التسجيل الصوتي غير متاح في هذه البيئة','mic-off'); return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    recChunks=[];
    try{ mediaRec=new MediaRecorder(stream); }catch(e){ notify('تعذّر بدء التسجيل','mic-off'); stream.getTracks().forEach(function(t){t.stop();}); return; }
    mediaRec.ondataavailable=function(e){ if(e.data&&e.data.size)recChunks.push(e.data); };
    mediaRec.onstop=function(){ stream.getTracks().forEach(function(t){t.stop();}); saveVoiceDump(); updateVoiceBtn(false); };
    mediaRec.start(); recStartTs=Date.now(); updateVoiceBtn(true);
  }).catch(function(){ notify('تعذّر الوصول للميكروفون — تحقّق من الإذن','mic-off'); });
}
function stopVoiceDump(){ if(mediaRec&&mediaRec.state==='recording')mediaRec.stop(); }
function saveVoiceDump(){
  if(!recChunks.length){ return; }
  var blob=new Blob(recChunks,{type:(mediaRec&&mediaRec.mimeType)||'audio/webm'});
  var dur=Math.max(1,Math.round((Date.now()-recStartTs)/1000));
  var aid='bdaud_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  if(typeof mediaPut!=='function'){ notify('تعذّر حفظ التسجيل','x-circle'); return; }
  mediaPut({id:aid,kind:'braindump',profileId:dumpProfile()},blob).then(function(){
    var rec={ id:'bd_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), profileId:dumpProfile(),
      type:'audio', audioId:aid, dur:dur, text:'🎙️ تسجيل صوتي ('+dur+' ث)', createdAt:Date.now(), processed:false };
    try{ dbPut('brainDump',rec).then(renderDumpInbox); }catch(e){ renderDumpInbox(); }
    notify('حُفظ التسجيل — فرّزه لاحقاً','mic');
  }).catch(function(){ notify('تعذّر حفظ التسجيل','x-circle'); });
}
function updateVoiceBtn(recording){
  var b=document.getElementById('dump-voice-btn'); if(!b)return;
  b.classList.toggle('recording',recording);
  b.innerHTML=recording?'<i data-lucide="square"></i> إيقاف التسجيل':'<i data-lucide="mic"></i> تسجيل صوتي';
  icons();
}
function playVoiceDump(aid){
  if(!aid||typeof mediaGet!=='function')return;
  mediaGet(aid).then(function(r){
    if(!r||!r.blob){ notify('التسجيل غير موجود','x-circle'); return; }
    var fr=new FileReader();
    fr.onload=function(){
      try{
        var ctx=new(window.AudioContext||window.webkitAudioContext)();
        ctx.decodeAudioData(fr.result,function(buf){ var src=ctx.createBufferSource(); src.buffer=buf; src.connect(ctx.destination); src.start(); },
          function(){ notify('تعذّر تشغيل هذا التسجيل','x-circle'); });
      }catch(e){ notify('تعذّر تشغيل التسجيل','x-circle'); }
    };
    fr.readAsArrayBuffer(r.blob);
  }).catch(function(){});
}
// تحميل التسجيل الصوتي كملف على الجهاز
function downloadVoiceDump(aid,dur){
  if(!aid||typeof mediaGet!=='function'){ notify('غير متاح','x-circle'); return; }
  mediaGet(aid).then(function(r){
    if(!r||!r.blob){ notify('التسجيل غير موجود','x-circle'); return; }
    var mt=r.blob.type||'audio/webm';
    var ext=mt.indexOf('mp4')>=0||mt.indexOf('m4a')>=0?'m4a':(mt.indexOf('ogg')>=0?'ogg':(mt.indexOf('wav')>=0?'wav':'webm'));
    var url=URL.createObjectURL(r.blob);
    var a=document.createElement('a'); a.href=url; a.download='تسجيل-استجلاء-'+(dur||0)+'ث-'+Date.now()+'.'+ext;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },5000);
    notify('جارٍ تحميل التسجيل ✓','download');
  }).catch(function(){ notify('تعذّر التحميل','x-circle'); });
}

// ===== (المهمة ٢١) استجلاء الذهن السريع داخل «الجِدّ» — نافذة منبثقة صغيرة =====
// تظهر أثناء الجلسة (body.in-session). تلتقط الفكرة لمخزن brainDump نفسه ثم تُغلق فوراً دون قطع التركيز.
function toggleJadDump(){
  var pop=document.getElementById('jad-dump-pop'); if(!pop)return;
  var open=pop.classList.toggle('open');
  if(open){ var i=document.getElementById('jad-dump-input'); if(i){ i.value=''; setTimeout(function(){ try{i.focus();}catch(e){} },30); } }
}
function saveJadDump(){
  var inp=document.getElementById('jad-dump-input'); if(!inp)return;
  var txt=(inp.value||'').trim();
  if(!txt){ var p0=document.getElementById('jad-dump-pop'); if(p0)p0.classList.remove('open'); return; }
  var rec={ id:'bd_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), profileId:dumpProfile(), text:txt, createdAt:Date.now(), processed:false };
  if(typeof dbReady==='function'&&dbReady()){ try{ dbPut('brainDump',rec).then(function(){ if(typeof renderDumpInbox==='function')renderDumpInbox(); }); }catch(e){} }
  inp.value='';
  var pop=document.getElementById('jad-dump-pop'); if(pop)pop.classList.remove('open');
  notify('أُلتقِطت الفكرة — تجدها في «استجلاء الذهن»','inbox');
}
