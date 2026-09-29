// sport.js — تبويب الرياضة: تسجيل تمرين (اسم + عدد عدّات) + ملخّص في الميزان. classic script.

function sportState(){ if(!S.sport||typeof S.sport!=='object')S.sport={entries:[]}; if(!Array.isArray(S.sport.entries))S.sport.entries=[]; return S.sport; }
function sportToday(){ var tk=todayKey(); return sportState().entries.filter(function(e){return e.date===tk;}); }
// تمارين جاهزة (رقائق بنقرة — صفر احتكاك) قابلة للزيادة بكتابة اسم حر
var SPORT_PRESETS=[['ضغط','💪'],['عقلة','🤸'],['سكوات','🦵'],['بلانك (ثانية)','⏱️'],['معدة','🔥'],['جري (دقيقة)','🏃'],['مشي (دقيقة)','🚶'],['حبل (قفزة)','🪢']];
function addSportEntry(name,reps){
  var n=document.getElementById('sport-name'), rp=document.getElementById('sport-reps');
  name=(typeof name==='string'&&name)?name:((n&&n.value.trim())||'');
  reps=reps||Math.max(1,parseInt(rp&&rp.value)||10);
  if(!name)return;
  // تجميع ذكي: نفس التمرين بنفس اليوم يُجمَع في صفّ واحد (بدل تكرار الصفوف)
  var tk=todayKey(); var ex=sportState().entries.find(function(e){return e.date===tk&&e.name===name;});
  if(ex)ex.reps=(ex.reps||0)+reps;
  else sportState().entries.unshift({id:Date.now(),name:name,reps:reps,date:tk});
  if(n)n.value='';
  save(); renderSport(); if(typeof renderSportStats==='function')renderSportStats();
  if(typeof playClick==='function')playClick(); if(typeof flashDone==='function')flashDone();
}
function sportBump(id,n){
  var e=sportState().entries.find(function(x){return x.id===id;}); if(!e)return;
  e.reps=Math.max(0,(e.reps||0)+n); if(e.reps===0){ deleteSportEntry(id); return; }
  save(); renderSport(); if(typeof playClick==='function')playClick();
}
function deleteSportEntry(id){ var s=sportState(); s.entries=s.entries.filter(function(e){return e.id!==id;}); save(); renderSport(); if(typeof renderSportStats==='function')renderSportStats(); }
// شريط بكسلات آخر ١٤ يوماً (تغذية بصرية للاستمرارية — صديق ADHD)
function sportPixels(){
  var byDay={}; sportState().entries.forEach(function(e){ byDay[e.date]=(byDay[e.date]||0)+(e.reps||0); });
  var out='',d=new Date(); var cells=[];
  for(var i=0;i<14;i++){ var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); var v=byDay[k]||0; cells.unshift('<span class="spx'+(v>0?(v>=60?' spx3':v>=25?' spx2':' spx1'):'')+'" title="'+k+': '+v+' عدّة"></span>'); d.setDate(d.getDate()-1); }
  return '<div class="sport-pixels">'+cells.join('')+'<span class="spx-lbl">آخر ١٤ يوماً</span></div>';
}
function renderSport(){
  var el=document.getElementById('sport-list'); if(!el)return;
  var today=sportToday();
  var totalReps=today.reduce(function(a,e){return a+(e.reps||0);},0);
  var sum=document.getElementById('sport-today-sum'); if(sum)sum.textContent=today.length?('اليوم: '+today.length+' تمرين · '+totalReps+' عدّة 💪'):'';
  var chips='<div class="sport-presets">'+SPORT_PRESETS.map(function(p){
    return '<button class="chip-btn sp-chip" onclick="addSportEntry(\''+p[0]+'\')" title="يضيف بعدد خانة العدّات">'+p[1]+' '+p[0]+'</button>';
  }).join('')+'</div>';
  var rows=today.length?today.map(function(e){
    return '<div class="sport-row"><i data-lucide="dumbbell"></i><span class="sp-name">'+esc(e.name)+'</span>'+
      '<span class="sp-ctrl"><button class="chip-btn" onclick="sportBump('+e.id+',-5)">−٥</button><span class="sp-reps">'+e.reps+'</span><button class="chip-btn" onclick="sportBump('+e.id+',5)">+٥</button><button class="chip-btn" onclick="sportBump('+e.id+',10)">+١٠</button></span>'+
      '<button class="icon-btn" onclick="deleteSportEntry('+e.id+')" title="حذف"><i data-lucide="x"></i></button></div>';
  }).join(''):'<div class="empty" style="padding:1.1rem"><i data-lucide="dumbbell"></i><div>لا تمارين اليوم — اضغط رقاقة تمرين فوق وابدأ بعشر عدّات فقط</div></div>';
  el.innerHTML=chips+sportPixels()+rows; icons();
}
function renderSportStats(){
  var el=document.getElementById('sport-stats'); if(!el)return;
  var entries=sportState().entries;
  if(!entries.length){ el.innerHTML='<div class="empty" style="padding:.9rem"><i data-lucide="dumbbell"></i><div>لا بيانات رياضة بعد</div></div>'; icons(); return; }
  var byName={}; entries.forEach(function(e){ byName[e.name]=(byName[e.name]||0)+(e.reps||0); });
  var totalAll=entries.reduce(function(a,e){return a+(e.reps||0);},0);
  // آخر ٧ أيام
  var weekReps=0, d=new Date();
  for(var i=0;i<7;i++){ var k=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); entries.forEach(function(e){ if(e.date===k)weekReps+=(e.reps||0); }); d.setDate(d.getDate()-1); }
  var names=Object.keys(byName).sort(function(a,b){return byName[b]-byName[a];}).slice(0,8);
  var max=Math.max(1,byName[names[0]]||1);
  el.innerHTML='<div class="sport-stat-top"><span><b>'+totalAll+'</b> عدّة إجمالاً</span><span><b>'+weekReps+'</b> هذا الأسبوع</span><span><b>'+entries.length+'</b> تمرين</span></div>'+
    '<div class="sport-stat-list">'+names.map(function(n){
      var pct=Math.round((byName[n]/max)*100);
      return '<div class="sport-stat-row"><div class="ssr-name">'+esc(n)+'</div><div class="ssr-track"><div class="ssr-fill" style="width:'+pct+'%"></div></div><div class="ssr-val">'+byName[n]+'</div></div>';
    }).join('')+'</div>';
  icons();
}
