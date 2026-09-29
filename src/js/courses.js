// courses.js — «المساقات»: نموذج مواد/كورسات ديناميكي بدل المواد الخمس الثابتة (مرحلة الثانوية).
// كان S.subjects خريطة بمفاتيح مكتوبة بالكود (en/bio/geo/chem/phy) تُعاد تسميتها فقط؛ صار كياناً كاملاً:
// إضافة/تعديل/لون/نوع/أرشفة/حذف + وحدات (أسابيع أو محاضرات) يُحسب منها التقدّم فعلياً.
// classic script (globals shared) — يُحمّل بعد stats قبل prayer.

var COURSE_KINDS=[
  ['uni','مادة كلية','graduation-cap'],
  ['online','كورس أونلاين','monitor-play'],
  ['self','تعلّم ذاتي','sprout']
];
var COURSE_COLORS=['#c8643c','#2e6b4a','#6b63c9','#0284c7','#ca8a04','#0d9488','#7c3aed','#e11d48','#15803d','#64748b'];
function kindLabel(k){ for(var i=0;i<COURSE_KINDS.length;i++)if(COURSE_KINDS[i][0]===k)return COURSE_KINDS[i][1]; return COURSE_KINDS[0][1]; }
function kindIcon(k){ for(var i=0;i<COURSE_KINDS.length;i++)if(COURSE_KINDS[i][0]===k)return COURSE_KINDS[i][2]; return COURSE_KINDS[0][2]; }

// ===== الوصول للحالة (كسول — بلا ترحيل إجباري) =====
function courseObj(k){
  if(!S.subjects)S.subjects={};
  var c=S.subjects[k]; if(!c)return null;
  if(typeof c.archived!=='boolean')c.archived=false;
  if(typeof c.kind!=='string')c.kind='uni';
  if(typeof c.order!=='number')c.order=0;
  if(!Array.isArray(c.units))c.units=[];
  if(typeof c.prog!=='number')c.prog=0;
  if(typeof c.color!=='string')c.color=COURSE_COLORS[0];
  return c;
}
function courseAll(){
  return Object.keys(S.subjects||{}).map(function(k){ courseObj(k); return k; })
    .sort(function(a,b){ return (S.subjects[a].order||0)-(S.subjects[b].order||0); });
}
function courseActive(){ return courseAll().filter(function(k){ return !S.subjects[k].archived; }); }
function courseArchivedKeys(){ return courseAll().filter(function(k){ return !!S.subjects[k].archived; }); }
function subjLabel(k){
  if(k==='gen')return 'عام';
  var c=(S.subjects||{})[k];
  if(c&&c.label)return c.label;
  return k?'مساق محذوف':'—';   // مفتاح يتيم (مهمة قديمة لمساق مُزال) — لا نعرض المفتاح الخام
}
function subjColor(k){ if(k==='gen')return '#94a3b8'; var c=(S.subjects||{})[k]; return (c&&c.color)||'#94a3b8'; }
// التقدّم: من الوحدات إن وُجدت (محسوب فعلياً)، وإلا من الشريط اليدوي
function courseProg(k){
  var c=courseObj(k); if(!c)return 0;
  if(c.units&&c.units.length){
    var d=c.units.filter(function(u){return u.done;}).length;
    return Math.round(d/c.units.length*100);
  }
  return Math.min(100,Math.max(0,c.prog||0));
}
function courseMinutes(k){ return (S.subjectLog&&S.subjectLog[k])||0; }
function newCourseKey(){
  var n=1; while(S.subjects&&S.subjects['c'+n])n++;
  return 'c'+n;
}

