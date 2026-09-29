// tasks.js — tasks CRUD, deadlines, search, sort, drag & drop
// module 5/10 of the former renderer.js — classic script (globals shared, no ES modules)

// Tasks  (addTask + renderTasks live in the deadline-aware section below)
function toggleTask(id){var becameDone=false;S.tasks=S.tasks.map(function(t){if(t.id===id){t.done=!t.done;t.doneAt=t.done?Date.now():null;becameDone=t.done;}return t;});save();renderTasks();updateStats();checkAchievements();if(becameDone){if(typeof playClick==='function')playClick();if(typeof flashDone==='function')flashDone();}}
// المفتت السحري ✂️ — يخدع الدماغ ببداية سهلة: أوّل خطوة ملموسة ٥ دقائق ثم يبدأها فوراً
function shredTask(id){
  var t=(S.tasks||[]).find(function(x){return x.id===id;}); if(!t)return;
  openInputDialog({title:'المفتت السحري ✂️',sub:'ما أوّل خطوة ملموسة تستغرق ٥ دقائق فقط؟',placeholder:'مثلاً: افتح الكتاب صفحة ٣٢ واقرأ فقرة واحدة',confirmText:'ابدأها الآن',onOk:function(v){
    v=(v||'').trim(); if(!v)return;
    if(!t.steps)t.steps=[];
    if(stepsSessionSum(t)>=(t.pomo||1))t.pomo=(t.pomo||1)+1;   // اترك مكاناً للخطوة الجديدة
    t.steps.unshift({text:v,done:false,sessions:1});
    t.expanded=true; save(); renderTasks();
    if(typeof startStepTimer==='function')startStepTimer(id,0);
  }});
}
// حذف فوري + تراجُع ٦ ثوانٍ (بديل التأكيد — نمط احترافي موحّد)
function deleteTask(id){
  var i=(S.tasks||[]).findIndex(function(t){return t.id===id;}); if(i<0)return;
  var t=S.tasks[i];
  S.tasks.splice(i,1); save(); renderTasks(); updateStats();
  undoToast('حُذفت «'+esc((t.text||'').slice(0,24))+'»',function(){
    S.tasks.splice(Math.min(i,S.tasks.length),0,t); save(); renderTasks(); updateStats();
  });
}
function toggleExpand(id){S.tasks=S.tasks.map(function(t){if(t.id===id)t.expanded=!t.expanded;return t;});save();renderTasks();}
function editTask(id){var t=S.tasks.find(function(x){return x.id===id;});if(!t)return;openInputDialog({title:'تعديل المهمة',type:'text',value:t.text,confirmText:'حفظ',onOk:function(nv){if(nv!==null&&nv.trim()){t.text=nv.trim();save();renderTasks();}}});}
// (المهمة ٢٠) خطوة فرعية: لكل خطوة عدد جلسات حرّ، مع تحقّق يمنع تجاوز مجموعها للجهد المُقدّر للمهمة.
function stepsSessionSum(t){ return (t.steps||[]).reduce(function(a,s){return a+(s.sessions||1);},0); }
// تعديل «الجهد المُقدّر» (عدد الجلسات) للمهمة حتى بعد إنشائها — لا يقلّ عن مجموع جلسات خطواتها
function setTaskPomo(id,val){
  var v=Math.max(1,parseInt(val)||1);
  S.tasks=S.tasks.map(function(t){
    if(t.id===id){
      var minNeeded=stepsSessionSum(t);
      if(v<minNeeded){ v=minNeeded; notify('الجهد لا يقلّ عن مجموع جلسات الخطوات ('+minNeeded+')','alert-triangle'); }
      t.pomo=v;
    }
    return t;
  });
  save(); renderTasks();
}
function addStep(id){
  var inp=document.getElementById('step-inp-'+id); if(!inp||!inp.value.trim())return;
  var sEl=document.getElementById('step-sess-'+id);
  var want=Math.max(1,parseInt(sEl&&sEl.value)||1);
  S.tasks=S.tasks.map(function(t){
    if(t.id===id){
      if(!t.steps)t.steps=[];
      var remaining=(t.pomo||1)-stepsSessionSum(t);
      if(remaining<=0){ notify('لا جلسات متبقّية — ارفع «الجهد المُقدّر» للمهمة أولاً','alert-triangle'); return t; }
      var give=Math.min(want,remaining);
      if(give<want)notify('قُلِّصت جلسات الخطوة إلى '+give+' حتى لا تتجاوز الجهد المُقدّر','info');
      t.steps.push({text:inp.value.trim(),done:false,sessions:give});
    }
    return t;
  });
  save();renderTasks();
}
function setStepSessions(tid,si,val){
  var v=Math.max(1,parseInt(val)||1);
  S.tasks=S.tasks.map(function(t){
    if(t.id===tid&&t.steps&&t.steps[si]){
      var otherSum=t.steps.reduce(function(a,s,i){return a+(i===si?0:(s.sessions||1));},0);
      var remaining=(t.pomo||1)-otherSum;
      if(v>remaining){ v=Math.max(1,remaining); notify('الحدّ الأقصى لهذه الخطوة '+v+' (الجهد المُقدّر '+t.pomo+')','alert-triangle'); }
      t.steps[si].sessions=v;
    }
    return t;
  });
  save();renderTasks();
}
// تعديل تاريخ الاستحقاق وتاريخ الإتمام يدوياً لكل مهمة رئيسية
function setTaskDeadline(id,v){ S.tasks=S.tasks.map(function(t){ if(t.id===id)t.deadline=v||''; return t; }); save(); renderTasks(); }
// تقدير الدقائق لمهمة (يُحرَّر من بنك الجِد عند تفعيل «تقديرات الوقت»)
function setTaskEst(id,v){ S.tasks=S.tasks.map(function(t){ if(t.id===id)t.estMin=Math.max(0,parseInt(v)||0); return t; }); save(); if(typeof renderSa3iEta==='function')renderSa3iEta(); }
function setTaskDoneAt(id,v){
  S.tasks=S.tasks.map(function(t){ if(t.id===id){ if(v){ t.doneAt=new Date(v+'T12:00:00').getTime(); t.done=true; } else { t.doneAt=null; } } return t; });
  save(); renderTasks(); if(typeof updateStats==='function')updateStats();
}
function deleteStep(tid,si){
  S.tasks=S.tasks.map(function(t){ if(t.id===tid&&t.steps)t.steps.splice(si,1); return t; });
  save();renderTasks();
}
function toggleStep(tid,si){var becameDone=false;S.tasks=S.tasks.map(function(t){if(t.id===tid&&t.steps&&t.steps[si]){t.steps[si].done=!t.steps[si].done;becameDone=t.steps[si].done;}return t;});save();renderTasks();if(becameDone){if(typeof playClick==='function')playClick();if(typeof flashDone==='function')flashDone();}}
function filterTasks(f,btn){taskFilter=f;document.querySelectorAll('#page-tasks .tab').forEach(function(b){b.classList.remove('active');});if(btn)btn.classList.add('active');renderTasks();}

