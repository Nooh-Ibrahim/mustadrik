// studio.js — الهوية البصرية (جولة 3): قوالب جاهزة + شعار متفرّع SVG.
// classic script (globals shared). يُحمّل بعد sakina قبل palette.

// ===== الشعار: نجمة ثمانية إسلامية (رُبع الحزب) — يطابق أيقونة التطبيق =====
var BRAND_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true">'+
  '<rect x="5.5" y="5.5" width="13" height="13" rx="1.2"/>'+
  '<rect x="5.5" y="5.5" width="13" height="13" rx="1.2" transform="rotate(45 12 12)"/>'+
  '</svg>';
function applyBrandLogo(){
  if(S.settings&&S.settings.logoSet)return;   // المستخدم رفع شعاراً مخصّصاً → لا نلمسه
  ['.brand-icon','#tb-logo'].forEach(function(sel){ var el=document.querySelector(sel); if(el)el.innerHTML=BRAND_SVG; });
}

// ===== القوالب الجاهزة — ١٢ هوية منسّقة منطقياً (لا عبث ألوان) =====
// كل قالب: خلفية + ثيم + لون مخصّص اختياري (accent) + تدرّج هادئ متناسق. منها لوحات معيارية
// معروفة عالمياً: Nord وSolarized — مريحة ومجرّبة لساعات القراءة الطويلة.
var TEMPLATES=[
  // ——— كلود ديزاين (هوية هادئة دافئة — الافتراضي «الورقي») ———
  {id:'cd-paper',   name:'الورقي',   emoji:'🍂', theme:'t-terracotta', dark:false, bg:'#f4f1ea', grad:{on:false}},
  {id:'cd-lavender',name:'الخزامى',  emoji:'🪻', theme:'t-lavender',   dark:false, bg:'#d8d8e6', grad:{on:false}},
  {id:'cd-sage',    name:'المريمية', emoji:'🌿', theme:'t-sage',       dark:false, bg:'#ebf3ec', grad:{on:false}},
  {id:'cd-forest',  name:'الغابة',   emoji:'🌲', theme:'t-sage',       dark:true,  bg:'#16331f', grad:{on:true,c1:'#1f4a2e',c2:'#16331f',intensity:0.45,both:true,target:'bg',angle:150,animate:false}},
  {id:'cd-spectrum',name:'الطيف',    emoji:'🌈', theme:'t-terracotta', dark:false, bg:'#f4f1ea', grad:{on:false}},
  // ——— فاتحة ———
  {id:'paper',  name:'ورقي هادئ',   emoji:'📜', theme:'t-indigo',  dark:false, bg:'#f6f4ef', grad:{on:false}},
  {id:'islamic',name:'مصحفي',       emoji:'🕌', theme:'t-emerald', dark:false, bg:'#f3f7f4', grad:{on:true,c1:'#0e9b87',c2:'#c8a44a',intensity:0.10,both:true,target:'bg',angle:140,animate:false}},
  {id:'sand',   name:'صحراوي دافئ', emoji:'🏜️', theme:'t-gold',    dark:false, bg:'#f7f0e3', grad:{on:true,c1:'#d8b878',c2:'#efe3c8',intensity:0.14,both:true,target:'bg',angle:135,animate:false}},
  {id:'solar',  name:'سولارايزد',   emoji:'☀️', theme:'t-sky',     dark:false, bg:'#fdf6e3', accent:'#268bd2', grad:{on:false}},
  {id:'mint',   name:'نعناعي',      emoji:'🍃', theme:'t-teal',    dark:false, bg:'#effaf5', grad:{on:true,c1:'#5eead4',c2:'#dcfaf2',intensity:0.13,both:true,target:'bg',angle:160,animate:false}},
  {id:'rose',   name:'وردي هادئ',   emoji:'🌸', theme:'t-rose',    dark:false, bg:'#fbf2f4', grad:{on:true,c1:'#f4a6b8',c2:'#fae3e8',intensity:0.11,both:true,target:'bg',angle:135,animate:false}},
  // ——— داكنة ———
  {id:'night',  name:'ليلي رمادي',  emoji:'🌙', theme:'t-indigo',  dark:true,  bg:'#1c1d21', grad:{on:false}},
  {id:'nord',   name:'نورد',        emoji:'🧊', theme:'t-sky',     dark:true,  bg:'#2e3440', accent:'#88c0d0', grad:{on:false}},
  {id:'forest', name:'غابة ليلية',  emoji:'🌿', theme:'t-forest',  dark:true,  bg:'#101a14', grad:{on:true,c1:'#0e3b2e',c2:'#101a14',intensity:0.28,both:true,target:'bg',angle:150,animate:false}},
  {id:'ocean',  name:'بحر عميق',    emoji:'🌊', theme:'t-ocean',   dark:true,  bg:'#0a1620', grad:{on:true,c1:'#0e7490',c2:'#0a1620',intensity:0.30,both:true,target:'bg',angle:165,animate:false}},
  {id:'aurora', name:'شفق قطبي',    emoji:'🌠', theme:'t-teal',    dark:true,  bg:'#0c1722', grad:{on:true,c1:'#14b8a6',c2:'#7c3aed',intensity:0.22,both:true,target:'bg',angle:160,animate:true}},
  {id:'carbon', name:'حِبر',        emoji:'🖋️', theme:'t-slate',   dark:true,  bg:'#131418', grad:{on:false}}
];
function applyTemplate(id){
  var t=null; for(var i=0;i<TEMPLATES.length;i++){if(TEMPLATES[i].id===id)t=TEMPLATES[i];}
  if(!t)return;
  if(!S.settings)S.settings={};
  S.settings.template=id;
  S.theme=t.theme; S.dark=!!t.dark;
  S.settings.bgId='tpl-'+id; S.settings.bgLight=t.bg; S.settings.bgDark=t.bg;
  S.settings.customAccent=t.accent||'';                                  // لوحات مثل Nord/Solarized تحمل لونها المعياري
  if(typeof applyCustomAccent==='function')applyCustomAccent();
  S.settings.gradient=Object.assign({on:false,c1:'#5750d8',c2:'#0d9488',intensity:0.16,both:false,target:'bg',angle:135,animate:false}, t.grad||{});
  document.body.className=S.theme; if(S.dark)document.body.classList.add('dark');
  if(typeof applyFontScale==='function')applyFontScale();
  if(typeof applyBgColor==='function')applyBgColor();
  if(typeof applyGradient==='function')applyGradient();
  if(typeof updateDarkBtn==='function')updateDarkBtn();
  if(typeof renderThemeDots==='function')renderThemeDots();
  if(typeof applyBrandLogo==='function')applyBrandLogo();
  applyTemplatePattern();
  save();
  if(typeof renderTemplates==='function')renderTemplates();
  notify('طُبِّق قالب: '+t.name+' '+t.emoji,'palette');
}
// زخرفة القالب — صنف body يفعّل نمط الخلفية في CSS
function applyTemplatePattern(){
  var rm=[]; document.body.classList.forEach(function(c){ if(c.indexOf('tpl-')===0)rm.push(c); });
  rm.forEach(function(c){ document.body.classList.remove(c); });
  var id=(S.settings&&S.settings.template)||''; if(id)document.body.classList.add('tpl-'+id);
}
function renderTemplates(){
  var el=document.getElementById('templates-gallery'); if(!el)return;
  var cur=(S.settings&&S.settings.template)||'';
  el.innerHTML=TEMPLATES.map(function(t){
    return '<button class="tpl-card tpl-'+t.id+(cur===t.id?' sel':'')+'" onclick="applyTemplate(\''+t.id+'\')" title="'+t.name+'">'+
      '<span class="tpl-emoji">'+t.emoji+'</span><span class="tpl-name">'+t.name+'</span></button>';
  }).join('');
}