// ===== CRUD =====
function courseAdd(label,kind,color){
  if(!S.subjects)S.subjects={};
  var k=newCourseKey();
  var used=courseAll().length;
  S.subjects[k]={
    label:(label||'مساق جديد').trim(), prog:0,
    color:color||COURSE_COLORS[used%COURSE_COLORS.length],
    archived:false, kind:kind||'uni', order:used, units:[]
  };
  if(!S.subjectLog)S.subjectLog={};
  if(typeof S.subjectLog[k]!=='number')S.subjectLog[k]=0;
  if(!S.srs)S.srs={};
  if(!S.srs[k])S.srs[k]={mastery:3,lastReview:''};
  save(); refreshCourseUI();
  return k;
}
function courseAddPrompt(){
  openInputDialog({title:'مساق جديد',sub:'اسم المادة أو الكورس — تقدر تغيّره وتضيف له أسابيع بعدين',placeholder:'مثلاً: CS50 أو تفاضل وتكامل',confirmText:'أضِف',onOk:function(v){
    if(v===null||!String(v).trim())return;
    var k=courseAdd(String(v).trim());
    notify('أُضيف «'+subjLabel(k)+'» ✓','plus-circle');
  }});
}
function courseRename(k){
  var c=courseObj(k); if(!c)return;
  openInputDialog({title:'تعديل اسم المساق',type:'text',value:c.label,confirmText:'حفظ',onOk:function(nv){
    if(nv===null||!String(nv).trim())return;
    c.label=String(nv).trim(); save(); refreshCourseUI();
  }});
}
function courseSetColor(k,v){ var c=courseObj(k); if(!c)return; c.color=v; save(); refreshCourseUI(); }
function courseSetKind(k,v){ var c=courseObj(k); if(!c)return; c.kind=v; save(); refreshCourseUI(); }
function courseSetProg(k,v){
  var c=courseObj(k); if(!c)return;
  c.prog=Math.min(100,Math.max(0,parseInt(v,10)||0));
  var bar=document.getElementById('cpf-'+k); if(bar)bar.style.width=c.prog+'%';
  save();
}
function courseClickProg(e,k){
  var c=courseObj(k); if(!c||(c.units&&c.units.length))return;   // مع الوحدات التقدّم محسوب — لا يُسحب يدوياً
  var r=e.currentTarget.getBoundingClientRect();
  var x=r.right-e.clientX;                                        // RTL: القياس من اليمين
  c.prog=Math.round(Math.max(0,Math.min(1,x/r.width))*100);
  save(); renderCourses();
}
// الأرشفة = الإخفاء بلا فقدان (السجلّ والدقائق تبقى) — البديل الآمن للحذف
function courseArchiveToggle(k){
  var c=courseObj(k); if(!c)return;
  c.archived=!c.archived; save(); refreshCourseUI();
  notify(c.archived?('أُرشِف «'+c.label+'» — سجلّه محفوظ'):('عاد «'+c.label+'» ✓'),c.archived?'archive':'archive-restore');
}
// ما الذي سيصير يتيماً لو حُذف هذا المساق؟ (وقت مسجَّل · مهام · مواعيد · درجات)
function courseDeps(k){
  var tasks=(S.tasks||[]).filter(function(t){ return t.subject===k; }).length;
  var dls=(Array.isArray(S.deadlines)?S.deadlines:[]).filter(function(d){ return d.subject===k; }).length;
  var mins=(S.subjectLog&&S.subjectLog[k])||0;
  var c=(S.subjects||{})[k]||{};
  var marks=Array.isArray(c.marks)?c.marks.length:0;
  var graded=!!c.letter;
  return {tasks:tasks,deadlines:dls,minutes:mins,marks:marks,graded:graded,
          any:!!(tasks||dls||mins||marks||graded)};
}
// الحذف يُقفَل لو للمساق تاريخ — الأرشفة تحفظ كل شيء وتخفيه، وهي الصحيح دائماً في هذه الحالة.
// (الحذف كان يترك subjectLog وsrs بلا صاحب، والمهام تقع في «أخرى» بلا اسم — تحقّقنا منه عملياً)
function courseDelete(k){
  var c=courseObj(k); if(!c)return;
  var dep=courseDeps(k);
  if(dep.any){
    var bits=[];
    if(dep.minutes)bits.push(arN(dep.minutes)+' دقيقة مذاكرة');
    if(dep.tasks)bits.push(arN(dep.tasks)+' واجب');
    if(dep.deadlines)bits.push(arN(dep.deadlines)+' موعد');
    if(dep.marks)bits.push(arN(dep.marks)+' درجة');
    if(dep.graded)bits.push('تقدير نهائي');
    askConfirm(
      'مش هنحذف «'+c.label+'» — عليه '+bits.join(' و')+'.\n'+
      'الحذف كان هيسيب دي بلا صاحب. الأرشفة تخفيه وتحتفظ بكل حاجة، وترجع بضغطة.',
      function(){ courseArchiveToggle(k); },
      {confirmText:'أرشِفه بدل الحذف',danger:false}
    );
    return;
  }
  var snapshot=JSON.parse(JSON.stringify(c)), idx=c.order;
  delete S.subjects[k];
  if(S.srs)delete S.srs[k];
  if(S.subjectLog)delete S.subjectLog[k];
  save(); refreshCourseUI();
  undoToast('حُذف «'+snapshot.label+'»',function(){
    S.subjects[k]=snapshot; S.subjects[k].order=idx;
    if(!S.subjectLog)S.subjectLog={}; S.subjectLog[k]=0;
    save(); refreshCourseUI();
  });
}
function courseMove(k,dir){
  var keys=courseActive(), i=keys.indexOf(k); if(i<0)return;
  var j=i+dir; if(j<0||j>=keys.length)return;
  var a=S.subjects[keys[i]], b=S.subjects[keys[j]];
  var t=a.order; a.order=b.order; b.order=t;
  save(); refreshCourseUI();
}

