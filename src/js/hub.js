// hub.js — «المِنصّة»: شاشة إطلاق ببطاقات أقسام كبيرة + شريط تنقّل علويّ لكل قسم.
// يحوّل التطبيق من قائمة طويلة إلى «بيتٍ بغرف» — أقلّ تشتّتاً لعقل ADHD.
// classic script (globals shared). يُحمّل بعد customize قبل palette.

// أيقونات بروح إسلامية (SVG مخصّصة — تُحقَن مباشرة، لا عبر lucide)
var ISLAMIC_SVG={
  mosque:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c1.6 1.9 3 3.1 3 4.6C15 8.1 13.7 9 12 9S9 8.1 9 6.6C9 5.1 10.4 3.9 12 2Z"/><path d="M4 21v-6.5a8 8 0 0 1 16 0V21"/><path d="M2.5 21h19"/><path d="M10 21v-3a2 2 0 0 1 4 0v3"/><path d="M5 12.5V8.5M19 12.5V8.5"/></svg>',
  crescent:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A7.5 7.5 0 1 1 11.2 5a6 6 0 0 0 9.3 9.5Z"/><path d="M18 3.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7Z"/></svg>',
  star8:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="5.5" y="5.5" width="13" height="13" rx="1.2"/><rect x="5.5" y="5.5" width="13" height="13" rx="1.2" transform="rotate(45 12 12)"/></svg>'
};
function iconHtml(name){ return ISLAMIC_SVG[name] ? ISLAMIC_SVG[name] : '<i data-lucide="'+name+'"></i>'; }
// (المرحلة ١) أُلغي قسم «يومي»: «الرئيسية» تبقى صفحة يُوصَل إليها عبر زر «اليوم بالتفصيل»
// في المِنصّة، و«نظرة سريعة» انتقلت لأعلى الشاشة الرئيسية (renderHubQuick بالأسفل).
var SECTIONS=[
  {id:'ghaya', label:'الغاية',  icon:'mosque',     desc:'العبادة وصفاء القلب', pages:[
    {id:'praytrack', label:'الصلاة', icon:'check-circle-2'},
    {id:'quran', label:'القرآن', icon:'book-open'},
    {id:'qiyam', label:'قيام الليل', icon:'moon'},
    {id:'habits', label:'المداومة', icon:'repeat'},
    {id:'recovery', label:'الطُّهر', icon:'shield-check', priv:true}
  ]},
  {id:'thaghr', label:'الثغر',  icon:'swords',     desc:'الجِدّ والإنجاز', pages:[
    {id:'pomodoro', label:'الجِدّ', icon:'timer'},
    {id:'tasks', label:'ديوان الواجبات', icon:'check-square'},
    {id:'sport', label:'الرياضة', icon:'dumbbell'},
    {id:'braindump', label:'استجلاء الذهن', icon:'inbox'}
    // أُزيل «الروتين» (غير مُستخدَم)؛ «المقاصد» صارت مؤشّراً بالرئيسية والجِدّ
  ]},
  {id:'miraa', label:'المرآة',  icon:'scale',      desc:'محاسبة النفس', pages:[
    {id:'stats', label:'الميزان', icon:'scale'},
    {id:'xp', label:'رحلة السعي', icon:'map'},
    {id:'progress', label:'مسار العلم', icon:'bar-chart-3'}
    // أُزيلت «دراسة متقدمة» (غير مُستخدَمة)؛ «النهوض» اندمج بالرئيسية
  ]},
  {id:'manage', label:'الضبط',  icon:'settings-2', desc:'تخصيص كل شيء', pages:[
    {id:'settings', label:'الضبط', icon:'settings-2'}
  ]}
];
var currentSection=null;

function sectionById(secId){ for(var i=0;i<SECTIONS.length;i++)if(SECTIONS[i].id===secId)return SECTIONS[i]; return null; }
function sectionOf(pageId){ for(var i=0;i<SECTIONS.length;i++){ for(var j=0;j<SECTIONS[i].pages.length;j++){ if(SECTIONS[i].pages[j].id===pageId)return SECTIONS[i]; } } return null; }
function pageVisible(p){
  if(p.priv&&!(S.recovery&&S.recovery.enabled))return false;
  if(typeof isHidden==='function'&&isHidden(p.id))return false;
  return true;
}
function firstVisiblePage(sec){ for(var i=0;i<sec.pages.length;i++){ if(pageVisible(sec.pages[i]))return sec.pages[i].id; } return sec.pages[0].id; }

