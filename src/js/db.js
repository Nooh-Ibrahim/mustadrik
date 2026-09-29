// db.js — IndexedDB foundation for «الاستدراك» — LOAD AFTER core, BEFORE migrate/storage
// module 2/12 — classic script (globals shared, no ES modules). CSP unchanged.
//
// Design: small Promise-based wrapper + the full v2 schema. All records are isolated by
// `profileId` (multi-profile ready; «نوح» is the protected primary). Large binaries
// (audio recordings, avatar/cover/background images) live in `mediaBlobs` as native Blobs,
// kept separate from hot data so day/task reads stay fast.
//
// Phase-0 bridge: the live monolithic `S` object is persisted as ONE record in `profileState`
// (per profile). Later phases will migrate fields OUT of profileState into the structured
// stores (dayLog, tasks, sessions, mediaBlobs …) via versioned steps in migrate.js — the
// structured stores already exist here so the foundation/schema is complete.

var IDB_NAME = 'istidrak', IDB_VERSION = 1, _idb = null;

// ---- schema: single source of truth used by onupgradeneeded ----
// kp = keyPath, ai = autoIncrement, idx = [ [indexName, keyPath, options?], ... ]
var IDB_SCHEMA = {
  appMeta:      { kp:'key' },                                         // global singletons: {key, value}
  profiles:     { kp:'id' },                                          // {id, name, isPrimary, createdAt, avatarId, coverId}
  settings:     { kp:'profileId' },                                   // per-profile config (theme/mode, custom colors, appBgId, prayer cfg, durations…)
  profileState: { kp:'profileId' },                                   // Phase-0 bridge: {profileId, state:<the live S object>}
  dayLog:       { kp:['profileId','date'], idx:[['byProfile','profileId'],['byDate','date']] }, // daily record; prayers:{fajr:{status,delay,qadaDone,ts}…}, qada, quran, adhkar, habits, xp, pixelColor, note
  tasks:        { kp:'id', idx:[['byProfile','profileId'],['byDeadline','deadline'],['byParent','parentId'],['byArchived','archived']] },
  sessions:     { kp:'id', idx:[['byProfile','profileId'],['byTask','taskId']] },   // السعي session log
  habits:       { kp:'id', idx:[['byProfile','profileId']] },
  notes:        { kp:'id', idx:[['byProfile','profileId']] },         // markdown notes (دراسة متقدمة)
  grades:       { kp:'id', idx:[['byProfile','profileId'],['bySubject','subject']] },
  schedule:     { kp:'id', idx:[['byProfile','profileId']] },         // weekly time-blocking
  brainDump:    { kp:'id', idx:[['byProfile','profileId'],['byProcessed','processed']] }, // {type:'text'|'audio', text, audioId, processed}
  mediaBlobs:   { kp:'id', idx:[['byProfile','profileId'],['byKind','kind']] },     // audio + images: kind 'braindump'|'avatar'|'cover'|'appBg'|'adhan'
  walletLedger: { kp:'id', ai:true, idx:[['byProfile','profileId']] },// محفظة الإنجاز transactions: {profileId, ts, delta, reason, balanceAfter}
  achievements: { kp:['profileId','badgeId'], idx:[['byProfile','profileId']] },
  counters:     { kp:['profileId','counterId'] },                     // hot cumulative totals (minutes, sessions, qada per prayer, walletBalance, streak, level…)
  snapshots:    { kp:'id', ai:true, idx:[['byTs','ts']] }             // version history / pre-migration backups
};

function _req(req){ return new Promise(function(res,rej){ req.onsuccess=function(){res(req.result);}; req.onerror=function(){rej(req.error);}; }); }

function dbOpen(){
  if(_idb) return Promise.resolve(_idb);
  return new Promise(function(resolve,reject){
    var open;
    try{ open=indexedDB.open(IDB_NAME, IDB_VERSION); }
    catch(e){ reject(e); return; }
    open.onupgradeneeded=function(){
      var db=open.result;
      Object.keys(IDB_SCHEMA).forEach(function(name){
        if(db.objectStoreNames.contains(name)) return;
        var def=IDB_SCHEMA[name];
        var os=db.createObjectStore(name,{keyPath:def.kp,autoIncrement:!!def.ai});
        (def.idx||[]).forEach(function(ix){ os.createIndex(ix[0],ix[1],ix[2]||{}); });
      });
    };
    open.onsuccess=function(){ _idb=open.result; resolve(_idb); };
    open.onerror=function(){ reject(open.error); };
    open.onblocked=function(){ console.warn('[الاستدراك] IndexedDB open blocked (close other tabs)'); };
  });
}
function dbReady(){ return !!_idb; }

function _store(name,mode){ return _idb.transaction(name, mode||'readonly').objectStore(name); }
function dbGet(store,key){       return dbOpen().then(function(){ return _req(_store(store).get(key)); }); }
function dbGetAll(store){        return dbOpen().then(function(){ return _req(_store(store).getAll()); }); }
function dbPut(store,value){     return dbOpen().then(function(){ return _req(_store(store,'readwrite').put(value)); }); }
function dbDelete(store,key){    return dbOpen().then(function(){ return _req(_store(store,'readwrite').delete(key)); }); }
function dbClear(store){         return dbOpen().then(function(){ return _req(_store(store,'readwrite').clear()); }); }
function dbCount(store){         return dbOpen().then(function(){ return _req(_store(store).count()); }); }
function dbIndexGetAll(store,index,query){ return dbOpen().then(function(){ return _req(_store(store).index(index).getAll(query)); }); }

// ---- appMeta singletons (keyed by `key`, payload in `.value`) ----
function metaGet(key){ return dbGet('appMeta',key).then(function(r){ return r?r.value:undefined; }); }
function metaSet(key,value){ return dbPut('appMeta',{key:key,value:value}); }

// ---- media (Blob) helpers: audio recordings + profile/cover/background images ----
function mediaPut(meta,blob){
  var id=(meta&&meta.id)||('m_'+Date.now()+'_'+Math.random().toString(36).slice(2,8));
  var rec=Object.assign({ id:id, createdAt:Date.now(), size:(blob&&blob.size)||0 }, meta||{}, { id:id, blob:blob });
  return dbPut('mediaBlobs',rec).then(function(){ return id; });
}
function mediaGet(id){ return dbGet('mediaBlobs',id); }
function mediaDelete(id){ return dbDelete('mediaBlobs',id); }
function mediaURL(id){ return mediaGet(id).then(function(r){ return (r&&r.blob)?URL.createObjectURL(r.blob):null; }); }