// ===== الوحدات (أسابيع/محاضرات) — منها يُحسب التقدّم =====
function courseUnitAdd(k){
  var c=courseObj(k); if(!c)return;
  openInputDialog({title:'وحدة جديدة',sub:'أسبوع، محاضرة، فصل… أي خطوة يتقدّم بها المساق',placeholder:'مثلاً: الأسبوع ٣ — الخوارزميات',confirmText:'أضِف',onOk:function(v){
    if(v===null||!String(v).trim())return;
    c.units.push({t:String(v).trim(),done:false}); save(); renderCourses();
  }});
}
function courseUnitToggle(k,i){
  var c=courseObj(k); if(!c||!c.units[i])return;
  c.units[i].done=!c.units[i].done;
  if(c.units[i].done){ if(typeof playClick==='function')playClick(); }
  save(); renderCourses(); if(typeof updateStats==='function')updateStats();
  if(courseProg(k)===100&&typeof celebrate==='function')celebrate();
}
// من وحدة إلى واجب: يقفل الفجوة بين «منهج المساق» و«ديوان الواجبات» بضغطة واحدة
function courseUnitTask(k,i){
  var c=courseObj(k); if(!c||!c.units[i])return;
  var title=c.label+' — '+c.units[i].t;
  if((S.tasks||[]).some(function(t){ return !t.archived&&t.text===title; })){
    notify('الواجب ده موجود بالفعل في الديوان','info'); return;
  }
  S.tasks.unshift({
    id:Date.now(), text:title, subject:k, category:c.label,
    priority:'mid', pomo:2, estMin:0, actualSessions:0,
    deadline:'', repeat:'none', lastReset:todayKey(), today:false,
    archived:false, highYield:false, done:false, steps:[], expanded:false
  });
  save();
  if(typeof renderTasks==='function')renderTasks();
  actionToast('أُضيف «'+title+'» للديوان','افتح الديوان','list-plus',function(){ navTo('tasks'); });
}
function courseUnitDel(k,i){
  var c=courseObj(k); if(!c||!c.units[i])return;
  var u=c.units[i]; c.units.splice(i,1); save(); renderCourses();
  undoToast('حُذفت «'+u.t+'»',function(){ c.units.splice(i,0,u); save(); renderCourses(); });
}
// قوالب جاهزة — كلها قابلة للتعديل والحذف بعد الإضافة
var COURSE_TEMPLATES={
  cs50:{name:'CS50x — أسابيع المنهج',units:['الأسبوع ٠ — Scratch','الأسبوع ١ — C','الأسبوع ٢ — المصفوفات','الأسبوع ٣ — الخوارزميات','الأسبوع ٤ — الذاكرة','الأسبوع ٥ — هياكل البيانات','الأسبوع ٦ — Python','الأسبوع ٧ — SQL','الأسبوع ٨ — HTML/CSS/JS','الأسبوع ٩ — Flask','الأسبوع ١٠ — الأمن السيبراني','المشروع النهائي']},
  weeks12:{name:'١٢ أسبوع',units:null,gen:function(){ var a=[],i; for(i=1;i<=12;i++)a.push('الأسبوع '+arN(i)); return a; }},
  lec14:{name:'١٤ محاضرة',units:null,gen:function(){ var a=[],i; for(i=1;i<=14;i++)a.push('محاضرة '+arN(i)); return a; }}
};
function courseSeed(k,tpl){
  var c=courseObj(k), t=COURSE_TEMPLATES[tpl]; if(!c||!t)return;
  var list=t.units||t.gen();
  var added=0;
  list.forEach(function(title){
    if(c.units.some(function(u){return u.t===title;}))return;
    c.units.push({t:title,done:false}); added++;
  });
  save(); renderCourses();
  notify('أُضيفت '+arN(added)+' وحدة من «'+t.name+'» ✓','list-plus');
}

// ===== مزامنة الواجهة: القوائم المنسدلة وتبويبات الفلترة تُبنى من الحالة =====
function courseOptionsHtml(cur,withGen,noneLabel){
  var keys=courseActive();
  // المساق المحدَّد حالياً يظل ظاهراً حتى لو أُرشِف (كي لا تختفي مهمة قديمة من الفلترة)
  if(cur&&cur!=='gen'&&keys.indexOf(cur)<0&&S.subjects&&S.subjects[cur])keys=keys.concat([cur]);
  // خيار «بلا مساق» أولاً وافتراضياً — مش كل مهمة بتخصّ مادة، وإجبار الاختيار كان بيخلّي
  // إضافة أي مهمة تتطلّب قراراً لا معنى له (شكوى المالك)
  var html=noneLabel?('<option value=""'+(cur?'':' selected')+'>'+esc(noneLabel)+'</option>'):'';
  html+=keys.map(function(k){
    return '<option value="'+k+'"'+(k===cur?' selected':'')+'>'+esc(subjLabel(k))+'</option>';
  }).join('');
  if(withGen)html+='<option value="gen"'+(cur==='gen'?' selected':'')+'>عام</option>';
  return html;
}
function syncCourseSelects(){
  ['pomo-subject','task-subject'].forEach(function(id){
    var sel=document.getElementById(id); if(!sel)return;
    var cur=sel.value;
    sel.innerHTML=courseOptionsHtml(cur,id==='pomo-subject',id==='task-subject'?'بلا مساق':'');
    if(cur&&sel.querySelector('option[value="'+cur+'"]'))sel.value=cur;
    else if(sel.options.length)sel.selectedIndex=0;
  });
}
function renderCourseTabs(){
  var wrap=document.getElementById('task-subj-tabs'); if(!wrap)return;
  var keys=courseActive();
  if(!keys.length){ wrap.innerHTML=''; return; }
  wrap.innerHTML=keys.map(function(k){
    return '<button class="tab'+(taskFilter===k?' active':'')+'" onclick="filterTasks(\''+k+'\',this)">'+esc(subjLabel(k))+'</button>';
  }).join('');
}
function refreshCourseUI(){
  syncCourseSelects(); renderCourseTabs();
  if(typeof renderCourses==='function')renderCourses();
  if(typeof renderGpa==='function')renderGpa();
  if(typeof renderSchedule==='function')renderSchedule();
  if(typeof renderTodayClasses==='function')renderTodayClasses();
  if(typeof renderPhaseBanner==='function')renderPhaseBanner();
  if(typeof renderTasks==='function')renderTasks();
  if(typeof renderSrsPanel==='function'){ try{renderSrsPanel();}catch(e){} }
  if(typeof renderSrsCard==='function'){ try{renderSrsCard();}catch(e){} }
}

