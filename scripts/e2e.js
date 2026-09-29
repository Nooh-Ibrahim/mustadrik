'use strict';
// scripts/e2e.js — end-to-end checks against the REAL app (main.js + renderer), never real user data.
//
//   node scripts/e2e.js fresh [appDir]            first run on an empty data folder (source, or dist/win-unpacked)
//   node scripts/e2e.js upgrade <oldAppDir>       seed data with an OLDER checkout, then open it with this one
//   node scripts/e2e.js shots [outDir]            demo data → screenshots for the README
//
// Every run uses a throwaway folder via --data-dir=… (see lib/main-helpers.js), and drives the app
// over the Chrome DevTools Protocol (--remote-debugging-port). Prints a JSON report; exit code 1 on failure.

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ELECTRON = require(path.join(ROOT, 'node_modules', 'electron'));   // path to electron.exe when required from node
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- tiny CDP client ----------
async function connect(port, timeoutMs) {
  const until = Date.now() + (timeoutMs || 30000);
  while (Date.now() < until) {
    try {
      const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      const page = list.find((t) => t.type === 'page' && /index\.html/.test(t.url));
      if (page) return openSocket(page.webSocketDebuggerUrl);
    } catch (_) {}
    await sleep(300);
  }
  throw new Error('app window did not appear on port ' + port);
}
function openSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let seq = 0; const pending = new Map(); const logs = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map((a) => a.value || a.description).join(' '));
      else if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception || {}).description);
    };
    ws.onerror = reject;
    ws.onopen = () => {
      const send = (method, params) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params: params || {} })); });
      const evaluate = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception || {}).description);
        return r.result.value;
      };
      send('Runtime.enable').then(() => resolve({ send, evaluate, logs, close: () => ws.close() }));
    };
  });
}

// main-process errors land in <userData>/logs/errors.log (main.js appendLog)
function mainErrors(dataDir) {
  try { return fs.readFileSync(path.join(dataDir, 'logs', 'errors.log'), 'utf8').split(/\r?\n/).filter(Boolean); } catch (_) { return []; }
}
// an old checkout runs on ITS OWN Electron when it has one (faithful: old Chromium writes the IndexedDB)
// …or a packaged build folder (Mustadrik.exe + resources/app) — its bundled runtime is the old Electron
function packagedExe(appDir) { const f = path.join(appDir, 'Mustadrik.exe'); return fs.existsSync(f) ? f : null; }
function appRoot(appDir) { return packagedExe(appDir) ? path.join(appDir, 'resources', 'app') : appDir; }
function electronFor(appDir) {
  if (packagedExe(appDir)) return packagedExe(appDir);
  try { return require(path.join(appDir, 'node_modules', 'electron')); } catch (_) { return ELECTRON; }
}
function launch(appDir, dataDir, port, extraEnv) {
  const child = spawn(electronFor(appDir), [appDir, '--data-dir=' + dataDir, '--remote-debugging-port=' + port], {
    cwd: appDir, env: Object.assign({}, process.env, extraEnv || {}), stdio: 'ignore', windowsHide: false,
  });
  return child;
}
async function stop(child) {
  if (!child || child.exitCode != null) return;
  child.kill();
  for (let i = 0; i < 40 && child.exitCode == null; i++) await sleep(100);
}
const waitBoot = (c) => c.evaluate('for(let i=0;i<100;i++){ if(typeof stateHydrated!=="undefined"&&stateHydrated&&document.readyState==="complete")return true; await new Promise(r=>setTimeout(r,100)); } return false;');

