// habits.js — habits, categories, core habits
// module 6/10 of the former renderer.js — classic script (globals shared, no ES modules)


// Habits  (addHabit + renderHabits live in the «categories» section below)
function toggleHabit(id){var tk=todayKey();S.habits=S.habits.map(function(h){if(h.id===id){if(!h.log)h.log={};if(h.log[tk])delete h.log[tk];else h.log[tk]=true;}return h;});save();renderHabits();updateStats();renderHome();}
// حذف فوري + تراجُع ٦ ثوانٍ (السجل log يرجع كاملاً مع العادة — نفس الكائن)
function deleteHabit(id){
  var i=(S.habits||[]).findIndex(function(h){return h.id===id;}); if(i<0)return;
  var h=S.habits[i];
  S.habits.splice(i,1); save(); renderHabits(); updateStats();
  undoToast('حُذفت «'+(h.name||'').slice(0,24)+'»',function(){
    S.habits.splice(Math.min(i,S.habits.length),0,h); save(); renderHabits(); updateStats();
  });
}
function editHabit(id){var h=S.habits.find(function(x){return x.id===id;});if(!h)return;var nv=prompt('عدّل اسم العادة:',h.name);if(nv!==null&&nv.trim()){h.name=nv.trim();save();renderHabits();}}
function habitStreak(h){var s=0,d=new Date();for(var i=0;i<400;i++){var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();if(h.log&&h.log[k])s++;else break;d.setDate(d.getDate()-1);}return s;}
function toggleHabitOptions(){toggleAddOptions('habit-options','habit-opt-toggle');}