// ===== صفحة «مسار العلم»: مدير المساقات =====
function progHeatColor(p){ return p>=90?'#ca8a04':p>=66?'#16a34a':p>=33?'#f59e0b':'#ef4444'; }
function courseCardHtml(k){
  var c=courseObj(k), p=courseProg(k), mins=courseMinutes(k);
  var hasUnits=!!(c.units&&c.units.length);
  var openKey=(S.settings&&S.settings.courseOpen)||{};
  var open=!!openKey[k];
  var unitsHtml='';
  if(open){
    unitsHtml='<div class="cu-list">'+(hasUnits?c.units.map(function(u,i){
      return '<label class="cu-row'+(u.done?' on':'')+'">'+
        '<input type="checkbox"'+(u.done?' checked':'')+' onchange="courseUnitToggle(\''+k+'\','+i+')">'+
        '<span class="cu-t">'+esc(u.t)+'</span>'+
        '<button class="cu-x" onclick="event.preventDefault();courseUnitTask(\''+k+'\','+i+')" title="حوّلها لواجب في الديوان"><i data-lucide="list-plus"></i></button>'+
        '<button class="cu-x" onclick="event.preventDefault();courseUnitDel(\''+k+'\','+i+')" title="حذف الوحدة"><i data-lucide="x"></i></button></label>';
    }).join(''):'<div class="cu-empty">مافيش وحدات — أضِف أسابيع المنهج فيتحسب تقدّمك تلقائياً بدل ما تقدّره بإيدك</div>')+
    '<div class="cu-add"><button class="btn sm" onclick="courseUnitAdd(\''+k+'\')"><i data-lucide="plus"></i> وحدة</button>'+
      Object.keys(COURSE_TEMPLATES).map(function(t){
        return '<button class="btn sm ghost" onclick="courseSeed(\''+k+'\',\''+t+'\')" title="أضِف وحدات جاهزة (قابلة للتعديل)">'+esc(COURSE_TEMPLATES[t].name)+'</button>';
      }).join('')+'</div>'+
    '<div class="cu-meta">'+
      COURSE_KINDS.map(function(kd){ return '<button class="seg-btn'+(c.kind===kd[0]?' on':'')+'" onclick="courseSetKind(\''+k+'\',\''+kd[0]+'\')">'+kd[1]+'</button>'; }).join('')+
      '<span class="cu-sp"></span>'+
      '<span class="cu-colors">'+COURSE_COLORS.map(function(col){
        return '<button class="cu-col'+(c.color===col?' on':'')+'" style="background:'+col+'" onclick="courseSetColor(\''+k+'\',\''+col+'\')" title="لون"></button>';
      }).join('')+'</span>'+
    '</div>'+
    ((typeof courseGradeHtml==='function')?courseGradeHtml(k):'')+
    '<div class="cu-acts">'+
      '<button class="btn sm" onclick="courseMove(\''+k+'\',-1)" title="لأعلى"><i data-lucide="chevron-up"></i></button>'+
      '<button class="btn sm" onclick="courseMove(\''+k+'\',1)" title="لأسفل"><i data-lucide="chevron-down"></i></button>'+
      '<span class="cu-sp"></span>'+
      '<button class="btn sm" onclick="courseArchiveToggle(\''+k+'\')"><i data-lucide="archive"></i> أرشِف</button>'+
      '<button class="btn sm danger" onclick="courseDelete(\''+k+'\')"><i data-lucide="trash-2"></i> حذف</button>'+
    '</div>';
  }
  return '<div class="course-row'+(open?' open':'')+'">'+
    '<div class="cr-head">'+
      '<button class="cr-caret" onclick="courseToggleOpen(\''+k+'\')" title="'+(open?'طيّ':'تفاصيل ووحدات')+'"><i data-lucide="chevron-'+(open?'down':'left')+'"></i></button>'+
      '<span class="cr-dot" style="background:'+c.color+'"></span>'+
      '<span class="cr-name" onclick="courseRename(\''+k+'\')" title="اضغط للتعديل">'+esc(c.label)+'</span>'+
      '<span class="cr-kind"><i data-lucide="'+kindIcon(c.kind)+'"></i> '+kindLabel(c.kind)+'</span>'+
      '<span class="cr-sp"></span>'+
      (mins?'<span class="cr-min" title="وقت مذاكرة مسجَّل">'+arN(mins)+' د</span>':'')+
      (hasUnits
        ? '<span class="cr-pct" title="محسوب من الوحدات">'+arN(c.units.filter(function(u){return u.done;}).length)+'/'+arN(c.units.length)+'</span>'
        : '<input class="cr-inp" type="number" min="0" max="100" value="'+p+'" onchange="courseSetProg(\''+k+'\',this.value);renderCourses()" title="نسبة يدوية">')+
      '<span class="cr-pctn">'+arN(p)+'٪</span>'+
    '</div>'+
    '<div class="cr-track"'+(hasUnits?'':' onclick="courseClickProg(event,\''+k+'\')"')+'><div class="cr-fill" id="cpf-'+k+'" style="width:'+p+'%;background:'+c.color+'"></div></div>'+
    unitsHtml+
  '</div>';
}
function courseToggleOpen(k){
  if(!S.settings)S.settings={};
  if(!S.settings.courseOpen)S.settings.courseOpen={};
  S.settings.courseOpen[k]=!S.settings.courseOpen[k];
  save(); renderCourses();
}
function renderCourses(){
  var c=document.getElementById('progress-list'); if(!c)return;
  var keys=courseActive(), arch=courseArchivedKeys();
  var hyBySub={}; (S.tasks||[]).forEach(function(t){ if(!t.done&&!t.archived&&t.highYield)hyBySub[t.subject]=(hyBySub[t.subject]||0)+1; });
  var heat=keys.length?('<div class="prog-heat">'+keys.map(function(k){
    var p=courseProg(k), hy=hyBySub[k]||0;
    return '<div class="ph-tile'+(hy?' ph-hot':'')+'" style="background:'+progHeatColor(p)+'" title="'+esc(subjLabel(k))+' — '+p+'٪'+(hy?(' · '+hy+' واجب أولى بالتقديم'):'')+'" onclick="navTo(\'tasks\');setTimeout(function(){filterTasks(\''+k+'\')},120)">'+
      '<span class="ph-lbl">'+esc(subjLabel(k))+'</span><span class="ph-pct">'+arN(p)+'٪</span>'+
      (hy?'<span class="ph-mark">🎯 '+arN(hy)+'</span>':(p>=90?'<span class="ph-mark">⭐</span>':''))+'</div>';
  }).join('')+'</div>'):'';

  var body=keys.length
    ? keys.map(courseCardHtml).join('')
    : '<div class="empty empty-big"><i data-lucide="library"></i><div class="empty-title">مافيش مساقات لسه</div>'+
      '<div class="empty-sub">أضِف مواد الترم أو الكورس اللي بتذاكره دلوقتي — وكل حاجة تانية هتتربط بيها</div>'+
      '<button class="btn pri" onclick="courseAddPrompt()"><i data-lucide="plus"></i> أضِف أوّل مساق</button></div>';

  var archHtml='';
  if(arch.length){
    var showArch=!!(S.settings&&S.settings.showArchivedCourses);
    archHtml='<div class="course-arch">'+
      '<button class="btn sm" onclick="toggleArchivedCourses()"><i data-lucide="archive"></i> المؤرشفة ('+arN(arch.length)+') '+(showArch?'▴':'▾')+'</button>'+
      (showArch?('<div class="arch-list">'+arch.map(function(k){
        return '<div class="arch-row"><span class="cr-dot" style="background:'+subjColor(k)+'"></span><span class="arch-n">'+esc(subjLabel(k))+'</span>'+
          (courseMinutes(k)?'<span class="arch-m">'+arN(courseMinutes(k))+' د محفوظة</span>':'')+
          '<button class="btn sm" onclick="courseArchiveToggle(\''+k+'\')"><i data-lucide="archive-restore"></i> إرجاع</button></div>';
      }).join('')+'</div>'):'')+'</div>';
  }

  c.innerHTML='<div class="card-title"><i data-lucide="library"></i> مساقاتي'+
      '<button class="btn sm pri ct-add" onclick="courseAddPrompt()"><i data-lucide="plus"></i> مساق</button></div>'+
    (keys.length?'<div class="cr-hint">اضغط السهم لفتح وحدات المساق · اضغط الاسم لتعديله</div>':'')+
    heat+body+archHtml;
  icons();
}
function toggleArchivedCourses(){
  if(!S.settings)S.settings={};
  S.settings.showArchivedCourses=!S.settings.showArchivedCourses;
  save(); renderCourses();
}
// اسم قديم مُستخدَم في refreshAll و shell — يبقى شغّالاً (يجمع بطاقات صفحة «مسار العلم»)
function renderProgress(){
  renderCourses(); renderTerm();
  if(typeof renderGpa==='function')renderGpa();
  if(typeof renderSchedule==='function')renderSchedule();
}

