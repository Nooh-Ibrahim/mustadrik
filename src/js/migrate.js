// migrate.js — data bootstrap + versioned migration framework — LOAD AFTER db, BEFORE storage
// module 3/12 — classic script (globals shared, no ES modules).
//
// Per owner's decision: we do NOT try to rescue legacy test data; the goal is to PROTECT
// data going forward. This file (a) bootstraps a protected primary profile (named during onboarding), and
// (b) provides a versioned upgrade pipeline (appMeta.dataVersion → DM_STEPS) that takes a
// rollback snapshot before each future structural change. At DATA_VERSION=1 there are no
// steps yet — the machinery is in place for every future update.

var DATA_VERSION = 1;   // bump + add a DM_STEPS entry whenever the structured schema changes

// versioned upgrade steps, e.g. { 2: function(){ return moveActivityLogIntoDayLog(); }, ... }
// each returns a Promise, runs once, in ascending order, guarded by appMeta.dataVersion.
var DM_STEPS = {};

// (حُذف dmActiveProfile — كان ميتاً)

// rollback safety: snapshot all profileState records before a migration step
function dmSnapshot(label){
  return dbGetAll('profileState').then(function(rows){
    var json=JSON.stringify(rows||[]);
    return dbPut('snapshots',{ ts:Date.now(), label:label||'auto', scope:'profileState', json:json, size:json.length });
  }).catch(function(){ /* snapshot must never block boot */ });
}

// ensure DB has a primary profile + sane appMeta defaults (runs every boot, no-ops after first)
function dmBootstrap(){
  return dbOpen().then(function(){ return metaGet('activeProfileId'); }).then(function(active){
    if(active){ activeProfileId=active; return; }              // already initialised
    // first ever run on IndexedDB → create the protected primary profile.
    // Its display name starts EMPTY: the onboarding wizard asks for it (S.onboarded=false on a fresh state).
    // A legacy localStorage state (pre-IndexedDB versions) is carried over losslessly — same shape as S.
    var legacy=null;
    try{
      var raw=localStorage.getItem(LS_STATE_KEY)||localStorage.getItem(LS_MIRROR_KEY);
      if(raw){ var s=JSON.parse(raw); if(s&&typeof s==='object'&&!Array.isArray(s)) legacy=s; }
    }catch(e){}
    activeProfileId=PRIMARY_PROFILE_ID;
    var legacyName=(legacy&&typeof legacy.profileName==='string')?legacy.profileName:'';
    return dbPut('profiles',{ id:PRIMARY_PROFILE_ID, name:legacyName, isPrimary:true, createdAt:Date.now(), avatarId:null, coverId:null })
      .then(function(){ return metaSet('activeProfileId',PRIMARY_PROFILE_ID); })
      .then(function(){ return metaSet('dataVersion',legacy?1:DATA_VERSION); })   // legacy seed → run every step
      .then(function(){ if(legacy) return dbPut('profileState',{ profileId:PRIMARY_PROFILE_ID, state:legacy }); });
  }).then(function(){ return dmRun(); });
}

// run any pending versioned migrations (none at DATA_VERSION=1; framework ready for the future)
function dmRun(){
  return metaGet('dataVersion').then(function(cur){
    cur=(typeof cur==='number')?cur:1;
    var chain=Promise.resolve();
    for(var v=cur+1; v<=DATA_VERSION; v++){
      (function(ver){
        chain=chain
          .then(function(){ return dmSnapshot('pre-v'+ver); })
          .then(function(){ return DM_STEPS[ver] ? DM_STEPS[ver]() : null; })
          .then(function(){ return metaSet('dataVersion',ver); })
          .then(function(){ console.info('[Mustadrik] migrated data → v'+ver); });
      })(v);
    }
    return chain;
  });
}