// ===== HABITS with categories =====
var HAB_CATS={religion:{label:'🕌 دين',order:0},study:{label:'📚 دراسة',order:1},health:{label:'💪 صحة',order:2},other:{label:'🌟 أخرى',order:3}};
function addHabit(){
  var name=document.getElementById('habit-input').value.trim();if(!name)return;
  var cat=document.getElementById('habit-cat')?document.getElementById('habit-cat').value:'other';
  S.habits.push({id:Date.now(),name:name,color:document.getElementById('habit-color').value,freq:document.getElementById('habit-freq').value,cat:cat,log:{}});
  document.getElementById('habit-input').value='';save();renderHabits();updateStats();
}
function setHabitColor(id,color){ S.habits=S.habits.map(function(h){if(h.id===id)h.color=color;return h;}); save(); renderHabits(); }
// إضافة موحّدة: عادة أو ذِكر حسب المُنتقي (بطلب المستخدم) — الإدخال من نفس الحقل habit-input
function syncAddType(){
  var t=document.getElementById('md-add-type'); var type=t?t.value:'habit';
  var tgt=document.getElementById('adhkar-target'); if(tgt)tgt.style.display=type==='dhikr'?'':'none';
  var q=document.getElementById('dhikr-quick'); if(q)q.style.display=type==='dhikr'?'':'none';
  var opt=document.getElementById('habit-opt-toggle'); if(opt)opt.style.display=type==='dhikr'?'none':'';
  var inp=document.getElementById('habit-input'); if(inp)inp.placeholder=(type==='dhikr')?'أضف ذِكراً جديداً...':'أضف عادة جديدة...';
}
function addHabitOrDhikr(){
  var t=document.getElementById('md-add-type'); var type=t?t.value:'habit';
  if(type==='dhikr'){
    var inp=document.getElementById('habit-input'); var name=(inp&&inp.value||'').trim(); if(!name)return;
    var tEl=document.getElementById('adhkar-target'); var target=Math.max(1,parseInt(tEl&&tEl.value)||33);
    if(!Array.isArray(S.adhkar))S.adhkar=[];
    var colors=['#0d9488','#5750d8','#d97706','#7c3aed','#0284c7','#dc2626'];
    S.adhkar.push({id:Date.now(),name:name,target:target,today:0,total:0,lastDate:todayKey(),color:colors[S.adhkar.length%colors.length]});
    if(inp)inp.value=''; save(); if(typeof renderAdhkar==='function')renderAdhkar();
  } else { addHabit(); }
}
// ---- view state + helpers (week / month / year-in-pixels) ----
// ---- عرض كل تقويم مستقلّ (أسبوع/شهر/سنة): لكل تقويم مفتاحه في S.settings.calView (بطلب المستخدم: لا تتحرك كلها معاً) ----
function calView(calId){ if(!S.settings)S.settings={}; if(!S.settings.calView)S.settings.calView={}; return S.settings.calView[calId]||'week'; }
function setCalView(v,calId){
  if(!S.settings)S.settings={}; if(!S.settings.calView)S.settings.calView={};
  S.settings.calView[calId]=v; save();
  var R={ habits:'renderHabits', adhkar:'renderAdhkar', quran:'renderQuran', qiyam:'renderQiyam',
          study:'renderStatsCalendars', sport:'renderStatsCalendars', worship:'renderStatsCalendars' };
  var fn=R[calId]; try{ if(fn&&typeof window[fn]==='function')window[fn](); }catch(e){}   // يعيد رسم هذا التقويم فقط
}
// أغلفة توافقية (تقويم العادات) — لأي مرجع قديم بقي لـ habitView/setHabitView
function habitView(){ return calView('habits'); }
function setHabitView(v){ setCalView(v,'habits'); }
function renderHabitViewToggle(){
  var el=document.getElementById('habit-view-ctrl'); if(!el)return;
  var cur=calView('habits');
  var opts=[['week','أسبوع','calendar-range'],['month','شهر','calendar'],['year','سنة بالبكسل','grid-3x3']];
  el.innerHTML=opts.map(function(o){return '<button class="seg-btn'+(cur===o[0]?' active':'')+'" onclick="setCalView(\''+o[0]+'\',\'habits\')"><i data-lucide="'+o[2]+'"></i> '+o[1]+'</button>';}).join('');
}
function hKey(d){ return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function habitDoneOn(h,d){ return !!(h.log&&h.log[hKey(d)]); }
// تعديل أي يوم سابق لعادة بنقرة على خليّته (بطلب المستخدم — كان ناقصاً للعادات)
function toggleHabitDay(id,dk){
  var h=(S.habits||[]).find(function(x){return x.id===id;}); if(!h)return;
  if(!h.log)h.log={};
  if(h.log[dk])delete h.log[dk]; else h.log[dk]=true;
  save(); renderHabits(); if(typeof updateStats==='function')updateStats(); if(typeof renderHome==='function'){try{renderHome();}catch(e){}}
}
// (حُذف habitPct — كان ميتاً)
function renderHabits(){
  var list=document.getElementById('habit-list'); if(!list)return;
  renderHabitViewToggle();
  if(typeof syncAddType==='function')syncAddType();
  if(!S.habits||!S.habits.length){list.innerHTML='<div class="card"><div class="empty empty-big"><i data-lucide="repeat"></i><div class="empty-title">كوّن عاداتك</div><div class="empty-sub">عادة صغيرة كل يوم تصنع فرقاً كبيراً مع الوقت</div><button class="btn pri" onclick="focusAdd(\'habit-input\')"><i data-lucide="plus"></i> أضِف أوّل عادة</button></div></div>';icons();return;}
  var v=habitView();
  if(v==='month'){ renderHabitsMonth(list); }
  else if(v==='year'){ renderHabitsYear(list); }
  else { renderHabitsWeek(list); }
  if(typeof renderAdhkar==='function'&&document.getElementById('adhkar-list'))renderAdhkar();   // الأذكار مدمجة بنفس الصفحة
  icons();
}
function renderHabitsWeek(list){
  var tk=todayKey();
  var grouped={};
  S.habits.forEach(function(h){var c=h.cat||'other';if(!grouped[c])grouped[c]=[];grouped[c].push(h);});
  var catOrder=Object.keys(HAB_CATS).sort(function(a,b){return HAB_CATS[a].order-HAB_CATS[b].order;});
  list.innerHTML=catOrder.filter(function(c){return grouped[c]&&grouped[c].length;}).map(function(cat){
    var habits=grouped[cat];
    return '<div class="hab-section"><div class="hab-section-title">'+HAB_CATS[cat].label+'</div>'+
      '<div class="card" data-cid="habits-week-'+cat+'">'+habits.map(function(h){
        var done=h.log&&h.log[tk];var st=habitStreak(h);
        var cells=[];
        for(var i=6;i>=0;i--){var dd=new Date();dd.setDate(dd.getDate()-i);var k=dd.getFullYear()+'-'+(dd.getMonth()+1)+'-'+dd.getDate();cells.push('<i onclick="toggleHabitDay('+h.id+',\''+k+'\')" title="'+k+' — اضغط للتعديل" style="cursor:pointer;background:'+((h.log&&h.log[k])?h.color:'var(--surface3)')+'"></i>');}
        return '<div class="habit-item" style="border-inline-start:4px solid '+h.color+'"><div class="habit-circle'+(done?' done':'')+'" style="border-color:'+h.color+';'+(done?'background:'+h.color:'')+'" onclick="toggleHabit('+h.id+')"><i data-lucide="check"></i></div>'+
          '<div style="flex:1"><div style="font-weight:700;font-size:15px">'+esc(h.name)+'</div>'+
          '<div style="font-size:12px;color:var(--text3);font-weight:600;margin-top:2px">'+(h.freq==='weekly'?'أسبوعي':'يومي')+' · 🔥 '+st+' يوم</div>'+
          '<div class="habit-strip">'+cells.join('')+'</div></div>'+
          '<label class="habit-color-edit" title="غيّر لون العادة" style="background:'+h.color+'"><input type="color" value="'+h.color+'" onchange="setHabitColor('+h.id+',this.value)"></label>'+
          '<button class="icon-btn" onclick="editHabit('+h.id+')"><i data-lucide="pencil"></i></button>'+
          '<button class="icon-btn" onclick="deleteHabit('+h.id+')"><i data-lucide="trash-2"></i></button></div>';
      }).join('')+'</div></div>';
  }).join('');
}
// monthly grid per habit + completion %
function renderHabitsMonth(list){
  var now=new Date(), y=now.getFullYear(), m=now.getMonth(), today=now.getDate();
  var dim=new Date(y,m+1,0).getDate();
  var monthName=now.toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
  list.innerHTML='<div class="card" data-cid="habits-month"><div class="card-title"><i data-lucide="calendar"></i> '+monthName+'</div>'+
    S.habits.map(function(h){
      var doneDays=0, cells='';
      for(var day=1;day<=dim;day++){
        var d=new Date(y,m,day), done=habitDoneOn(h,d), future=day>today, k=hKey(d);
        if(done)doneDays++;
        cells+='<i class="hmo-cell'+(future?' future':'')+(d.getDate()===today?' today':'')+'"'+(future?'':' onclick="toggleHabitDay('+h.id+',\''+k+'\')"')+' title="'+day+(future?'':' — اضغط للتعديل')+'" style="'+(future?'':'cursor:pointer;')+'background:'+(done?h.color:'var(--surface3)')+'"></i>';
      }
      var pct=Math.round(doneDays/today*100);
      return '<div class="hab-month-row" style="border-inline-start:4px solid '+h.color+'">'+
        '<div class="hmr-head"><span class="hmr-name">'+esc(h.name)+'</span><span class="hmr-pct">'+doneDays+'/'+today+' يوم · '+pct+'%</span></div>'+
        '<div class="hab-month-grid">'+cells+'</div></div>';
    }).join('')+'</div>';
}
// aggregate "Year in Pixels": one cell per day, intensity = ratio of habits completed that day
function renderHabitsYear(list){
  var now=new Date(), y=now.getFullYear(), total=S.habits.length;
  var months=['ينا','فبر','مار','أبر','ماي','يون','يول','أغس','سبت','أكت','نوف','ديس'];
  var rows='';
  var sumRatio=0, counted=0;
  for(var m=0;m<12;m++){
    var dim=new Date(y,m+1,0).getDate(), cells='';
    for(var day=1;day<=dim;day++){
      var d=new Date(y,m,day), future=d>now;
      var done=0; S.habits.forEach(function(h){ if(habitDoneOn(h,d))done++; });
      var ratio=total>0?done/total:0;
      if(!future){ sumRatio+=ratio; counted++; }
      var lvl=future?'future':(done===0?'0':ratio>=1?'4':ratio>=0.66?'3':ratio>=0.34?'2':'1');
      cells+='<i class="pix pix-'+lvl+'" title="'+day+'/'+(m+1)+' — '+done+'/'+total+' عادة"></i>';
    }
    rows+='<div class="pix-row"><span class="pix-mon">'+months[m]+'</span><div class="pix-cells">'+cells+'</div></div>';
  }
  var avg=counted?Math.round(sumRatio/counted*100):0;
  list.innerHTML='<div class="card" data-cid="habits-year"><div class="card-title"><i data-lucide="grid-3x3"></i> سنة بالبكسل — '+y+' · متوسط الالتزام '+avg+'%</div>'+
    '<div class="pix-board">'+rows+'</div>'+
    '<div class="legend" style="margin-top:1rem">أقل <i class="pix pix-0"></i><i class="pix pix-1"></i><i class="pix pix-2"></i><i class="pix pix-3"></i><i class="pix pix-4"></i> أكثر</div></div>';
}