// =====================================================================
// الفصل الدراسي + المواعيد المتعددة (حلّ محلّ «عدّاد الثانوية» الواحد)
// =====================================================================
var DL_KINDS=[['exam','امتحان','file-text'],['assign','تسليم','upload'],['other','موعد','calendar']];
function dlKindLabel(k){ for(var i=0;i<DL_KINDS.length;i++)if(DL_KINDS[i][0]===k)return DL_KINDS[i][1]; return 'موعد'; }
function dlKindIcon(k){ for(var i=0;i<DL_KINDS.length;i++)if(DL_KINDS[i][0]===k)return DL_KINDS[i][2]; return 'calendar'; }

function termState(){ if(!S.term||typeof S.term!=='object')S.term={name:'',start:'',end:''}; return S.term; }
// معلومات الترم: الأسبوع الحالي من الإجمالي + نسبة الانقضاء (علاج عمى الزمن)
function termInfo(){
  var t=termState();
  if(!t.start||!t.end)return null;
  var s=new Date(t.start+'T00:00:00'), e=new Date(t.end+'T23:59:59'), now=new Date();
  if(isNaN(s)||isNaN(e)||e<=s)return null;
  var span=e-s, gone=Math.max(0,Math.min(span,now-s));
  var totalWeeks=Math.max(1,Math.ceil(span/604800000));
  var curWeek=Math.max(1,Math.min(totalWeeks,Math.ceil((gone||1)/604800000)));
  return {
    name:t.name||'الترم الحالي', start:s, end:e,
    totalWeeks:totalWeeks, curWeek:curWeek,
    pct:Math.round(gone/span*100),
    daysLeft:Math.max(0,Math.ceil((e-now)/86400000)),
    started:now>=s, ended:now>e
  };
}
function settTermChanged(){
  var t=termState();
  var n=document.getElementById('sett-term-name'); if(n)t.name=n.value.trim();
  var s=document.getElementById('sett-term-start'); if(s)t.start=s.value||'';
  var e=document.getElementById('sett-term-end'); if(e)t.end=e.value||'';
  save(); renderTerm();
}

