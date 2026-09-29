// cards.js — نظام البطاقة الموحّد: كل .card في كل صفحة تحصل على مقبض سحب (ست نقط) + سهم طيّ.
// حالة الطيّ + ترتيب البطاقات داخل كل حاوية يُحفظان في S.settings (معزولان بالملف الشخصي).
// classic script (globals shared). يُحمّل قبل bootstrap؛ يعمل عبر MutationObserver فيزخرف أي
// بطاقة تُنشئها أي دالة عرض على أي صفحة (بطلب المستخدم: حرفياً في كل صفحة).

function cardCfg(){
  if(!S.settings)S.settings={};
  if(!S.settings.cardCollapsed||typeof S.settings.cardCollapsed!=='object')S.settings.cardCollapsed={};
  if(!S.settings.cardOrder||typeof S.settings.cardOrder!=='object')S.settings.cardOrder={};
  if(!S.settings.cardSpan||typeof S.settings.cardSpan!=='object')S.settings.cardSpan={};
  if(!S.settings.tileHidden||typeof S.settings.tileHidden!=='object')S.settings.tileHidden={};   // بنك الأيقونات (X بالرئيسية)
  return S.settings;
}
// أفضل عنوان للبطاقة (للطيّ المصغّر): card-title / card-head / setting-group-title / page-title
function cardLabel(card){
  if(card.getAttribute('data-tile-label'))return card.getAttribute('data-tile-label');
  var sels=['.card-title','.card-head','.setting-group-title','.page-title','.dr-head','.cmd-eyebrow','.cmd-title'];
  for(var i=0;i<sels.length;i++){ var e=card.querySelector(':scope > '+sels[i])||card.querySelector(sels[i]); if(e&&e.textContent.trim())return e.textContent.replace(/\s+/g,' ').trim().slice(0,40); }
  var t=(card.textContent||'').replace(/\s+/g,' ').trim();
  return t?t.slice(0,34):'بطاقة';
}
function cardHasHead(card){ return !!(card.querySelector(':scope > .card-title, :scope > .card-head')); }
// السبان فعّال على الصفحات الماسونرية + حاويات الأعمدة (.tiles-cols) + أقسام الميزان (.stats-group)
function cardCanSpan(card){ var p=card.parentNode; if(!p||!p.classList)return false; return (p.classList.contains('page')&&p.classList.contains('masonry'))||p.classList.contains('tiles-cols')||p.classList.contains('stats-group'); }
var _cardIconsT=null;
function scheduleCardIcons(){ if(_cardIconsT)return; _cardIconsT=setTimeout(function(){ _cardIconsT=null; try{icons();}catch(e){} },120); }

function cardPageId(card){ var pg=card.closest&&card.closest('.page'); return (pg&&pg.id)?pg.id:'misc'; }
function cardTitleText(card){
  var kids=card.children, t=null;
  for(var i=0;i<kids.length;i++){ var cl=kids[i].classList; if(cl&&(cl.contains('card-title')||cl.contains('card-head'))){ t=kids[i]; break; } }
  if(!t)return '';
  // جرّد الأرقام (الشارات/العدّادات تتغيّر) ليبقى المفتاح ثابتاً
  return t.textContent.replace(/[0-9٠-٩]+/g,'').replace(/\s+/g,' ').trim().slice(0,48);
}
// المفتاح الثابت: data-cid على البلاطة → pageId::@cid — لا يتأثر بإعادة تسمية العناوين أو ترتيب الأشقاء.
// البادئة pageId:: مطلوبة: لوحة «تنظيم الصفحة» تفلتر بها، وتنظيفات migrate() تشترط وجود ::
function cardKey(card){
  var cid=card.getAttribute('data-cid');
  if(cid)return cardPageId(card)+'::@'+cid;
  return legacyCardKey(card);
}
// المفتاح القديم (عنواني/موضعي) — يبقى للبطاقات التي بلا data-cid بعد، ولحساب مفتاح الترحيل
function legacyCardKey(card){
  var p=card.parentNode, idx=0;
  if(p){ var k=p.children; for(var i=0;i<k.length;i++){ if(k[i]===card)break; if(isCardEl(k[i]))idx++; } }
  var t=cardTitleText(card);
  return cardPageId(card)+'::'+(t||('#'+idx));
}
// نقل إعدادات مفتاح قديم إلى المفتاح الثابت الجديد — نقيّة (بلا DOM) لتُختبر في npm test
function remapCardKey(settings,oldKey,newKey){
  if(!settings||!oldKey||!newKey||oldKey===newKey)return false;
  var moved=false, maps=['cardCollapsed','cardSpan','tileHidden'], has=Object.prototype.hasOwnProperty;
  for(var i=0;i<maps.length;i++){
    var m=settings[maps[i]];
    if(m&&typeof m==='object'&&has.call(m,oldKey)){
      if(!has.call(m,newKey))m[newKey]=m[oldKey];
      delete m[oldKey]; moved=true;
    }
  }
  var co=settings.cardOrder;
  if(co&&typeof co==='object'){
    Object.keys(co).forEach(function(ck){
      var a=co[ck]; if(!Array.isArray(a))return;
      var idx=a.indexOf(oldKey); if(idx<0)return;
      if(a.indexOf(newKey)===-1)a[idx]=newKey; else a.splice(idx,1);
      moved=true;
    });
  }
  return moved;
}
var _adoptSaveT=null;
function adoptLegacyCardKey(card,newKey){
  if(remapCardKey(cardCfg(),legacyCardKey(card),newKey)&&!_adoptSaveT){
    _adoptSaveT=setTimeout(function(){ _adoptSaveT=null; try{save();}catch(e){} },800);
  }
}
// «tile» = بطاقة عادية .card أو كتلة رئيسية .dash-tile (كلاهما يحصل على ست نقط + طيّ + سبان)
var TILE_SEL='.card,.dash-tile';
function isCardEl(el){ return !!(el&&el.classList&&(el.classList.contains('card')||el.classList.contains('dash-tile'))); }

