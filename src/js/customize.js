// customize.js — وضع التخصيص الكامل: إظهار/إخفاء أي ميزة فردياً + وضع مبسّط + واجهة Pro.
// classic script (globals shared). يُحمّل بعد recovery قبل palette.

// سجل المزايا القابلة للإخفاء — nav: صفحة بالقائمة · el: عنصر واجهة (يُخفى بصنف body)
var FEATURES=[
  {g:'الصفحات', items:[
    {id:'praytrack',label:'الصلاة',type:'nav'},
    {id:'quran',label:'القرآن',type:'nav'},
    {id:'qiyam',label:'قيام الليل',type:'nav'},
    {id:'habits',label:'المداومة',type:'nav'},
    {id:'pomodoro',label:'الجِدّ',type:'nav'},
    {id:'tasks',label:'ديوان الواجبات',type:'nav'},
    {id:'sport',label:'الرياضة',type:'nav'},
    {id:'braindump',label:'استجلاء الذهن',type:'nav'},
    {id:'progress',label:'مسار العلم',type:'nav'},
    {id:'stats',label:'الميزان',type:'nav'},
    {id:'xp',label:'رحلة السعي',type:'nav'}
  ]},
  {g:'عناصر الرئيسية والواجهة', items:[
    {id:'exam-countdown',label:'عدّاد الامتحان',type:'el',sel:'#exam-countdown'},
    {id:'rituals',label:'الطاقة + النية',type:'el',sel:'.home-rituals-bar'},
    {id:'prayerbar',label:'شريط الصلاة السفلي',type:'el',sel:'#prayer-status-bar'},
    {id:'sakina',label:'زر سكينة العائم',type:'el',sel:'#sakina-fab'}
  ]}
];
var SIMPLE_HIDE=['braindump','stats','progress'];

function hiddenList(){ if(!S.settings)S.settings={}; if(!Array.isArray(S.settings.hidden))S.settings.hidden=[]; return S.settings.hidden; }
function isHidden(id){ return hiddenList().indexOf(id)>=0; }
function toggleFeature(id){
  var h=hiddenList(); var i=h.indexOf(id);
  if(i>=0)h.splice(i,1); else h.push(id);
  save(); applyFeatureVisibility();
  if(typeof renderTopNav==='function')renderTopNav();
  if(typeof renderHome==='function'){try{renderHome();}catch(e){}}
  renderFeatureToggles();
  // إن أُخفيت الصفحة الحالية → عُد للرئيسية
  if(isHidden(id)&&currentPage===id&&typeof navTo==='function')navTo('home');
}
function applyFeatureVisibility(){
  // أزِل أصناف الإخفاء القديمة ثم أضِف الحالية (دون المساس بالثيم/الشريط/الخط)
  var rm=[]; document.body.classList.forEach(function(c){ if(c.indexOf('hf-')===0)rm.push(c); });
  rm.forEach(function(c){ document.body.classList.remove(c); });
  hiddenList().forEach(function(id){ document.body.classList.add('hf-'+id); });
}
function simplifyPreset(){
  if(!S.settings)S.settings={};
  S.settings.hidden=SIMPLE_HIDE.slice();
  save(); applyFeatureVisibility();
  if(typeof renderTopNav==='function')renderTopNav();
  if(typeof renderHome==='function'){try{renderHome();}catch(e){}}
  renderFeatureToggles();
  notify('فُعّل الوضع المبسّط — أُخفيت المزايا المتقدمة','minimize-2');
}
function showAllFeatures(){
  if(!S.settings)S.settings={};
  S.settings.hidden=[];
  save(); applyFeatureVisibility();
  if(typeof renderTopNav==='function')renderTopNav();
  if(typeof renderHome==='function'){try{renderHome();}catch(e){}}
  renderFeatureToggles();
  notify('أُظهرت كل المزايا','eye');
}
function renderFeatureToggles(){
  var el=document.getElementById('feature-toggles'); if(!el)return;
  el.innerHTML=FEATURES.map(function(grp){
    return '<div class="ft-group"><div class="ft-group-t">'+grp.g+'</div>'+
      grp.items.map(function(f){
        var on=!isHidden(f.id);   // on = ظاهرة
        return '<label class="ft-row"><span class="ft-label">'+f.label+'</span>'+
          '<span class="ft-switch'+(on?' on':'')+'" onclick="toggleFeature(\''+f.id+'\')"><span class="ft-knob"></span></span></label>';
      }).join('')+'</div>';
  }).join('');
}

// ===== واجهة Pro الاحترافية =====
function applyProUI(){ document.body.classList.toggle('ui-pro', !!(S.settings&&S.settings.proUI)); }
function toggleProUI(){ if(!S.settings)S.settings={}; S.settings.proUI=!S.settings.proUI; save(); applyProUI(); var b=document.getElementById('proui-btn'); if(b)b.textContent=S.settings.proUI?'تعطيل':'تفعيل'; }

// ===== تقليل الحركة (اختياري — راحة ADHD: يوقف الأنيميشن والانتقالات) =====
function applyReduceMotion(){ document.body.classList.toggle('reduce-motion', !!(S.settings&&S.settings.reduceMotion)); }
function toggleReduceMotion(){ if(!S.settings)S.settings={}; S.settings.reduceMotion=!S.settings.reduceMotion; save(); applyReduceMotion(); var b=document.getElementById('reduce-motion-btn'); if(b)b.textContent=S.settings.reduceMotion?'تعطيل':'تفعيل'; }

// ===== نمط هادئ (اختياري): مساحات أوسع · بطاقات أهدأ بلا أدوات ظاهرة · ألوان أقلّ إنذاراً =====
function applyCalm(){ document.body.classList.toggle('calm', !!(S.settings&&S.settings.calm)); }
function toggleCalm(){ if(!S.settings)S.settings={}; S.settings.calm=!S.settings.calm; save(); applyCalm(); var b=document.getElementById('calm-btn'); if(b)b.textContent=S.settings.calm?'تعطيل':'تفعيل'; if(typeof scheduleRelayout==='function')scheduleRelayout(); }