// ---- المواعيد ----
function deadlines(){ if(!Array.isArray(S.deadlines))S.deadlines=[]; return S.deadlines; }
function deadlineSorted(includeDone){
  return deadlines().filter(function(d){ return includeDone||!d.done; })
    .sort(function(a,b){ return new Date(a.date+'T'+(a.time||'08:00'))-new Date(b.date+'T'+(b.time||'08:00')); });
}
// أقرب موعد قادم لم يفُت ولم يُنجَز — هو ما يعرضه عدّاد الرئيسية
function nextDeadline(){
  var now=new Date();
  var up=deadlineSorted(false).filter(function(d){ return new Date(d.date+'T'+(d.time||'08:00'))>now; });
  return up[0]||null;
}
function deadlineAdd(){
  var ti=document.getElementById('dl-title'), da=document.getElementById('dl-date'),
      tm=document.getElementById('dl-time'), kd=document.getElementById('dl-kind'), sb=document.getElementById('dl-subject');
  var title=(ti&&ti.value.trim())||'', date=(da&&da.value)||'';
  if(!title){ notify('اكتب اسم الموعد الأول','alert-circle'); if(ti)ti.focus(); return; }
  if(!date){ notify('اختَر التاريخ','calendar'); if(da)da.focus(); return; }
  deadlines().push({
    id:Date.now(), title:title, date:date, time:(tm&&tm.value)||'08:00',
    kind:(kd&&kd.value)||'exam', subject:(sb&&sb.value)||'', done:false, addedAt:todayKey()
  });
  if(ti)ti.value=''; if(da)da.value='';
  save(); renderTerm();
  if(typeof renderExamCountdown==='function')renderExamCountdown();
  notify('أُضيف «'+title+'» ✓','calendar-plus');
}
function deadlineToggle(id){
  var d=deadlines().filter(function(x){return x.id===id;})[0]; if(!d)return;
  d.done=!d.done; save(); renderTerm();
  if(typeof renderExamCountdown==='function')renderExamCountdown();
  if(d.done&&typeof flashDone==='function')flashDone();
}
function deadlineDel(id){
  var arr=deadlines(), i=-1, j;
  for(j=0;j<arr.length;j++)if(arr[j].id===id)i=j;
  if(i<0)return;
  var d=arr[i]; arr.splice(i,1); save(); renderTerm();
  if(typeof renderExamCountdown==='function')renderExamCountdown();
  undoToast('حُذف «'+d.title+'»',function(){ arr.splice(i,0,d); save(); renderTerm(); if(typeof renderExamCountdown==='function')renderExamCountdown(); });
}
function dlDaysLeft(d){ return Math.ceil((new Date(d.date+'T'+(d.time||'08:00'))-new Date())/86400000); }
function dlTone(n){ return n<0?'over':n<=2?'urgent':n<=7?'soon':'ok'; }