// ---------- scenarios ----------
async function fresh(appDir) {
  appDir = appDir || ROOT;   // or a packaged build folder (dist/win-unpacked)
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mustadrik-e2e-fresh-'));
  const app = launch(appDir, dataDir, 9341);
  const out = { scenario: 'fresh', dataDir, app: packagedExe(appDir) || appDir };
  try {
    const c = await connect(9341);
    out.booted = await waitBoot(c);
    await sleep(900);
    Object.assign(out, await c.evaluate(`
      const ov=document.getElementById('onboard-overlay');
      return { wizardShown: !!(ov&&ov.classList.contains('show')), nameBefore: userName(), title: document.title,
               ritualOnTop: !!document.querySelector('.ritual-overlay.show, .niyyah-overlay.show') };`));
    Object.assign(out, await c.evaluate(`
      obNext(); document.getElementById('ob-name').value='مستخدم تجريبي'; obNext(); obNext(); obNext();
      document.getElementById('ob-city').value='Cairo'; const co=document.getElementById('ob-country'); co.value='Egypt'; co.dispatchEvent(new Event('input'));
      obState.pickedMethod=0; obNext(); S.settings.autoFetch=false; obFinish();
      await new Promise(r=>setTimeout(r,600));
      const prof=await dbGet('profiles', activeProfileId);
      return { onboarded:S.onboarded, method:S.settings.method, profileId:activeProfileId, profileName:prof&&prof.name, greeting:document.getElementById('greeting').textContent.trim() };`));
    // disk backup through the real IPC + path-traversal guard
    Object.assign(out, await c.evaluate(`
      const b=await noahAPI.backupData(JSON.stringify(S));
      const list=await noahAPI.listBackups();
      const bad=await noahAPI.readBackup('..\\\\..\\\\app-config.json');
      const good=await noahAPI.readBackup(list[0]&&list[0].name);
      const junk=await noahAPI.backupData('not json');
      return { backupOk:b.ok, backupName:list[0]&&list[0].name, traversalBlocked: bad.ok===false, readBackOk: good.ok&&JSON.parse(good.content).onboarded===true, junkRejected: junk.ok===false };`));
    await sleep(1200);   // let IndexedDB flush
    out.consoleErrors = c.logs;
    c.close();
  } finally { await stop(app); }
  out.dataDirHasIndexedDB = fs.existsSync(path.join(dataDir, 'IndexedDB'));
  out.mainErrors = mainErrors(dataDir);
  // the updater may legitimately fail offline / before the first GitHub release exists — report it, don't fail on it
  out.updaterNotes = out.mainErrors.filter((l) => /\[updater\]/.test(l));
  out.mainErrors = out.mainErrors.filter((l) => !/\[updater\]/.test(l));
  out.pass = !!(out.booted && out.wizardShown && out.nameBefore === '' && !out.ritualOnTop && out.onboarded && out.method === 5 &&
    out.profileName === 'مستخدم تجريبي' && out.backupOk && /^mustadrik-backup-/.test(out.backupName || '') && out.traversalBlocked &&
    out.readBackOk && out.junkRejected && out.dataDirHasIndexedDB && out.consoleErrors.length === 0 && out.mainErrors.length === 0);
  return out;
}

