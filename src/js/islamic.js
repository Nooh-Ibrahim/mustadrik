// islamic.js — Hijri date, recommended-fast / Surah-Kahf occasions, and qibla direction
// classic script (globals shared, no ES modules). Pure client-side: Intl Umm al-Qura calendar
// + great-circle bearing to Mecca from coordinates captured during the prayer-times fetch.

// ---- numeric Hijri parts (Umm al-Qura) for occasion logic ----
function hijriParts(d){
  d=d||new Date();
  try{
    var fmt=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'});
    var o={};
    fmt.formatToParts(d).forEach(function(p){
      if(p.type==='day')o.day=parseInt(p.value,10);
      if(p.type==='month')o.month=parseInt(p.value,10);
      if(p.type==='year')o.year=parseInt(p.value,10);
    });
    return (o.day&&o.month)?o:null;
  }catch(e){ return null; }
}

// ---- today's worship-related occasions (sunnah fasting, Friday Kahf, special days) ----
function islamicOccasions(d){
  d=d||new Date();
  var out=[], dow=d.getDay(), hp=hijriParts(d);          // dow: 1=Mon, 4=Thu, 5=Fri
  if(dow===5)out.push({icon:'book-open',txt:'الجمعة — اقرأ سورة الكهف'});
  if(dow===1)out.push({icon:'moon',txt:'الاثنين — صيام مستحبّ'});
  if(dow===4)out.push({icon:'moon',txt:'الخميس — صيام مستحبّ'});
  if(hp){
    if(hp.day>=13&&hp.day<=15)out.push({icon:'circle',txt:'أيام البيض ('+hp.day+') — صيام مستحبّ'});
    if(hp.month===9)out.push({icon:'star',txt:'رمضان مبارك — اليوم '+hp.day});
    if(hp.month===8&&hp.day>=20)out.push({icon:'hourglass',txt:'يقترب رمضان — تهيّأ بالنيّة'});
    if(hp.month===1&&hp.day===9)out.push({icon:'star',txt:'تاسوعاء — صيام مستحبّ'});
    if(hp.month===1&&hp.day===10)out.push({icon:'star',txt:'عاشوراء — صيام مستحبّ'});
    if(hp.month===12&&hp.day===9)out.push({icon:'star',txt:'يوم عرفة — صيام لغير الحاجّ'});
    if(hp.month===12&&hp.day>=10&&hp.day<=13)out.push({icon:'star',txt:'أيام التشريق — أيام أكلٍ وذكر'});
  }
  return out;
}

// ---- initial great-circle bearing from (lat,lng) to the Kaaba, degrees from true north ----
function qiblaBearing(lat,lng){
  var toR=Math.PI/180, kLat=21.4225*toR, kLng=39.8262*toR, p1=lat*toR, dl=(39.8262-lng)*toR;
  var y=Math.sin(dl), x=Math.cos(p1)*Math.tan(kLat)-Math.sin(p1)*Math.cos(dl);
  return (Math.atan2(y,x)/toR+360)%360;
}

// ---- home card: Hijri date + occasions + qibla compass ----
function renderIslamicCard(){
  var el=document.getElementById('islamic-body'); if(!el)return;
  var now=new Date(), hijStr='';
  try{ hijStr=now.toLocaleDateString('ar-SA-u-ca-islamic',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }catch(e){}
  var occ=islamicOccasions(now);
  var html='<div class="isl-hijri"><i data-lucide="moon-star"></i> '+(hijStr||'التقويم الهجري')+'</div>';
  if(occ.length){
    html+='<div class="isl-occ">'+occ.map(function(o){
      return '<div class="isl-occ-row"><i data-lucide="'+o.icon+'"></i><span>'+o.txt+'</span></div>';
    }).join('')+'</div>';
  }
  var lat=S.settings&&S.settings.lat, lng=S.settings&&S.settings.lng;
  if(typeof lat==='number'&&typeof lng==='number'){
    var b=Math.round(qiblaBearing(lat,lng));
    html+='<div class="isl-qibla">'+
      '<div class="isl-compass" title="اتجاه القبلة من الشمال"><div class="isl-needle" style="transform:rotate('+b+'deg)"></div></div>'+
      '<div class="isl-qibla-txt"><div class="isl-qibla-deg">'+b+'°</div><div class="isl-qibla-lbl">اتجاه القبلة من الشمال الحقيقي</div></div>'+
      '</div>';
  }else{
    html+='<div class="setting-sub" style="margin-top:.5rem">لإظهار اتجاه القبلة: اجلب مواقيت الصلاة من الإعدادات (يُحفظ موقعك تلقائياً).</div>';
  }
  el.innerHTML=html;
  if(typeof icons==='function')icons();
}