function renderTerm(){
  var el=document.getElementById('term-card'); if(!el)return;
  var info=termInfo();
  var termHtml;
  if(info){
    var tone=info.ended?'done':(info.pct>=80?'soon':'ok');
    termHtml='<div class="term-live '+tone+'">'+
      '<div class="term-top"><span class="term-name">'+esc(info.name)+'</span>'+
        '<span class="term-week">'+(info.ended?'انتهى الترم':(info.started?('الأسبوع '+arN(info.curWeek)+' من '+arN(info.totalWeeks)):'لم يبدأ بعد'))+'</span></div>'+
      '<div class="term-track"><div class="term-fill" style="width:'+info.pct+'%"></div></div>'+
      '<div class="term-meta">'+(info.ended?'&nbsp;':('باقي '+arN(info.daysLeft)+' يوم · انقضى '+arN(info.pct)+'٪'))+'</div></div>';
  }else{
    termHtml='<div class="term-live empty"><i data-lucide="calendar-range"></i> حدّد بداية ونهاية الترم من الضبط ليظهر «أنت في الأسبوع كذا»'+
      '<button class="btn sm" onclick="navTo(\'settings\')"><i data-lucide="settings-2"></i> حدّده</button></div>';
  }

  var list=deadlineSorted(true);
  var rows=list.length?list.map(function(d){
    var n=dlDaysLeft(d), tone=d.done?'done':dlTone(n);
    var when=d.done?'تمّ':(n<0?('فات منذ '+arN(-n)+' يوم'):n===0?'اليوم!':n===1?'غداً':('باقي '+arN(n)+' يوم'));
    return '<div class="dl-row '+tone+'">'+
      '<button class="dl-check'+(d.done?' on':'')+'" onclick="deadlineToggle('+d.id+')" title="'+(d.done?'إرجاع':'تمّ')+'"><i data-lucide="'+(d.done?'check-circle-2':'circle')+'"></i></button>'+
      '<i class="dl-ic" data-lucide="'+dlKindIcon(d.kind)+'"></i>'+
      '<span class="dl-t">'+esc(d.title)+'</span>'+
      (d.subject?'<span class="dl-sub" style="background:'+subjColor(d.subject)+'">'+esc(subjLabel(d.subject))+'</span>':'')+
      '<span class="dl-sp"></span>'+
      '<span class="dl-date">'+formatIslamicDate(new Date(d.date+'T12:00:00'))+'</span>'+
      '<span class="dl-left">'+when+'</span>'+
      '<button class="dl-x" onclick="deadlineDel('+d.id+')" title="حذف"><i data-lucide="trash-2"></i></button>'+
      '</div>';
  }).join(''):'<div class="cu-empty">مافيش مواعيد مسجّلة — أضِف امتحان أو تسليم فيظهر عدّاده بالرئيسية</div>';

  el.innerHTML='<div class="card-title"><i data-lucide="calendar-clock"></i> الفصل الدراسي والمواعيد</div>'+
    termHtml+
    '<div class="dl-add">'+
      '<input id="dl-title" placeholder="اسم الموعد — مثلاً: تسليم Pset 3" onkeydown="if(event.key===\'Enter\')deadlineAdd()">'+
      '<select id="dl-kind">'+DL_KINDS.map(function(k){return '<option value="'+k[0]+'">'+k[1]+'</option>';}).join('')+'</select>'+
      '<select id="dl-subject"><option value="">بلا مساق</option>'+courseOptionsHtml('',false)+'</select>'+
      '<input type="date" id="dl-date">'+
      '<input type="time" id="dl-time" value="08:00">'+
      '<button class="btn pri" onclick="deadlineAdd()"><i data-lucide="plus"></i> أضِف</button>'+
    '</div>'+
    '<div class="dl-list">'+rows+'</div>';
  icons();
}

// =====================================================================
// شريط التحوّل — «مساقاتك لسه بتاعة المرحلة السابقة»
// الدرس: بنينا «اطوِ الصفحة السابقة» وسِبناه زرّاً مدفوناً بالضبط، فالتطبيق فضل
// شكله زي ما هو والمالك حسّ إن مفيش حاجة اتغيّرت. التحوّل لازم يقابله في وشّه.
// =====================================================================
var LEGACY_KEYS={en:1,bio:1,geo:1,chem:1,phy:1};   // مفاتيح مواد الثانوية المكتوبة بالكود قديماً
// دالة صِرفة (مُختبَرة): أي حالة انتقالية عليها المستخدم؟
function phaseStateOf(subjects,tasks){
  subjects=subjects||{};
  var act=Object.keys(subjects).filter(function(k){ return !subjects[k].archived; });
  if(!act.length)return 'empty';                                   // مافيش مساقات نشطة خالص
  var legacy=act.filter(function(k){ return LEGACY_KEYS[k]; });
  if(legacy.length===act.length)return 'legacy';                   // كلها من المرحلة السابقة
  return 'ok';
}
function phaseState(){ return phaseStateOf(S.subjects,S.tasks); }
function phaseBannerDismiss(){
  if(!S.settings)S.settings={};
  S.settings.phaseBannerOff=true; save(); renderPhaseBanner();
}
function renderPhaseBanner(){
  var el=document.getElementById('phase-banner'); if(!el)return;
  var st=phaseState();
  if(st==='ok'||(S.settings&&S.settings.phaseBannerOff)){ el.style.display='none'; return; }
  el.style.display='';
  if(st==='legacy'){
    var names=courseActive().map(function(k){return subjLabel(k);}).slice(0,3).join('، ');
    el.innerHTML='<div class="pb-in"><i data-lucide="book-open-check"></i>'+
      '<div class="pb-tx"><div class="pb-t">مساقاتك لسه بتاعة المرحلة السابقة</div>'+
        '<div class="pb-s">'+esc(names)+'… — اطوِ الصفحة دي وابدأ مساقات الكلية. صلاتك وعاداتك وسلاسلك وساعاتك كلها تفضل زي ما هي، والطيّ يتراجع بضغطة.</div></div>'+
      '<div class="pb-ac"><button class="btn pri" onclick="startNewChapter()"><i data-lucide="book-open-check"></i> اطوِ الصفحة</button>'+
        '<button class="btn sm ghost" onclick="phaseBannerDismiss()">مش دلوقتي</button></div></div>';
  }else{
    el.innerHTML='<div class="pb-in"><i data-lucide="library"></i>'+
      '<div class="pb-tx"><div class="pb-t">ابدأ بإضافة مساقاتك</div>'+
        '<div class="pb-s">مواد الترم، أو الكورس اللي بتذاكره دلوقتي (CS50 مثلاً). المهام والمواعيد والدرجات كلها هتتربط بيها — ولو مهمة مش بتخصّ مساق سِبها «بلا مساق».</div></div>'+
      '<div class="pb-ac"><button class="btn pri" onclick="courseAddPrompt()"><i data-lucide="plus"></i> أضِف مساق</button>'+
        '<button class="btn sm ghost" onclick="phaseBannerDismiss()">مش دلوقتي</button></div></div>';
  }
  icons();
}

