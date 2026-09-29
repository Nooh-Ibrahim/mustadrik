// rewards.js — «بنك المكافآت»: اصرف الدرجات المكتسبة على مكافآت يحدّدها المستخدم بنفسه (دافع ADHD)
// classic script (globals shared, no ES modules). الرصيد القابل للصرف = getXP() − الدرجات المصروفة.

function rewardsCfg(){
  if(!Array.isArray(S.rewards))S.rewards=[];
  if(typeof S.rewardsSpent!=='number')S.rewardsSpent=0;
  if(!Array.isArray(S.rewardLog))S.rewardLog=[];
  return S;
}
function rewardAvailable(){ rewardsCfg(); return Math.max(0,(typeof getXP==='function'?getXP():0)-(S.rewardsSpent||0)); }

function addReward(){
  var n=document.getElementById('reward-name'), c=document.getElementById('reward-cost');
  if(!n)return;
  var name=(n.value||'').trim(), cost=Math.max(1,parseInt(c&&c.value,10)||0);
  if(!name||!cost){ if(typeof notify==='function')notify('اكتب اسم المكافأة وتكلفتها بالدرجات','alert-circle'); return; }
  rewardsCfg(); S.rewards.push({id:'rw_'+Date.now().toString(36),name:name,cost:cost});
  n.value=''; if(c)c.value='';
  if(typeof save==='function')save(); renderRewards();
}
function deleteReward(id){ rewardsCfg(); S.rewards=S.rewards.filter(function(r){return r.id!==id;}); if(typeof save==='function')save(); renderRewards(); }
function redeemReward(id){
  rewardsCfg();
  var r=S.rewards.find(function(x){return x.id===id;}); if(!r)return;
  var avail=rewardAvailable();
  if(avail<r.cost){ if(typeof notify==='function')notify('باقٍ '+(r.cost-avail)+' درجة لتفتح «'+r.name+'»','lock'); return; }
  S.rewardsSpent=(S.rewardsSpent||0)+r.cost;
  S.rewardLog.unshift({name:r.name,cost:r.cost,at:Date.now()});
  if(S.rewardLog.length>30)S.rewardLog=S.rewardLog.slice(0,30);
  if(typeof save==='function')save(); renderRewards();
  if(typeof notify==='function')notify('استمتع بـ «'+r.name+'» — استحققتها! 🎁','party-popper');
  if(typeof playClick==='function')try{playClick();}catch(e){}
}
function renderRewards(){
  var el=document.getElementById('rewards-body'); if(!el)return; rewardsCfg();
  var avail=rewardAvailable();
  var html='<div class="rw-balance"><i data-lucide="coins"></i> رصيدك القابل للصرف: <b>'+avail+'</b> درجة</div>'+
    '<div class="add-bar" style="margin:.7rem 0">'+
      '<input id="reward-name" class="add-bar-input" placeholder="مكافأة (مثلاً: حلقة من مسلسلي)" maxlength="40" onkeydown="if(event.key===\'Enter\')addReward()">'+
      '<input id="reward-cost" type="number" min="1" placeholder="التكلفة" style="width:96px">'+
      '<button class="btn pri" onclick="addReward()"><i data-lucide="plus"></i> أضف</button>'+
    '</div>';
  if(!S.rewards.length){
    html+='<div class="setting-sub">أضف مكافآت تحفّزك — كلٌّ بتكلفة بالدرجات. تكسبها بمجهودك (دراسةً وعبادةً والتزاماً)، وتصرفها بضمير مرتاح.</div>';
  }else{
    html+='<div class="rw-list">'+S.rewards.map(function(r){
      var ok=avail>=r.cost;
      return '<div class="rw-item'+(ok?' rw-ok':'')+'">'+
        '<div class="rw-info"><div class="rw-name">'+esc(r.name)+'</div>'+
          '<div class="rw-cost"><i data-lucide="coins"></i> '+r.cost+' درجة</div></div>'+
        '<div class="rw-actions">'+
          '<button class="btn sm'+(ok?' pri':'')+'" onclick="redeemReward(\''+r.id+'\')"'+(ok?'':' disabled')+'><i data-lucide="'+(ok?'unlock':'lock')+'"></i> '+(ok?'اصرفها':'مقفلة')+'</button>'+
          '<button class="icon-btn" onclick="deleteReward(\''+r.id+'\')" title="حذف"><i data-lucide="trash-2"></i></button>'+
        '</div></div>';
    }).join('')+'</div>';
  }
  if(S.rewardLog.length){
    html+='<div class="rw-hist-title">آخر ما صرفت</div><div class="rw-hist">'+
      S.rewardLog.slice(0,6).map(function(h){ return '<span class="rw-hist-chip">'+esc(h.name)+' · '+h.cost+'</span>'; }).join('')+'</div>';
  }
  el.innerHTML=html; if(typeof icons==='function')icons();
}
