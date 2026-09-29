'use strict';
// Loads the ACTUAL packaged app.asar index.html, registers minimal IPC stubs,
// then performs REAL clicks and captures CSP console violations. Decisive packaged check.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const asarIndex = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'app.asar', 'src', 'index.html');

// minimal IPC stubs so renderer promises resolve
ipcMain.handle('backup-data', () => ({ ok: true }));
ipcMain.handle('list-backups', () => []);
ipcMain.handle('read-backup', () => ({ ok: false }));
ipcMain.handle('open-backups-folder', () => true);
ipcMain.handle('export-dialog', () => ({ ok: false, canceled: true }));
ipcMain.on('flash-frame', () => {});

app.disableHardwareAcceleration();

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  const msgs = [];
  // Electron ≥35 passes the details on the event object; keep the old positional args as a fallback
  win.webContents.on('console-message', (e, level, message) => {
    msgs.push((e && e.message) || message || '');
  });
  win.loadFile(asarIndex);
  win.webContents.on('did-finish-load', async () => {
    await new Promise(r => setTimeout(r, 2500));
    const probe = await win.webContents.executeJavaScript(`(async function(){try{
      navTo('pomodoro');
      var pomo=document.getElementById('page-pomodoro').classList.contains('active');
      navTo('tasks');
      var before=(typeof S!=='undefined'?(S.tasks||[]).length:-1);
      var marker='pkg click test';
      document.getElementById('task-input').value=marker;
      document.querySelector('#page-tasks .btn.pri').click();
      var after=(S.tasks||[]).length;
      navTo('home');
      // IndexedDB foundation probe (Phase 0)
      var idb={ready:false,stores:0,persisted:false};
      try{
        if(typeof dbOpen==='function'){
          await dbOpen(); idb.ready=dbReady(); idb.stores=_idb.objectStoreNames.length;
          await new Promise(function(r){setTimeout(r,200);}); // let write-through flush
          var ps=await dbGet('profileState',activeProfileId);
          idb.persisted=!!(ps&&ps.state&&(ps.state.tasks||[]).some(function(t){return t.text===marker;}));
        }
      }catch(e){ idb.err=e.message; }
      // data-safety: snapshot -> mutate -> restore round-trip (backup.js restore path)
      var snap={ok:false};
      try{
        if(typeof createSnapshot==='function' && typeof dbGetAll==='function'){
          var sentinel='verify_'+Date.now();
          S.__verifyMark=sentinel;
          await createSnapshot('verify roundtrip','user');
          S.__verifyMark='CHANGED';
          var all=await dbGetAll('snapshots');
          var mine=(all||[]).filter(function(s){return s.profileId===activeProfileId;}).sort(function(a,b){return b.ts-a.ts;});
          var restored=JSON.parse(mine[0].json);
          snap.ok=(restored.__verifyMark===sentinel);
          if(typeof dbDelete==='function')await dbDelete('snapshots',mine[0].id);
          delete S.__verifyMark;
        }
      }catch(e){ snap.err=e.message; }
      // sync (Round 6): applySyncedData applies remote AND creates a pre-pull guard snapshot
      var sync={ok:false,guard:false};
      try{
        if(typeof applySyncedData==='function'){
          var fake={ data: JSON.stringify(Object.assign({},S,{__syncMark:'SYNCED'})), updatedAt:Date.now() };
          applySyncedData(fake);
          sync.ok=(S.__syncMark==='SYNCED');
          await new Promise(function(r){setTimeout(r,150);});
          var snaps=await dbGetAll('snapshots');
          sync.guard=(snaps||[]).some(function(s){return s.kind==='sync';});
          delete S.__syncMark;
        }
      }catch(e){ sync.err=e.message; }
      // Round-6 new modules render without throwing
      var r6={};
      try{ navTo('home'); ['renderIslamicCard','renderMedSettings','renderRemindSettings'].forEach(function(fn){ if(typeof window[fn]==='function'){ try{window[fn]();r6[fn]='ok';}catch(e){r6[fn]='ERR:'+e.message;} } else { r6[fn]='missing'; } }); }catch(e){ r6.err=e.message; }
      // icons() صارت مُجمَّعة (نداء واحد آخر الإطار) — نُفرغ الطابور فوراً كي يكون العدّ حتمياً
      try{ if(typeof iconsNow==='function')iconsNow(); }catch(e){}
      return JSON.stringify({pomodoroSwitched:pomo, taskAdded:(after===before+1), icons:document.querySelectorAll('svg.lucide').length, idb:idb, snap:snap, sync:sync, r6:r6});
    }catch(e){return 'ERR '+e.message;}})()`).catch(e => 'EXEC ' + e.message);
    const cspErrors = msgs.filter(m => /Refused to execute inline|Content Security Policy/i.test(m));
    console.log('=== PACKAGED PROBE ===');
    console.log(probe);
    console.log('=== CSP violations in console:', cspErrors.length, '===');
    if (cspErrors.length) console.log(cspErrors.slice(0, 2).join('\n'));
    app.quit();
  });
});
