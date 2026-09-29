// sakina.js — زر «سكينة»: طوارئ نفسية للحظات الإرهاق/الإحباط/الرغبة في الانتكاس.
// المنهج: استعاذة + تنفّس موجَّه + آية تطمئن + خطوة فقه نفس عملية + ذكر.
// قاعدة صارمة: مصادر قرآنية/ذكر صحيحة فقط (لا اختلاق، لا نسبة مقولات). بلا توبيخ ولا عدّاد فضح.
// classic script (globals shared, no ES modules).

// آيات تثبيت (نصوص قرآنية صحيحة)
var SAKINA_VERSES=[
  {a:'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', r:'الرعد: 28'},
  {a:'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', r:'الطلاق: 2'},
  {a:'إِنَّ مَعَ الْعُسْرِ يُسْرًا', r:'الشرح: 6'},
  {a:'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', r:'البقرة: 45'},
  {a:'لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا', r:'التوبة: 40'},
  {a:'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا', r:'الشرح: 5-6'}
];
// أذكار صحيحة
var SAKINA_DHIKR=[
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
  'حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ',
  'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ'
];
// خطوات فقه النفس العملية (أفعال عامة، لا مقولات منسوبة)
var SAKINA_STEPS=[
  {ic:'droplets', t:'توضّأ الآن', s:'الماء يكسر حدّة اللحظة ويُطفئ الانفعال'},
  {ic:'log-out', t:'غيّر مكانك', s:'قُم وانتقل لمكانٍ آخر — بدّل المشهد كلّه'},
  {ic:'activity', t:'حرّك جسدك دقيقة', s:'مشي سريع أو تمدّد يُفرّغ الشحنة المكبوتة'},
  {ic:'phone-call', t:'تواصل مع ثقةٍ قريب', s:'لا تواجه اللحظة وحدك — اطلب العون'},
  {ic:'book-open', t:'افتح المصحف', s:'اقرأ صفحة واحدة — اشغل حسّك بالخير'}
];
// مراحل التنفّس الموجَّه
var SAKINA_BREATH=[
  {t:'خُذ نفساً عميقاً…', d:4000, scale:1.6},
  {t:'احبِس…', d:3000, scale:1.6},
  {t:'أخرِجه بهدوء…', d:6000, scale:1.0}
];
var sakStep=0, sakBreathInt=null, sakBreathIdx=0;