var cardDragKey=null, cardDragParent=null, _applyingOrder=false;

// بطاقات طلب المالك حذفها نهائياً — تُزال من DOM ولا تظهر في بنك الأيقونات/لوحة التنظيم (المطابقة بعنوان البطاقة)
var REMOVED_TILES={'الصلاة القادمة':1,'بطاقة المراجعة':1,'نظرة سريعة على اليوم':1,'كلمة اليوم':1,'سجل الجلسات':1,'تسجيل بالسورة والآيات':1,'تنبيهات الصلاة':1,'نور اليوم':1,'التقويم والقبلة':1};
function isRemovedTile(card){ var l=cardLabel(card); return !!(l&&REMOVED_TILES[l]); }

function decorateCard(card){
  if(card.getAttribute('data-removed')==='1')return false;                      // محذوفة نهائياً — تجاهل تماماً
  if(card.getAttribute('data-cdeco')==='1'){ ensureCardTools(card); return false; }  // مزخرفة؛ تأكّد فقط أن الأدوات لم تُمسح بإعادة الرسم
  if(isRemovedTile(card)){ card.setAttribute('data-removed','1'); card.classList.add('tile-removed'); return false; }  // إخفاء دائم (تبقى في DOM فلا تتكسّر الـrenders) — طلب المالك
  if(card.closest('#print-report'))return false;                                // تقرير الطباعة
  if(card.closest('.ritual-overlay,.confirm-overlay,.io-overlay,.palette,.badge-popup'))return false; // نوافذ منبثقة
  card.setAttribute('data-cdeco','1');
  var key=cardKey(card); card.setAttribute('data-ckey',key);
  if(card.getAttribute('data-cid'))adoptLegacyCardKey(card,key);   // ترحيل إعدادات المفتاح العنواني القديم (مرة واحدة، عديم الأثر بعدها)
  if(cardHasHead(card))card.classList.add('card-has-head');

  // مستمعو السحب على مستوى البطاقة (يبقون رغم استبدال innerHTML داخلها)
  card.addEventListener('dragstart',function(e){
    if(!card.__armed){ e.preventDefault(); return; }                            // السحب يبدأ من المقبض فقط (لا يعطّل تحديد النص)
    cardDragKey=card.getAttribute('data-ckey'); cardDragParent=card.parentNode;
    card.classList.add('card-dragging');
    if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',cardDragKey);}catch(_){} }
    e.stopPropagation();
  });
  card.addEventListener('dragover',function(e){ if(cardDragKey==null||card.parentNode!==cardDragParent)return; e.preventDefault(); card.classList.add('card-drop'); });
  card.addEventListener('dragleave',function(){ card.classList.remove('card-drop'); });
  card.addEventListener('drop',function(e){ if(cardDragKey==null||card.parentNode!==cardDragParent)return; e.preventDefault(); e.stopPropagation(); card.classList.remove('card-drop'); reorderCard(cardDragKey,card.getAttribute('data-ckey'),card.parentNode); });
  card.addEventListener('dragend',function(){ card.__armed=false; card.removeAttribute('draggable'); card.classList.remove('card-dragging'); var d=document.querySelectorAll('.card-drop'); for(var i=0;i<d.length;i++)d[i].classList.remove('card-drop'); cardDragKey=null; cardDragParent=null; });

  ensureCardTools(card);
  if(cardCfg().cardCollapsed[key])card.classList.add('card-collapsed');
  applyCardSpan(card,cardCfg().cardSpan[key]);
  if(_cardRO){ try{_cardRO.observe(card);}catch(e){} }   // أعِد التخطيط عند تغيّر ارتفاع البطاقة
  scheduleCardIcons();
  return true;
}
// تُعيد حقن الأدوات (ست نقط/سبان/طيّ) متى مُسحت بإعادة رسم محتوى البطاقة عبر innerHTML — idempotent
function ensureCardTools(card){
  if(card.querySelector(':scope > .card-tools'))return;                          // موجودة بالفعل
  var key=card.getAttribute('data-ckey'); if(!key)return;
  if(!card.querySelector(':scope > .card-collapsed-label')){
    var lbl=document.createElement('div'); lbl.className='card-collapsed-label'; lbl.textContent=cardLabel(card); card.appendChild(lbl);
  }
  var canSpan=cardCanSpan(card);
  var canHide=true;                                                              // زر X لكل البطاقات في كل الصفحات (بطلب المستخدم) → بنك الأيقونات
  var tools=document.createElement('div'); tools.className='card-tools';
  tools.innerHTML='<button class="card-grip" title="اسحب لإعادة الترتيب" type="button"><i data-lucide="grip-vertical"></i></button>'+
    (canSpan?'<button class="card-span" title="عرض البطاقة (عادي / عريض على كل الأعمدة)" type="button"><i data-lucide="columns-2"></i></button>':'')+
    '<button class="card-collapse" title="طيّ / فتح" type="button"><i data-lucide="chevron-down" class="cc-caret"></i></button>'+
    (canHide?'<button class="card-x" title="إخفاء (تستعيدها من بنك الأيقونات في الضبط)" type="button"><i data-lucide="x"></i></button>':'');
  card.appendChild(tools);
  var grip=tools.querySelector('.card-grip'), col=tools.querySelector('.card-collapse'), spanBtn=tools.querySelector('.card-span'), xBtn=tools.querySelector('.card-x');
  if(spanBtn)spanBtn.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); cycleCardSpan(card); });
  if(xBtn)xBtn.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); hideTile(card); });
  col.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); toggleCardCollapse(card); });
  grip.addEventListener('mousedown',function(){ card.setAttribute('draggable','true'); card.__armed=true; });
  grip.addEventListener('touchstart',function(){ card.setAttribute('draggable','true'); card.__armed=true; },{passive:true});
  scheduleCardIcons();
}
// ===== بنك الأيقونات: إخفاء بلاطة من الرئيسية بزر X واستعادتها من الضبط =====
function hideTile(card){
  var key=card.getAttribute('data-ckey'); if(!key)return;
  cardCfg().tileHidden[key]=cardLabel(card)||key;
  card.classList.add('tile-hidden'); save();
  notify('أُخفيت — تستعيدها من «بنك الأيقونات» في الضبط','eye-off');
  if(typeof renderIconBank==='function')renderIconBank();
}
function restoreTile(key){
  delete cardCfg().tileHidden[key]; save();
  var el=document.querySelector('[data-ckey="'+String(key).replace(/"/g,'')+'"]'); if(el)el.classList.remove('tile-hidden');
  if(typeof renderIconBank==='function')renderIconBank();
  notify('عادت للرئيسية ✓','eye');
}
function applyTileHidden(){
  var th=cardCfg().tileHidden;
  var tiles=document.querySelectorAll('[data-ckey]');                            // كل البطاقات في كل الصفحات (بطلب المستخدم)
  for(var i=0;i<tiles.length;i++){ var k=tiles[i].getAttribute('data-ckey'); tiles[i].classList.toggle('tile-hidden',!!th[k]); }
}
var _iconBankOpen=false;
function toggleIconBank(){ _iconBankOpen=!_iconBankOpen; renderIconBank(); }
function renderIconBank(){
  var el=document.getElementById('icon-bank'); if(!el)return;
  var th=cardCfg().tileHidden; var keys=Object.keys(th).filter(function(k){ return !REMOVED_TILES[th[k]]; });   // استبعاد المحذوفة نهائياً
  if(!keys.length){ el.innerHTML='<div class="setting-sub">لا بطاقات مخفية — اضغط ✕ على أي بلاطة لإخفائها</div>'; return; }
  // مطويّ افتراضياً فلا تُزحم أسماء المخفيّات الإعدادات (بطلب المستخدم) — تُدار/تُستعاد عند الفتح فقط
  var chips=keys.map(function(k){
    return '<button class="bank-chip" onclick="restoreTile(\''+jsStr(k)+'\')" title="اضغط لإرجاعها للرئيسية"><i data-lucide="plus"></i> '+esc(th[k])+'</button>';
  }).join('');
  el.innerHTML='<button class="btn sm ghost" onclick="toggleIconBank()"><i data-lucide="'+(_iconBankOpen?'chevron-up':'chevron-down')+'"></i> '+keys.length+' بطاقة مخفية — '+(_iconBankOpen?'إخفاء القائمة':'إدارة / استعادة')+'</button>'+
    (_iconBankOpen?('<div class="bank-chips" style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem">'+chips+'</div>'):'');
  icons();
}
// السبان: عدد أعمدة (١..max) أو 'wide' (كل الأعمدة). الصفحات الماسونرية = Grid (سبان حقيقي ٢ من ٣)؛ الباقي = عادي↔عريض.
function cardInMasonryPage(card){ var p=card.parentNode; return !!(p&&p.classList&&p.classList.contains('page')&&p.classList.contains('masonry')); }
function cardSpanMax(card){ var pg=card.closest&&card.closest('.page'); return (pg&&typeof pageColsVal==='function')?pageColsVal(pg.id):2; }
function applyCardSpan(card,span){
  if(span==='full'||span==='wide')span='wide';
  else if(span==null||span===''){ var def=card.getAttribute('data-default-span'); span=(def==='full'||def==='wide')?'wide':1; }   // الافتراضي: عمود واحد (جنب بعض) إلا ما وُسم full
  else if(span==='half'||span==='third'||span==='normal')span=1;                                                     // ترحيل القديم
  var masonry=cardInMasonryPage(card);
  if(span==='wide'){ card.setAttribute('data-span','wide'); card.style.gridColumn=masonry?'1 / -1':''; return; }
  var n=parseInt(span)||1; if(n<1)n=1; var mx=cardSpanMax(card); if(n>mx)n=mx;
  card.setAttribute('data-span',String(n));
  card.style.gridColumn=(masonry&&n>1)?('span '+n):(masonry?'auto':'');
}
function cycleCardSpan(card){
  var key=card.getAttribute('data-ckey'); var c=cardCfg();
  var cur=card.getAttribute('data-span')||'1'; if(cur==='full')cur='wide';
  var next;
  if(cardInMasonryPage(card)){
    var mx=cardSpanMax(card);
    if(cur==='wide')next='1';
    else { var n=(parseInt(cur)||1)+1; next=(n>mx)?'wide':String(n); }
  } else { next=(cur==='wide')?'1':'wide'; }   // tiles-cols / stats-group: عادي↔عريض
  c.cardSpan[key]=next; applyCardSpan(card,next); save(); scheduleRelayout();
}
// ===== ماسونري بـGrid: ضبط امتداد الصفوف لكل عنصر من ارتفاعه (لا فراغات + يدعم السبان) =====
var _mlRAF=null, _cardRO=null;
function scheduleRelayout(){ if(_mlRAF)return; _mlRAF=requestAnimationFrame(function(){ _mlRAF=null; try{relayoutMasonry();}catch(e){} }); }
function relayoutMasonry(){
  var pages=document.querySelectorAll('.page.masonry.active');
  for(var p=0;p<pages.length;p++){
    var pg=pages[p], cs=getComputedStyle(pg);
    if(cs.display!=='grid')continue;
    var rowH=parseFloat(cs.gridAutoRows)||4, gap=parseFloat(cs.rowGap)||16;
    var kids=pg.children;
    for(var i=0;i<kids.length;i++){
      var it=kids[i]; if(it.nodeType!==1)continue;
      var st=getComputedStyle(it); if(st.display==='none'||st.position==='fixed')continue;
      var h=it.getBoundingClientRect().height; if(h<=0)continue;
      it.style.gridRowEnd='span '+Math.max(1,Math.ceil((h+gap)/(rowH+gap)));
    }
  }
}
// ===== عدد أعمدة لكل صفحة على حدة (بطلب المستخدم: مستقلّ لكل صفحة عبر زر «تنظيم الصفحة») =====
function pageColsCfg(){ if(!S.settings)S.settings={}; if(!S.settings.pageCols||typeof S.settings.pageCols!=='object')S.settings.pageCols={}; return S.settings.pageCols; }
function defaultPageCols(pid){ return (pid==='page-home'||pid==='page-pomodoro'||pid==='page-settings')?2:1; }
function pageColsVal(pid){ var c=pageColsCfg()[pid]; if(c==null)c=defaultPageCols(pid); c=parseInt(c)||1; if(c<1)c=1; if(c>5)c=5; return c; }
function setPageCols(pid,n){ n=parseInt(n)||1; if(n<1)n=1; if(n>5)n=5; pageColsCfg()[pid]=n; save(); applyPageCols(); renderOrganizePanel(); }
// يضبط --tile-cols على الصفحة النشطة (تَرِثها حاويات .tiles-cols بداخلها)
function applyPageCols(){
  var pg=document.querySelector('.page.active'); if(!pg||!pg.id)return;
  pg.style.setProperty('--tile-cols',String(pageColsVal(pg.id)));
  scheduleRelayout();
}
function renderOrganizePanel(){
  var el=document.getElementById('organize-panel'); if(!el)return;
  var pg=document.querySelector('.page.active'); var pid=(pg&&pg.id)?pg.id:'page-home';
  var cur=pageColsVal(pid);
  var colBtns=[1,2,3,4,5].map(function(n){ return '<button class="op-col'+(cur===n?' on':'')+'" onclick="setPageCols(\''+pid+'\','+n+')">'+n+'</button>'; }).join('');
  var th=cardCfg().tileHidden; var keys=Object.keys(th).filter(function(k){ return k.indexOf(pid+'::')===0 && !REMOVED_TILES[th[k]]; });
  var hidden=keys.length?keys.map(function(k){ return '<button class="op-restore" onclick="restoreTile(\''+jsStr(k)+'\')"><i data-lucide="plus"></i> '+esc(th[k])+'</button>'; }).join('')
    :'<div class="op-empty">لا عناصر مخفية في هذه الصفحة</div>';
  el.innerHTML='<div class="op-title"><i data-lucide="layout-panel-top"></i> تنظيم هذه الصفحة</div>'+
    '<div class="op-sec">عدد الأعمدة (يخصّ هذه الصفحة فقط)</div><div class="op-cols">'+colBtns+'</div>'+
    '<div class="op-sec">إرجاع المخفي</div><div class="op-restores">'+hidden+'</div>';
  icons();
}
function toggleOrganizePanel(e){ if(e){try{e.stopPropagation();}catch(_){}} var el=document.getElementById('organize-panel'); if(!el)return; var open=el.classList.toggle('open'); if(open)renderOrganizePanel(); var m=document.getElementById('app-menu'); if(m)m.classList.remove('open'); }
// (حُذف closeOrganizePanel — كان ميتاً؛ يُستخدَم toggleOrganizePanel)
function toggleCardCollapse(card){
  var key=card.getAttribute('data-ckey'); var c=cardCfg();
  if(card.classList.toggle('card-collapsed'))c.cardCollapsed[key]=true; else delete c.cardCollapsed[key];
  save();
}
function _q(parent,key){ return parent.querySelector('[data-ckey="'+String(key||'').replace(/"/g,'')+'"]'); }
function reorderCard(fromKey,toKey,parent){
  if(fromKey===toKey||!parent)return;
  var from=_q(parent,fromKey), to=_q(parent,toKey);
  if(!from||!to||from===to)return;
  parent.insertBefore(from,to);
  saveCardOrder(parent);
}
function saveCardOrder(parent){
  var ck=parent.id; if(!ck)return;                                             // نحفظ الترتيب للحاويات المعرّفة فقط
  var order=[],kids=parent.children;
  for(var i=0;i<kids.length;i++){ if(isCardEl(kids[i])){ var k=kids[i].getAttribute('data-ckey'); if(k)order.push(k); } }
  cardCfg().cardOrder[ck]=order; save();
}
function applyCardOrders(){
  if(_applyingOrder)return; _applyingOrder=true;
  try{
    var cfg=cardCfg().cardOrder;
    Object.keys(cfg).forEach(function(ck){
      var parent=document.getElementById(ck); if(!parent)return;
      var order=cfg[ck]; if(!Array.isArray(order)||!order.length)return;
      // إعادة ترتيب «في المواضع نفسها» عبر علامات نصية — حتى لا تُرمى البطاقات بعد العناوين
      // الثابتة (كان السبب في «اختفاء» بطاقات الميزان تحت آخر عنوان)
      var cards=[],kids=parent.children,i;
      for(i=0;i<kids.length;i++){ if(isCardEl(kids[i])&&kids[i].getAttribute('data-ckey'))cards.push(kids[i]); }
      if(cards.length<2)return;
      var markers=cards.map(function(c){ var m=document.createTextNode(''); parent.insertBefore(m,c); return m; });
      var byKey={}; cards.forEach(function(c){ byKey[c.getAttribute('data-ckey')]=c; });
      var ordered=[]; order.forEach(function(k){ if(byKey[k]){ ordered.push(byKey[k]); delete byKey[k]; } });
      cards.forEach(function(c){ if(byKey[c.getAttribute('data-ckey')])ordered.push(c); });   // غير المذكورة تبقى بترتيبها
      ordered.forEach(function(c,idx){ parent.insertBefore(c,markers[idx].nextSibling); });
      markers.forEach(function(m){ parent.removeChild(m); });
    });
  }finally{ _applyingOrder=false; }
}
function decorateAllCards(scope){
  var root=(scope&&scope.querySelectorAll)?scope:document;
  var cards=root.querySelectorAll(TILE_SEL);
  for(var i=0;i<cards.length;i++)decorateCard(cards[i]);
}
// نقطة دخول موحّدة: زخرفة الجديد + إعادة مزامنة حالة الطيّ من S + تطبيق الترتيب (تُستدعى من refreshAll)
function syncCardChrome(){
  decorateAllCards(document);
  var cards=document.querySelectorAll('.card[data-ckey],.dash-tile[data-ckey]');
  var cc=cardCfg().cardCollapsed, cs=cardCfg().cardSpan;
  for(var i=0;i<cards.length;i++){
    var k=cards[i].getAttribute('data-ckey');
    // الإقلاع async: أول زخرفة تسبق وصول الحالة من IndexedDB، فالترحيل هناك يرى إعدادات فارغة — رحّل هنا أيضاً (عديم الأثر بعد أول مرة)
    if(cards[i].getAttribute('data-cid'))adoptLegacyCardKey(cards[i],k);
    cards[i].classList.toggle('card-collapsed',!!cc[k]); applyCardSpan(cards[i],cs[k]);
  }
  applyTileHidden();
  applyCardOrders();
  applyPageCols();                 // عدد أعمدة الصفحة النشطة (مستقلّ لكل صفحة)
  renderOrganizePanel();
  scheduleRelayout();              // ماسونري Grid
}
var _cardObs=null;
function initCardSystem(){
  if(!_cardRO&&typeof ResizeObserver!=='undefined'){ _cardRO=new ResizeObserver(function(){ scheduleRelayout(); }); }
  window.addEventListener('resize',scheduleRelayout);
  syncCardChrome();
  if(_cardObs)return;
  _cardObs=new MutationObserver(function(muts){
    var touched=false;
    for(var i=0;i<muts.length;i++){
      var added=muts[i].addedNodes;
      for(var j=0;j<added.length;j++){
        var n=added[j]; if(n.nodeType!==1)continue;
        if(isCardEl(n)){ if(decorateCard(n))touched=true; }
        if(n.querySelectorAll){ var cc=n.querySelectorAll(TILE_SEL); for(var x=0;x<cc.length;x++){ if(decorateCard(cc[x]))touched=true; } }
      }
      // بطاقة مزخرفة استُبدل محتواها (innerHTML) فمُسحت أدواتها → أعِد حقنها
      var tgt=muts[i].target;
      if(tgt&&tgt.nodeType===1&&tgt.getAttribute&&tgt.getAttribute('data-cdeco')==='1'&&!tgt.querySelector(':scope > .card-tools')){ ensureCardTools(tgt); }
    }
    if(touched)applyCardOrders();                                              // حُرّاس: لا حلقة لا نهائية (المنقول مزخرف مسبقاً)
    scheduleRelayout();                                                        // أعِد ضبط ارتفاعات الماسونري بعد أي تغيّر
  });
  _cardObs.observe(document.body,{childList:true,subtree:true});
}