// ===== TASKS with deadline =====
function tval(id){var el=document.getElementById(id);return el?el.value:'';}
function addTask(){
  var txt=document.getElementById('task-input').value.trim();if(!txt)return;
  var dl=document.getElementById('task-deadline');
  var rep=tval('task-repeat')||'none';
  S.tasks.unshift({
    id:Date.now(),text:txt,
    subject:document.getElementById('task-subject').value,
    category:(tval('task-category')||'').trim(),   // free-text classification
    priority:document.getElementById('task-prio').value,
    pomo:parseInt(document.getElementById('task-pomo-count').value),
    estMin:0,                                       // تقدير الدقائق (ميزة «ينتهي الكل الساعة X» — اختيارية)
    actualSessions:0,                               // filled as real سعي sessions run for this task
    deadline:dl?dl.value:'',
    repeat:rep,                                      // none | daily | weekly
    lastReset:todayKey(),
    today:(document.getElementById('task-today')&&document.getElementById('task-today').checked)||false,
    archived:false,highYield:false,
    done:false,steps:[],expanded:false
  });
  document.getElementById('task-input').value='';
  if(dl)dl.value='';
  var cat=document.getElementById('task-category'); if(cat)cat.value='';
  var td=document.getElementById('task-today'); if(td)td.checked=false;
  save();renderTasks();updateStats();checkAchievements();
}
function toggleArchive(id){S.tasks=S.tasks.map(function(t){if(t.id===id)t.archived=!t.archived;return t;});save();renderTasks();updateStats();}
function toggleHighYield(id){S.tasks=S.tasks.map(function(t){if(t.id===id)t.highYield=!t.highYield;return t;});save();renderTasks();}
function toggleToday(id){S.tasks=S.tasks.map(function(t){if(t.id===id)t.today=!t.today;return t;});save();renderTasks();}
function toggleShowArchived(){ taskShowArchived=!taskShowArchived; var b=document.getElementById('task-archive-toggle'); if(b)b.classList.toggle('manual',taskShowArchived); renderTasks(); }
// recurring rollover: reset done daily/weekly tasks at day/week change so they recur
function rolloverRecurring(){
  var tk=todayKey(), ws=weekStartKey(), changed=false;
  (S.tasks||[]).forEach(function(t){
    if(!t.repeat||t.repeat==='none')return;
    if(t.repeat==='daily'&&t.lastReset!==tk){ if(t.done){t.done=false;} (t.steps||[]).forEach(function(s){s.done=false;}); t.lastReset=tk; changed=true; }
    if(t.repeat==='weekly'){ var lw=t.lastResetWeek||''; if(lw!==ws){ if(t.done){t.done=false;} (t.steps||[]).forEach(function(s){s.done=false;}); t.lastResetWeek=ws; changed=true; } }
  });
  if(changed)save();
}
function deadlineBadge(dl){
  if(!dl)return '';
  var diff=Math.ceil((new Date(dl)-new Date())/(1000*60*60*24));
  if(diff<0)return '<span class="task-deadline dl-over">انتهى منذ '+Math.abs(diff)+' يوم</span>';
  if(diff===0)return '<span class="task-deadline dl-urgent">اليوم!</span>';
  if(diff<=2)return '<span class="task-deadline dl-urgent">'+diff+' يوم</span>';
  if(diff<=5)return '<span class="task-deadline dl-soon">'+diff+' يوم</span>';
  return '<span class="task-deadline dl-ok">'+diff+' يوم</span>';
}
// accordion (collapsible category sections) state
function taskAcc(){ if(!S.settings)S.settings={}; if(!S.settings.taskAccordion)S.settings.taskAccordion={}; return S.settings.taskAccordion; }
function toggleTaskAcc(key){ var a=taskAcc(); a[key]=!a[key]; save(); renderTasks(); }
function jsStr(s){ return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function taskGroupKey(t){ return (t.category&&t.category.trim())?t.category.trim():((S.subjects[t.subject]&&S.subjects[t.subject].label)||'أخرى'); }
// single task row markup (shared)
function renderTaskItem(t){
  var manual=S.taskSortMode==='manual';
  var sub=S.subjects[t.subject]||null;   // مهمة بلا مساق = عادية، مش ناقصة
  var dc={high:'dot-high',mid:'dot-mid',low:'dot-low'}[t.priority]||'dot-mid';
  var stepsArr=t.steps||[];
  var stepsDone=stepsArr.filter(function(s){return s.done;}).length;
  var stepsTotal=stepsArr.length;
  var stepsPct=stepsTotal>0?Math.round(stepsDone/stepsTotal*100):0;
  var barColor=stepsPct===100?'var(--green)':stepsPct>50?'var(--accent)':'var(--amber)';
  var stepsBar=stepsTotal>0?'<div class="steps-progress"><div class="steps-progress-fill" style="width:'+stepsPct+'%;background:'+barColor+'"></div></div>':'';
  var steps='';
  if(t.expanded){
    var subSum=stepsArr.reduce(function(a,s){return a+(s.sessions||1);},0);
    steps='<div class="task-steps"><div class="task-pomo-edit"><i data-lucide="timer"></i> الجهد المُقدّر (جلسات): <input type="number" min="1" max="99" value="'+t.pomo+'" onclick="event.stopPropagation()" onchange="setTaskPomo('+t.id+',this.value)"></div>'+
    '<div class="task-date-edit"><span><i data-lucide="calendar"></i> الاستحقاق</span><input type="date" value="'+(t.deadline||'')+'" onclick="event.stopPropagation()" onchange="setTaskDeadline('+t.id+',this.value)"><span><i data-lucide="check-circle-2"></i> الإتمام</span><input type="date" value="'+(t.doneAt?new Date(t.doneAt).toISOString().slice(0,10):'')+'" onclick="event.stopPropagation()" onchange="setTaskDoneAt('+t.id+',this.value)"></div>'+stepsArr.map(function(s,si){
      return '<div class="task-step'+(s.done?' done-step':'')+'">'+
        '<input type="checkbox" '+(s.done?'checked':'')+' onchange="toggleStep('+t.id+','+si+')">'+
        '<span class="ts-text">'+esc(s.text)+'</span>'+
        '<span class="ts-actual" title="جلسات منجزة من المخطّطة">'+(s.actualSessions||0)+'/'+(s.sessions||1)+'</span>'+
        '<span class="ts-sess" title="عدد جلسات هذه الخطوة"><i data-lucide="timer"></i><input type="number" min="1" max="99" value="'+(s.sessions||1)+'" onchange="setStepSessions('+t.id+','+si+',this.value)" onclick="event.stopPropagation()"></span>'+
        '<button class="icon-btn" onclick="deleteStep('+t.id+','+si+')" title="حذف الخطوة"><i data-lucide="x"></i></button>'+
        '</div>';
    }).join('')+
    (stepsTotal>0?'<div class="steps-sum'+(subSum>t.pomo?' over':'')+'">مجموع جلسات الخطوات: <b>'+subSum+'</b> / '+t.pomo+' (الجهد المُقدّر)</div>':'')+
    '<div class="step-add"><input id="step-inp-'+t.id+'" placeholder="أضف خطوة فرعية..." onkeydown="if(event.key===\'Enter\')addStep('+t.id+')"><input type="number" id="step-sess-'+t.id+'" min="1" max="99" value="1" title="جلسات هذه الخطوة" style="width:62px"><button class="btn sm" onclick="addStep('+t.id+')"><i data-lucide="plus"></i></button></div></div>';
  }
  // every open task is draggable: manual mode → reorder; always → can be dropped on the «سعي» timer
  var dragAttrs=!t.done?' draggable="true" ondragstart="taskDragStart(event,'+t.id+')" ondragover="taskDragOver(event,'+t.id+')" ondragleave="taskDragLeave(event)" ondrop="taskDrop(event,'+t.id+')" ondragend="taskDragEnd(event)"':'';
  var handle=manual&&!t.done?'<span class="task-drag-handle" title="اسحب لإعادة الترتيب أو إلى مؤقّت السعي"><i data-lucide="grip-vertical"></i></span>':'';
  var act=t.actualSessions||0;
  // تلوين ذكي: حدّ ملوّن بحسب قُرب الموعد
  var dlCls='';
  if(!t.done&&!t.archived&&t.deadline){
    var dlDiff=Math.ceil((new Date(t.deadline)-new Date())/(1000*60*60*24));
    dlCls=dlDiff<0?' ti-over':dlDiff<=1?' ti-urgent':dlDiff<=3?' ti-soon':' ti-ok';
  }
  return '<div class="task-item'+(t.done?' done':'')+(t.today?' is-today':'')+(t.archived?' archived':'')+dlCls+'" data-id="'+t.id+'"'+dragAttrs+'>'+
    handle+
    '<div class="dot '+dc+'"></div>'+
    '<div class="chk'+(t.done?' on':'')+'" onclick="toggleTask('+t.id+')"><i data-lucide="check"></i></div>'+
    '<div style="flex:1;min-width:0">'+
      '<div class="task-text" onclick="editTask('+t.id+')" title="اضغط للتعديل" style="cursor:text">'+(t.today?'<i data-lucide="star" class="task-today-star"></i> ':'')+esc(t.text)+'</div>'+
      '<div class="task-meta">'+
        (sub?('<span class="badge bd-'+t.subject+'">'+esc(sub.label)+'</span>'):'')+
        (t.highYield?'<span class="task-chip hy"><i data-lucide="target"></i> الأولى بالتقديم</span>':'')+
        (t.category?'<span class="task-chip cat">#'+esc(t.category)+'</span>':'')+
        (t.repeat&&t.repeat!=='none'?'<span class="task-chip rep"><i data-lucide="repeat"></i> '+(t.repeat==='daily'?'يومي':'أسبوعي')+'</span>':'')+
        '<span class="task-chip eff" title="جلسات: فعلي / مُقدّر"><i data-lucide="timer"></i> '+act+'/'+t.pomo+'</span>'+
        (stepsTotal>0?'<span class="task-chip">'+stepsDone+'/'+stepsTotal+' خطوة</span>':'')+
        (t.deadline&&!t.done?deadlineBadge(t.deadline):'')+
      '</div>'+
      stepsBar+
    '</div>'+
    '<div class="task-actions">'+   // مجموعة الأدوات — تلتفّ لسطر تحت بدل scroll أفقي (طلب نوح)
    (!t.done&&!t.archived?'<button class="task-play-btn" onclick="startTaskTimer('+t.id+')" title="ابدأ جلسة لهذه المهمة"><i data-lucide="play-circle"></i></button>':'')+
    (!t.done&&!t.archived?'<button class="icon-btn" onclick="shredTask('+t.id+')" title="المفتت: ابدأ بخطوة ٥ دقائق"><i data-lucide="scissors"></i></button>':'')+
    '<button class="icon-btn'+(t.highYield?' hy-on':'')+'" onclick="toggleHighYield('+t.id+')" title="'+(t.highYield?'إزالة وسم الأولى بالتقديم':'وسم «الأولى بالتقديم» — أكبر أثر بأقلّ جهد')+'"><i data-lucide="target"></i></button>'+
    '<button class="icon-btn" onclick="toggleToday('+t.id+')" title="'+(t.today?'إزالة من اليوم':'أضِف إلى «اليوم»')+'"><i data-lucide="'+(t.today?'star':'star-off')+'"></i></button>'+
    '<button class="icon-btn" onclick="toggleExpand('+t.id+')"><i data-lucide="'+(t.expanded?'chevron-up':'chevron-down')+'"></i></button>'+
    '<button class="icon-btn" onclick="toggleArchive('+t.id+')" title="'+(t.archived?'إلغاء الأرشفة':'أرشفة')+'"><i data-lucide="'+(t.archived?'archive-restore':'archive')+'"></i></button>'+
    '<button class="icon-btn" onclick="deleteTask('+t.id+')"><i data-lucide="trash-2"></i></button>'+
    '</div>'+
    steps+   // الخطوات الموسّعة بعرض كامل في سطر مستقلّ (تَحُلّ مشكلة التمدّد)
    '</div>';
}
function renderTasks(){
  const list=document.getElementById('task-list');
  // keep the «سعي» quick task bank in sync whenever tasks change
  if(typeof renderSa3iTasks==='function'){ try{renderSa3iTasks();}catch(e){} }
  if(!list)return;
  const po={high:0,mid:1,low:2};
  const manual=S.taskSortMode==='manual';
  const q=(taskSearch||'').trim().toLowerCase();
  let filtered=(S.tasks||[]).filter(function(t){
    if(t.archived&&!taskShowArchived)return false;
    if(t.archived&&taskShowArchived){/* show */}
    if(taskFilter==='today'){ if(!t.today)return false; }
    else if(taskFilter==='highyield'){ if(!t.highYield)return false; }
    else if(taskFilter!=='all'&&t.subject!==taskFilter)return false;
    if(q){
      const inText=(t.text||'').toLowerCase().indexOf(q)>=0;
      const inCat=(t.category||'').toLowerCase().indexOf(q)>=0;
      const inSteps=(t.steps||[]).some(function(s){return (s.text||'').toLowerCase().indexOf(q)>=0;});
      if(!inText&&!inSteps&&!inCat)return false;
    }
    return true;
  });
  // auto mode: sort by done -> deadline -> priority. manual mode: keep array order (done at bottom).
  if(manual){
    filtered.sort(function(a,b){return (a.done?1:0)-(b.done?1:0);});
  }else{
    filtered.sort(function(a,b){
      if(a.done!==b.done)return a.done?1:-1;
      if(a.deadline&&b.deadline)return new Date(a.deadline)-new Date(b.deadline);
      if(a.deadline&&!b.deadline)return -1;
      if(!a.deadline&&b.deadline)return 1;
      return po[a.priority]-po[b.priority];
    });
  }
  if(!filtered.length){
    list.innerHTML=q
      ? '<div class="empty"><i data-lucide="search-x"></i><div>لا نتائج للبحث «'+esc(q)+'»</div></div>'
      : '<div class="empty empty-big"><i data-lucide="clipboard-list"></i><div class="empty-title">ابدأ ديوان واجباتك</div><div class="empty-sub">اكتب أوّل واجب وابدأ التخطيط ليومك — خطوة واحدة تكفي</div><button class="btn pri" onclick="focusAdd(\'task-input\')"><i data-lucide="plus"></i> أضِف أوّل واجب</button></div>';
    icons();return;
  }
  // group into accordion sections by category (falls back to the subject label)
  var groups={}, order=[];
  filtered.forEach(function(t){ var key=taskGroupKey(t); if(!groups[key]){groups[key]=[];order.push(key);} groups[key].push(t); });
  var acc=taskAcc();
  list.innerHTML=order.map(function(key){
    var items=groups[key];
    var total=items.length, done=items.filter(function(t){return t.done;}).length;
    var open = q ? true : !!acc[key];   // search force-expands; otherwise default collapsed
    return '<div class="task-group">'+
      '<button class="task-group-head'+(open?' open':'')+'" onclick="toggleTaskAcc(\''+jsStr(key)+'\')">'+
        '<i class="tg-caret" data-lucide="chevron-left"></i>'+
        '<span class="tg-name">'+esc(key)+'</span>'+
        '<span class="tg-count">'+done+'/'+total+'</span>'+
      '</button>'+
      '<div class="task-group-body'+(open?' open':'')+'">'+items.map(renderTaskItem).join('')+'</div>'+
    '</div>';
  }).join('');
  icons();
}
function toggleTaskOptions(){toggleAddOptions('task-options','task-opt-toggle');}

// ===== TASK SEARCH + SORT MODE + DRAG&DROP =====
function setTaskSearch(v){ taskSearch=v; renderTasks(); }
function toggleTaskSort(){
  S.taskSortMode=(S.taskSortMode==='manual')?'auto':'manual';
  save(); syncSortToggle(); renderTasks();
  notify(S.taskSortMode==='manual'?'الترتيب اليدوي مفعّل — اسحب المهام':'الترتيب التلقائي مفعّل','arrow-down-up');
}
function syncSortToggle(){
  const b=document.getElementById('task-sort-toggle'); if(!b)return;
  const manual=S.taskSortMode==='manual';
  b.classList.toggle('manual',manual);
  b.innerHTML='<i data-lucide="arrow-down-up"></i> '+(manual?'يدوي':'تلقائي');
  icons();
}
function taskDragStart(e,id){ dragTaskId=id; if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',String(id));}catch(_){} } const it=e.currentTarget; if(it)it.classList.add('dragging'); }
function taskDragOver(e,id){ e.preventDefault(); e.dataTransfer.dropEffect='move'; const it=e.currentTarget; if(it&&!it.classList.contains('drag-over'))it.classList.add('drag-over'); }
function taskDragLeave(e){ const it=e.currentTarget; if(it)it.classList.remove('drag-over'); }
function taskDrop(e,targetId){ e.preventDefault(); const it=e.currentTarget; if(it)it.classList.remove('drag-over'); reorderTasks(dragTaskId,targetId); }
function taskDragEnd(e){ const it=e.currentTarget; if(it)it.classList.remove('dragging'); document.querySelectorAll('.task-item.drag-over').forEach(function(x){x.classList.remove('drag-over');}); dragTaskId=null; }
function reorderTasks(dragId,targetId){
  if(dragId==null||dragId===targetId)return;
  const arr=S.tasks; const from=arr.findIndex(function(t){return t.id===dragId;});
  if(from<0)return;
  const item=arr.splice(from,1)[0];
  const to=arr.findIndex(function(t){return t.id===targetId;});
  arr.splice(to<0?arr.length:to,0,item);
  save(); renderTasks();
}

// ===== تصدير المهام: PDF (طباعة) + نسخ كنص =====
function tasksForExport(){ return (S.tasks||[]).filter(function(t){return !t.archived;}); }
function exportTasks(){
  var el=document.getElementById('print-report'); if(!el){ notify('تعذّر التصدير','x-circle'); return; }
  var list=tasksForExport();
  var open=list.filter(function(t){return !t.done;}), done=list.filter(function(t){return t.done;});
  function row(t){
    var sub=(S.subjects&&S.subjects[t.subject]&&S.subjects[t.subject].label)||'';
    var dl=t.deadline?('<td>'+esc(t.deadline)+'</td>'):'<td>—</td>';
    var steps=(t.steps||[]).length?((t.steps.filter(function(s){return s.done;}).length)+'/'+t.steps.length):'—';
    return '<tr><td>'+esc(t.text)+'</td><td>'+esc(sub)+'</td><td>'+esc(t.category||'—')+'</td>'+dl+'<td>'+steps+'</td></tr>';
  }
  var d=new Date();
  el.innerHTML='<div class="pr-head"><h1>ديوان الواجبات — '+esc(userName())+'</h1><div class="pr-date">'+formatIslamicDate(d)+'</div></div>'+
    '<div class="pr-cards"><div class="pr-card"><b>'+open.length+'</b><span>واجبات مفتوحة</span></div><div class="pr-card"><b>'+done.length+'</b><span>منجزة</span></div></div>'+
    '<h2>المفتوحة</h2>'+(open.length?('<table class="pr-table"><tr><th>المهمة</th><th>المادة</th><th>التصنيف</th><th>التسليم</th><th>الخطوات</th></tr>'+open.map(row).join('')+'</table>'):'<p>لا واجبات مفتوحة 🎉</p>')+
    (done.length?('<h2>المنجزة</h2><table class="pr-table"><tr><th>المهمة</th><th>المادة</th><th>التصنيف</th><th>التسليم</th><th>الخطوات</th></tr>'+done.map(row).join('')+'</table>'):'')+
    '<div class="pr-foot">مولّد محلياً من «الاستدراك» · '+d.toLocaleString('ar-EG')+'</div>';
  document.body.classList.add('printing');
  setTimeout(function(){ window.print(); setTimeout(function(){document.body.classList.remove('printing');},400); },120);
}
function copyTasksText(){
  var list=tasksForExport();
  if(!list.length){ notify('لا مهام للنسخ','info'); return; }
  var open=list.filter(function(t){return !t.done;}), done=list.filter(function(t){return t.done;});
  function line(t){ var dl=t.deadline?(' (تسليم: '+t.deadline+')'):''; return '- ['+(t.done?'x':' ')+'] '+t.text+dl; }
  var txt='ديوان الواجبات — '+userName()+'\n'+formatIslamicDate(new Date())+'\n\n';
  if(open.length){ txt+='المفتوحة:\n'+open.map(line).join('\n')+'\n\n'; }
  if(done.length){ txt+='المنجزة:\n'+done.map(line).join('\n')+'\n'; }
  function ok(){ notify('نُسِخت المهام كنص ✓','clipboard-check'); }
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt).then(ok).catch(function(){ fallbackCopy(txt,ok); }); }
  else fallbackCopy(txt,ok);
}
function fallbackCopy(txt,ok){
  try{ var ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); if(ok)ok(); }
  catch(e){ notify('تعذّر النسخ','x-circle'); }
}