// «وضع الإجازة» — اختياري مُطفأ: حِمل أخفّ ونبرة أهدأ (فترة الكورسات الخفيفة)
function toggleLightLoad(){
  if(!S.settings)S.settings={};
  S.settings.lightLoad=!S.settings.lightLoad;
  if(S.settings.lightLoad){
    if(!S.goals)S.goals={dailyItems:[],weeklyItems:[],dailyMin:120,weeklyMin:600};
    if(!S.settings.lightLoadPrev)S.settings.lightLoadPrev={daily:S.goals.dailyMin,weekly:S.goals.weeklyMin};
    S.goals.dailyMin=45; S.goals.weeklyMin=240;
  }else if(S.settings.lightLoadPrev){
    S.goals.dailyMin=S.settings.lightLoadPrev.daily||120;
    S.goals.weeklyMin=S.settings.lightLoadPrev.weekly||600;
    S.settings.lightLoadPrev=null;
  }
  document.body.classList.toggle('light-load',!!S.settings.lightLoad);
  save(); syncLightLoadBtn();
  if(typeof renderMaqasid==='function')renderMaqasid();
  if(typeof updateGoalBar==='function')updateGoalBar();
  notify(S.settings.lightLoad?'وضع الإجازة مُفعَّل — هدف اليوم ٤٥ دقيقة، وعلى مهلك':'رجع الحِمل المعتاد ✓','palmtree');
}
// =====================================================================
// «ابدأ مرحلة جديدة» — طيّ صفحة المرحلة السابقة بلا حذف
// يؤرشف المساقات النشطة وواجباتها ويُنهي المواعيد الفائتة. لا يمسّ العبادة
// ولا العادات ولا السلاسل ولا XP ولا سجلّ الدقائق — استمرارية كاملة.
// =====================================================================
function newChapterPreview(){
  var courses=courseActive();
  var tasks=(S.tasks||[]).filter(function(t){ return !t.archived&&courses.indexOf(t.subject)>=0; });
  var now=new Date();
  var past=deadlines().filter(function(d){ return !d.done&&new Date(d.date+'T'+(d.time||'08:00'))<now; });
  return {courses:courses,tasks:tasks,past:past};
}
function startNewChapter(){
  var p=newChapterPreview();
  if(!p.courses.length&&!p.tasks.length&&!p.past.length){ notify('مافيش حاجة تُؤرشَف — إنت بادئ من نظيف','sparkles'); return; }
  // نسمّي المساقات صراحةً — لو فيها مساق للمرحلة الجديدة يشوفه ويلغي (الترتيب الصحيح: اطوِ الصفحة أولاً ثم أضِف)
  var names=p.courses.map(function(k){ return subjLabel(k); });
  var shown=names.slice(0,6).join('، ')+(names.length>6?(' و'+arN(names.length-6)+' غيرها'):'');
  askConfirm(
    'هَنطوي صفحة المرحلة السابقة: أرشفة '+arN(p.courses.length)+' مساق و'+arN(p.tasks.length)+' واجب و'+arN(p.past.length)+' موعد فات.\n'+
    (names.length?('المساقات: '+shown+'\n'):'')+
    'الصلاة والعادات والسلاسل وسجلّ ساعاتك كلها تفضل زي ما هي — والأرشفة تتراجع بضغطة.',
    function(){
      var undoC=p.courses.slice(), undoT=p.tasks.map(function(t){return t.id;}), undoD=p.past.slice();
      undoC.forEach(function(k){ S.subjects[k].archived=true; });
      p.tasks.forEach(function(t){ t.archived=true; });
      p.past.forEach(function(d){ d.done=true; });
      if(S.settings)S.settings.phaseBannerOff=false;   // الخطوة الجاية (أضِف مساقاتك) لازم تبان
      save(); refreshCourseUI(); renderTerm();
      if(typeof renderExamCountdown==='function')renderExamCountdown();
      if(typeof updateStats==='function')updateStats();
      undoToast('طُويت المرحلة السابقة — كل شيء محفوظ',function(){
        undoC.forEach(function(k){ if(S.subjects[k])S.subjects[k].archived=false; });
        (S.tasks||[]).forEach(function(t){ if(undoT.indexOf(t.id)>=0)t.archived=false; });
        undoD.forEach(function(d){ d.done=false; });
        save(); refreshCourseUI(); renderTerm();
        if(typeof renderExamCountdown==='function')renderExamCountdown();
      });
    },
    {confirmText:'اطوِ الصفحة',danger:false}
  );
}
function syncLightLoadBtn(){
  var on=!!(S.settings&&S.settings.lightLoad);
  var b=document.getElementById('lightload-btn'), l=document.getElementById('lightload-lbl');
  if(b)b.classList.toggle('on',on);
  if(l)l.textContent=on?'مُفعَّل':'مُطفأ';
  document.body.classList.toggle('light-load',on);
}