// «المِنصّة» اندمجت في الرئيسية — العودة للمِنصّة = العودة للرئيسية (لوحة واحدة غنية)
function goHub(){ currentSection=null; navTo('home'); }
function enterSection(secId){ var sec=sectionById(secId); if(!sec)return; currentSection=secId; showPage(firstVisiblePage(sec)); }
// تنقّل عام: يحدّد القسم ثم يعرض الصفحة (يبقى متوافقاً مع كل المستدعين)
function navTo(id){ if(id==='hub'){ goHub(); return; } var sec=sectionOf(id); if(sec)currentSection=sec.id; showPage(id); }

// حارس التشتّت — تنبيه لطيف إن أكثرتَ التنقّل بلا جلسة
var navCount=0, distractNudged=false;
function resetDistract(){ navCount=0; distractNudged=false; }
// يُستدعى من showPage بعد عرض أي صفحة
function onPageShown(id){
  if(id!=='hub'){ var sec=sectionOf(id); if(sec)currentSection=sec.id; }
  renderTopNav();
  if(id==='xp'&&typeof renderXP==='function')renderXP();
  if(id!=='hub'){
    navCount++;
    var running=(typeof isRunning!=='undefined'&&isRunning);
    if(navCount>=12 && !running && !distractNudged){
      distractNudged=true;
      setTimeout(function(){ try{ notify('أراك تتنقّل كثيراً — ما رأيك بجلسة ٥ دقائق؟ اضغط Ctrl+K','compass'); }catch(e){} },350);
    }
  }
}

// التبويبات الرئيسية في شريط العنوان نفسه (tb-sections)؛ تبويبات القسم الفرعية في الصفحة.
function renderTopNav(){
  var el=document.getElementById('topnav'); if(!el)return;
  document.body.classList.remove('on-hub');
  var sec=sectionOf(currentPage);
  var homeBtn='<button class="topsec'+(currentPage==='home'?' active':'')+'" onclick="navTo(\'home\')" title="الرئيسية"><i data-lucide="layout-dashboard"></i><span>الرئيسية</span></button>';
  var secBtns=SECTIONS.map(function(s){
    var on=!!(sec&&sec.id===s.id);
    return '<button class="topsec sec-'+s.id+(on?' active':'')+'" onclick="enterSection(\''+s.id+'\')" title="'+s.desc+'">'+iconHtml(s.icon)+'<span>'+s.label+'</span></button>';
  }).join('');
  var tb=document.getElementById('tb-sections');
  if(tb){ tb.innerHTML=homeBtn+secBtns; el.innerHTML=''; }
  // تبويبات صفحات القسم الحالي (تظهر في الصفحة عادي)
  var row2='';
  if(sec){
    var tabs=sec.pages.filter(pageVisible).map(function(p){
      return '<button class="nav-btn tab-top'+(p.id===currentPage?' active':'')+'" data-page="'+p.id+'" onclick="showPage(\''+p.id+'\',this)" title="'+p.label+'"><i data-lucide="'+p.icon+'"></i><span class="tt-lbl">'+p.label+'</span>'+tabBadge(p.id)+'</button>';
    }).join('');
    row2='<div class="topnav-tabs sec-'+sec.id+'">'+tabs+'</div>';
  }
  el.innerHTML=(tb?'':'<div class="topnav-sections">'+homeBtn+secBtns+'</div>')+row2;
  icons();
}

// شارة تنبيه صغيرة على التبويب — أحمر للصلوات الفائتة، برتقالي للواجبات المتأخرة
function tabBadge(pageId){
  if(pageId==='praytrack'){
    var miss=(typeof qadaPending==='function')?qadaPending():0;
    if(miss>0)return '<span class="tab-badge tb-red" title="صلوات فائتة">'+(miss>9?'9+':miss)+'</span>';
  }
  if(pageId==='tasks'){
    var todayMid=new Date(new Date().toDateString()).getTime();
    var over=(S.tasks||[]).filter(function(t){return !t.done&&!t.archived&&t.deadline&&parseLocalDate(t.deadline).getTime()<todayMid;}).length;
    if(over>0)return '<span class="tab-badge tb-amber" title="واجبات متأخرة">'+(over>9?'9+':over)+'</span>';
  }
  return '';
}
// (حُذفت دوال المِنصّة القديمة renderHub/renderHubAction/renderHubQuick/hubStat —
//  كانت ترسم في صفحة #page-hub المحذوفة وتُهدر تنفيذاً مع كل refresh)