function openSakina(){
  var ov=document.getElementById('sakina-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='sakina-overlay'; ov.className='sakina-overlay'; document.body.appendChild(ov); }
  ov.style.display='flex'; sakStep=0; renderSakina();
}
// ===== «سَنَد»: مظلّة موحّدة للأدوات النفسية الثلاث (سكينة / النهوض / الطُّهر) — مدخل واحد =====
function openSanad(){
  var ov=document.getElementById('sanad-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='sanad-overlay'; ov.className='ritual-overlay'; document.body.appendChild(ov);
    ov.addEventListener('click',function(e){ if(e.target===ov)closeSanad(); }); }
  var recOn=!!(S.recovery&&S.recovery.enabled);
  ov.style.display='flex';
  ov.innerHTML='<div class="ritual-modal"><div class="ritual-header">'+
      '<div class="ritual-icon">🤲</div><div class="ritual-title">سَنَد</div>'+
      '<div class="ritual-sub">اختر ما تحتاجه الآن — أنت لستَ وحدك</div></div>'+
    '<div class="ritual-body sanad-grid">'+
      '<button class="sanad-opt" onclick="closeSanad();openSakina()"><span class="so-ic">🌿</span><span class="so-t">لحظة سكينة</span><span class="so-s">ضاق صدرك؟ استعاذة وتنفّس وآية تثبيت</span></button>'+
      '<button class="sanad-opt" onclick="closeSanad();startReframe()"><span class="so-ic">🌅</span><span class="so-t">النهوض</span><span class="so-s">تعثّرت؟ أعِد بناء ثقتك بخطوة واحدة</span></button>'+
      (recOn?'<button class="sanad-opt" onclick="closeSanad();feelUrge()"><span class="so-ic">🛡️</span><span class="so-t">أشعر برغبة (الطُّهر)</span><span class="so-s">تدخّل سريع بالرجاء لا القنوط</span></button>':'')+
    '</div>'+
    '<div class="ritual-foot"><button class="btn ghost" onclick="closeSanad()">إغلاق</button></div></div>';
  icons();
}
function closeSanad(){ var ov=document.getElementById('sanad-overlay'); if(ov)ov.style.display='none'; }
function closeSakina(){
  stopSakBreath();
  var ov=document.getElementById('sakina-overlay'); if(ov)ov.style.display='none';
}
function sakNext(){ sakStep++; if(sakStep>3){ closeSakina(); return; } renderSakina(); }
function stopSakBreath(){ if(sakBreathInt){ clearTimeout(sakBreathInt); sakBreathInt=null; } }

function renderSakina(){
  var ov=document.getElementById('sakina-overlay'); if(!ov)return;
  stopSakBreath();
  var v=SAKINA_VERSES[Math.floor(Math.random()*SAKINA_VERSES.length)];
  var stp=SAKINA_STEPS[Math.floor(Math.random()*SAKINA_STEPS.length)];
  var dh=SAKINA_DHIKR[Math.floor(Math.random()*SAKINA_DHIKR.length)];
  var body='', foot='', dots='';
  for(var i=0;i<4;i++)dots+='<span class="sak-dot'+(i===sakStep?' on':'')+'"></span>';

  if(sakStep===0){
    body='<div class="sak-isti">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</div>'+
      '<div class="sak-breath-wrap"><div class="sak-breath-circle" id="sak-circle"></div>'+
        '<div class="sak-breath-text" id="sak-breath-text">استعِذ… وتنفّس معي</div></div>'+
      '<div class="sak-hint">اللحظة مجرّد موجة — تعلو ثم تهدأ. لن تبتلعك.</div>';
    foot='<button class="btn pri" onclick="sakNext()"><i data-lucide="arrow-left"></i> أنا أهدأ… تابع</button>';
  }else if(sakStep===1){
    body='<div class="sak-verse">﴿ '+v.a+' ﴾</div><div class="sak-ref">'+v.r+'</div>'+
      '<div class="sak-hint">رُدّها بقلبك مرّتين. الله أقرب إليك ممّا تظنّ.</div>';
    foot='<button class="btn pri" onclick="sakNext()"><i data-lucide="arrow-left"></i> تابع</button>';
  }else if(sakStep===2){
    body='<div class="sak-step"><div class="sak-step-ic"><i data-lucide="'+stp.ic+'"></i></div>'+
      '<div class="sak-step-t">'+stp.t+'</div><div class="sak-step-s">'+stp.s+'</div></div>'+
      '<div class="sak-hint">خطوة واحدة عمليّة الآن — لا تفكّر فيما بعدها.</div>';
    foot='<button class="btn pri" onclick="sakNext()"><i data-lucide="arrow-left"></i> فعلتُها… تابع</button>';
  }else{
    body='<div class="sak-dhikr">'+dh+'</div>'+
      '<div class="sak-close-msg">مرّت اللحظة، وأنت أقوى منها بإذن الله.<br>عُد إلى عملك مرفوع الرأس — هذه ليست نهاية، بل انتصار صغير.</div>';
    foot='<button class="btn pri" onclick="closeSakina()"><i data-lucide="check"></i> عُدتُ بسكينة</button>';
  }

  ov.innerHTML='<div class="sakina-modal">'+
    '<button class="sak-x" onclick="closeSakina()" title="إغلاق"><i data-lucide="x"></i></button>'+
    '<div class="sak-head"><i data-lucide="heart-handshake"></i> لحظة سكينة</div>'+
    '<div class="sak-body">'+body+'</div>'+
    '<div class="sak-dots">'+dots+'</div>'+
    '<div class="sak-foot">'+foot+'</div>'+
  '</div>';
  icons();
  if(sakStep===0)startSakBreath();
}
function startSakBreath(){
  sakBreathIdx=0;
  function cycle(){
    var ph=SAKINA_BREATH[sakBreathIdx%SAKINA_BREATH.length];
    var c=document.getElementById('sak-circle'), t=document.getElementById('sak-breath-text');
    if(!c||!t)return;
    t.textContent=ph.t;
    c.style.transition='transform '+(ph.d/1000)+'s ease-in-out';
    c.style.transform='scale('+ph.scale+')';
    sakBreathIdx++;
    sakBreathInt=setTimeout(cycle, ph.d);
  }
  cycle();
}