async function upgrade(oldAppDir) {
  if (!oldAppDir || !fs.existsSync(path.join(appRoot(oldAppDir), 'main.js'))) throw new Error('usage: e2e.js upgrade <dir of an older checkout with node_modules>');
  if (path.resolve(oldAppDir) === path.resolve(ROOT)) throw new Error('oldAppDir must be a separate (throwaway) checkout');
  // Versions before 11 hard-code the real %APPDATA%/noah-dashboard folder. Redirect that throwaway copy to the
  // scratch folder — and REFUSE to run if the redirect is not in place, so a test can never open real data.
  const oldMain = path.join(appRoot(oldAppDir), 'main.js');
  let src = fs.readFileSync(oldMain, 'utf8');
  const PIN = "app.setPath('userData', path.join(app.getPath('appData'), 'noah-dashboard'));";
  if (src.includes(PIN)) {
    src = src.replace(PIN, "app.setPath('userData', process.env.MUSTADRIK_E2E_OLD_USERDATA || (()=>{ throw new Error('e2e: userData redirect missing'); })());");
    fs.writeFileSync(oldMain, src);
  }
  if (!/MUSTADRIK_E2E_OLD_USERDATA|resolveUserDataDir/.test(fs.readFileSync(oldMain, 'utf8'))) throw new Error('refusing: the old checkout would open the real user-data folder');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mustadrik-e2e-upgrade-'));
  const fixture = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'legacy-state.json'), 'utf8');
  const out = { scenario: 'upgrade', dataDir, oldAppDir, oldRuntime: electronFor(oldAppDir) };
  // 1) the OLD app writes the (synthetic) legacy state into its own IndexedDB + a legacy disk backup
  let app = launch(oldAppDir, dataDir, 9342, { MUSTADRIK_E2E_OLD_USERDATA: dataDir });
  try {
    const c = await connect(9342);
    await sleep(2500);
    out.old = await c.evaluate(`
      S=Object.assign(freshState(), ${fixture}); migrate(S); save();
      await dbPut('profiles',{id:activeProfileId,name:'مستخدم تجريبي',isPrimary:true,createdAt:1,avatarId:null,coverId:null});
      await new Promise(r=>setTimeout(r,500));
      const b=await noahAPI.backupData(JSON.stringify(S));
      return { profileId: activeProfileId, sessions:S.sessions, backup: b.file ? b.file.split(/[\\\\/]/).pop() : null };`);
    await sleep(1500);
    c.close();
  } finally { await stop(app); }
  await sleep(800);
  // 2) THIS version opens the same folder
  app = launch(ROOT, dataDir, 9343);
  try {
    const c = await connect(9343);
    out.booted = await waitBoot(c);
    await sleep(1200);
    const expect = JSON.parse(fixture);
    out.after = await c.evaluate(`
      const ov=document.getElementById('onboard-overlay');
      const list=await noahAPI.listBackups();
      return { wizardShown: !!(ov&&ov.classList.contains('show')), profileId: activeProfileId, name: userName(),
               state: JSON.parse(JSON.stringify(S)), backups: list.map(b=>b.name) };`);
    const st = out.after.state; delete out.after.state;
    const keys = ['sessions', 'totalMin', 'activityLog', 'prayerTrack', 'habits', 'quran', 'adhkarLog', 'term', 'deadlines', 'unlockedBadges', 'profileName'];
    // every ORIGINAL leaf value must still be there, unchanged (the app may legitimately ADD fields)
    const missing = [];
    const walk = (a, b, at) => {
      if (a && typeof a === 'object') {
        if (!b || typeof b !== 'object') { missing.push(at + ' (container replaced)'); return; }
        for (const k of Object.keys(a)) walk(a[k], b[k], at + '.' + k);
      } else if (a !== b) missing.push(at + ': ' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
    };
    for (const k of keys) walk(expect[k], st[k], k);
    out.added = keys.filter((k) => JSON.stringify(st[k]) !== JSON.stringify(expect[k])).map((k) => k + ' ⊇ ' + JSON.stringify(st[k]).slice(0, 160));
    out.lostOrChanged = Object.keys(expect).filter((k) => !(k in st)).map((k) => 'lost:' + k).concat(missing);
    out.tasksKept = (st.tasks || []).map((t) => t.text);
    out.settingsKept = { method: st.settings.method, calm: st.settings.calm, hidden: st.settings.hidden };
    out.consoleErrors = c.logs;
    c.close();
  } finally { await stop(app); }
  out.mainErrors = mainErrors(dataDir);
  out.pass = !!(out.mainErrors.length === 0 && out.booted && !out.after.wizardShown && out.after.profileId === out.old.profileId && out.after.name === 'مستخدم تجريبي' &&
    out.lostOrChanged.length === 0 && out.tasksKept.length === 2 && out.after.backups.some((n) => /^noah-backup-/.test(n)) && out.consoleErrors.length === 0);
  return out;
}

async function shots(outDir) {
  outDir = path.resolve(outDir || path.join(ROOT, 'docs', 'screenshots'));
  fs.mkdirSync(outDir, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mustadrik-e2e-shots-'));
  const demo = require('./demo-data.js');
  const app = launch(ROOT, dataDir, 9344);
  const saved = [];
  try {
    const c = await connect(9344);
    await waitBoot(c);
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(1500);   // let the boot-time checks (restore offer, reminders) run first, then dismiss them
    await c.evaluate(`closeOnboarding(); if(typeof closeConfirm==='function')closeConfirm(); S=Object.assign(freshState(), ${JSON.stringify(demo.state())}); migrate(S); S.onboarded=true; save();
      activeProfileName=S.profileName; rerenderAfterStateSwap(); applyProfileName(); return true;`);
    for (const shot of demo.SHOTS) {
      await c.evaluate('if(typeof closeConfirm==="function")closeConfirm(); if(typeof closeBadgePopup==="function")closeBadgePopup(); var n=document.getElementById("notif"); if(n)n.classList.remove("show"); ' + shot.setup);
      await sleep(shot.wait || 900);
      const r = await c.send('Page.captureScreenshot', { format: 'png' });
      const f = path.join(outDir, shot.file);
      fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
      saved.push(path.relative(ROOT, f));
    }
    c.close();
  } finally { await stop(app); }
  return { scenario: 'shots', saved };
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  let res;
  try {
    if (cmd === 'fresh') res = await fresh(arg && path.resolve(arg));
    else if (cmd === 'upgrade') res = await upgrade(arg && path.resolve(arg));
    else if (cmd === 'shots') res = await shots(arg);
    else { console.log('usage: node scripts/e2e.js fresh [appDir] | upgrade <oldAppDir> | shots [outDir]'); process.exit(2); }
  } catch (e) { res = { error: String(e && e.stack || e), pass: false }; }
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.pass === false ? 1 : 0);
})();
