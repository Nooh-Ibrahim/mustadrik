'use strict';

const { app, BrowserWindow, ipcMain, shell, Menu, dialog,
        Tray, nativeImage, globalShortcut, powerMonitor, Notification, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const H = require('./lib/main-helpers');

// ---- userData: must be decided BEFORE app-ready ----
// Existing installs keep %APPDATA%/noah-dashboard (the legacy folder, detected by the data inside it);
// new installs get %APPDATA%/Mustadrik. --data-dir=<path> or MUSTADRIK_USER_DATA override it
// (portable use, and running tests against a scratch copy without touching real data).
const USER_DATA = H.resolveUserDataDir(app.getPath('appData'), { argv: process.argv, env: process.env });
app.setPath('userData', USER_DATA.dir);

// ---- single instance lock ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// ---- background-mode state (Tray + global hotkey + reminders) ----
let tray = null;            // system-tray icon (keeps the app alive after the window is "closed")
let captureWin = null;      // tiny global quick-capture popup
let isQuitting = false;     // true only on a real quit (Tray → خروج / before-quit) so close-to-tray works
let trayOnClose = true;     // close button hides to tray instead of quitting (toggled from settings)
let hotkeyEnabled = true;   // global Ctrl+Alt+N quick-capture
let shownTrayHint = false;  // one-time "running in background" notice

// ---- robustness: many "white screen / not responding" reports on varied
// Windows GPUs are fixed by disabling hardware acceleration. Cheap + safe here. ----
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

let mainWindow = null;

// ---- app config (persisted JSON in userData) — holds the custom backup folder ----
function configPath() { return path.join(app.getPath('userData'), 'app-config.json'); }
function readConfig() { try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')) || {}; } catch (e) { return {}; } }
function writeConfig(c) { try { fs.writeFileSync(configPath(), JSON.stringify(c), 'utf8'); } catch (e) {} }

// ---- local crash/error log (privacy-first: file on disk only, never sent anywhere) ----
function logsDir() {
  const dir = path.join(app.getPath('userData'), 'logs');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  return dir;
}
function appendLog(kind, msg) {
  try {
    const f = path.join(logsDir(), 'errors.log');
    fs.appendFileSync(f, '[' + new Date().toISOString() + '] [' + kind + '] ' + String(msg).slice(0, 4000) + '\n', 'utf8');
    // rotate: keep the file under ~512KB (trim oldest half)
    const st = fs.statSync(f);
    if (st.size > 512 * 1024) {
      const txt = fs.readFileSync(f, 'utf8');
      fs.writeFileSync(f, txt.slice(Math.floor(txt.length / 2)), 'utf8');
    }
  } catch (e) {}
}
process.on('uncaughtException', (err) => { appendLog('main-uncaught', (err && err.stack) || err); });
process.on('unhandledRejection', (err) => { appendLog('main-rejection', (err && err.stack) || err); });

// ---- backups folder: a user-chosen folder if set (e.g. a Google Drive synced folder), else userData ----
function backupsDir() {
  const c = readConfig();
  if (c.backupFolder) {
    try { fs.mkdirSync(c.backupFolder, { recursive: true }); if (fs.existsSync(c.backupFolder)) return c.backupFolder; } catch (e) {}
  }
  const dir = path.join(app.getPath('userData'), 'backups');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  return dir;
}

function createWindow() {
  // launched at login with --hidden → start silently in the tray (reminders still fire)
  const startHidden = process.argv.includes('--hidden');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#0f1117',
    title: 'مُستدرِك',
    frame: false,              // frameless: custom Arabic title bar (see #titlebar in renderer)
    show: !startHidden, // show immediately (dark bg, no white flash) so the window can never get "stuck hidden"
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,               // hardened: preload only uses contextBridge+ipcRenderer (sandbox-compatible)
      spellcheck: false,
      backgroundThrottling: false  // keep timers/reminders alive while minimized to tray
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // make sure the window is visible regardless of timing (unless we deliberately started hidden)
  if (!startHidden) {
    mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.focus(); });
    setTimeout(() => { if (mainWindow && !mainWindow.isVisible()) mainWindow.show(); }, 4000);
  }

  // close button → hide to tray (keep reminders running) instead of quitting, unless really quitting
  mainWindow.on('close', (e) => {
    if (!isQuitting && trayOnClose) {
      e.preventDefault();
      mainWindow.hide();
      if (!shownTrayHint) {
        shownTrayHint = true;
        const c = readConfig(); c.trayHintShown = true; writeConfig(c);
        try {
          if (Notification.isSupported()) new Notification({
            title: 'مُستدرِك يعمل في الخلفية',
            body: 'التنبيهات ستظل تصلك. للخروج الكامل: أيقونة شريط المهام ← خروج.'
          }).show();
        } catch (_) {}
      }
      return false;
    }
  });

  // recover from a renderer crash instead of sitting unresponsive (+ log it locally)
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    if (details && details.reason !== 'clean-exit') {
      appendLog('renderer-gone', details.reason + ' exitCode=' + details.exitCode);
      try { mainWindow.reload(); } catch (_) {}
    }
  });
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    appendLog('did-fail-load', code + ' ' + desc);
    console.error('did-fail-load', code, desc);
  });

  // open external links (http/https) in the system browser, never in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current) { e.preventDefault(); }
  });

  // minimal app menu (Arabic) + keep devtools accessible via F12
  buildMenu();

  // frameless: tell the renderer when the window is (un)maximized so the
  // custom title-bar can swap the maximize/restore icon.
  mainWindow.on('maximize',   () => { try { mainWindow.webContents.send('win-state', true);  } catch (_) {} });
  mainWindow.on('unmaximize', () => { try { mainWindow.webContents.send('win-state', false); } catch (_) {} });

  // permissions: allow microphone (voice brain dump), notifications, and fullscreen — deny the rest.
  try {
    mainWindow.webContents.session.setPermissionRequestHandler((wc, permission, callback) => {
      callback(permission === 'media' || permission === 'notifications' || permission === 'fullscreen');
    });
  } catch (_) {}
}

function buildMenu() {
  const template = [
    {
      label: 'ملف',
      submenu: [
        { label: 'تصغير', role: 'minimize' },
        { type: 'separator' },
        { label: 'خروج', role: 'quit' }
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { label: 'تراجع', role: 'undo' },
        { label: 'إعادة', role: 'redo' },
        { type: 'separator' },
        { label: 'قص', role: 'cut' },
        { label: 'نسخ', role: 'copy' },
        { label: 'لصق', role: 'paste' },
        { label: 'تحديد الكل', role: 'selectAll' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'إعادة تحميل', role: 'reload' },
        { label: 'تكبير', role: 'zoomIn' },
        { label: 'تصغير', role: 'zoomOut' },
        { label: 'الحجم الأصلي', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', role: 'togglefullscreen' },
        { label: 'أدوات المطور', role: 'toggleDevTools' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---- IPC: custom title-bar window controls (frameless) ----
ipcMain.on('win-action', (e, action) => {
  if (!mainWindow) return;
  const wc = mainWindow.webContents;
  switch (action) {
    case 'minimize':   mainWindow.minimize(); break;
    case 'maximize':   mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); break;
    case 'close':      mainWindow.close(); break;
    case 'fullscreen': mainWindow.setFullScreen(!mainWindow.isFullScreen()); break;
    case 'reload':     wc.reload(); break;
    case 'devtools':   wc.toggleDevTools(); break;
    case 'zoom-in':    wc.setZoomLevel(Math.min(3,  wc.getZoomLevel() + 0.5)); break;
    case 'zoom-out':   wc.setZoomLevel(Math.max(-3, wc.getZoomLevel() - 0.5)); break;
    case 'zoom-reset': wc.setZoomLevel(0); break;
  }
});
ipcMain.handle('win-is-maximized', () => (mainWindow ? mainWindow.isMaximized() : false));

// ---- IPC: سعي progress in the Windows taskbar (time-blindness aid; -1 clears) ----
ipcMain.on('taskbar-progress', (e, v) => {
  if (!mainWindow) return;
  try { mainWindow.setProgressBar(typeof v === 'number' ? v : -1); } catch (_) {}
});

// ---- IPC: taskbar flash when a session ends and window is not focused ----
ipcMain.on('flash-frame', () => {
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
    mainWindow.once('focus', () => mainWindow.flashFrame(false));
  }
});

// renderer → main payloads are JSON text of the app state; refuse anything else (defence in depth)
function isJsonText(s) { return typeof s === 'string' && s.length > 1 && s.length < 200 * 1024 * 1024 && s.charAt(0) === '{'; }

// ---- IPC: write a real backup file to disk (one per local day, newest 14 kept) ----
ipcMain.handle('backup-data', (e, jsonString) => {
  try {
    if (!isJsonText(jsonString)) return { ok: false, error: 'invalid payload' };
    const dir = backupsDir();
    const file = path.join(dir, H.backupFileName(new Date()));
    fs.writeFileSync(file, jsonString, 'utf8');
    H.pruneBackups(dir, H.MAX_BACKUPS);   // counts legacy "noah-backup-*" files too
    return { ok: true, file };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ---- IPC: list available backups ----
ipcMain.handle('list-backups', () => {
  try { return H.listBackups(backupsDir()); } catch (err) { return []; }
});

// ---- IPC: read latest (or named) backup content ----
ipcMain.handle('read-backup', (e, name) => {
  try {
    const dir = backupsDir();
    let target = name;
    if (target) {
      if (!H.isBackupFileName(target)) return { ok: false, error: 'invalid backup name' };   // no path traversal
    } else {
      const files = H.listBackups(dir);
      if (!files.length) return { ok: false, error: 'no backups' };
      target = files[0].name;
    }
    const content = fs.readFileSync(path.join(dir, target), 'utf8');
    return { ok: true, content, name: target };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ---- IPC: open the backups folder in Explorer ----
ipcMain.handle('open-backups-folder', () => {
  shell.openPath(backupsDir());
  return true;
});

// ---- IPC: renderer error → local log file (privacy-first) + open the logs folder ----
ipcMain.on('log-error', (e, msg) => { appendLog('renderer', msg); });
ipcMain.handle('open-logs-folder', () => { shell.openPath(logsDir()); return true; });

// ---- IPC: choose a custom backup folder (point it at a Google Drive synced folder for cloud backup) ----
ipcMain.handle('choose-backup-folder', async () => {
  try {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر مجلد النسخ الاحتياطي',
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    const c = readConfig(); c.backupFolder = res.filePaths[0]; writeConfig(c);
    return { ok: true, folder: res.filePaths[0] };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});
ipcMain.handle('get-backup-folder', () => {
  const c = readConfig();
  return { folder: c.backupFolder || backupsDir(), custom: !!c.backupFolder };
});

// ---- IPC: two-way folder sync — single live file in the (Drive-synced) backups folder ----
ipcMain.handle('sync-write', (e, jsonString) => {
  try {
    if (!isJsonText(jsonString)) return { ok: false, error: 'invalid payload' };
    fs.writeFileSync(path.join(backupsDir(), H.SYNC_FILE), jsonString, 'utf8');
    return { ok: true };
  }
  catch (err) { return { ok: false, error: String(err) }; }
});
ipcMain.handle('sync-read', () => {
  try {
    const f = H.pickSyncFile(backupsDir());   // newest of the current / legacy sync file names
    if (!f) return { ok: false, empty: true };
    return { ok: true, content: fs.readFileSync(f, 'utf8') };
  } catch (err) { return { ok: false, error: String(err) }; }
});

// ---- IPC: export-as dialog (save JSON wherever the user wants) ----
ipcMain.handle('export-dialog', async (e, jsonString, suggestedName) => {
  try {
    if (!isJsonText(jsonString)) return { ok: false, error: 'invalid payload' };
    const safeName = (typeof suggestedName === 'string' && path.basename(suggestedName) === suggestedName && /\.json$/i.test(suggestedName))
      ? suggestedName : 'mustadrik-export.json';
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ نسخة احتياطية',
      defaultPath: safeName,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    fs.writeFileSync(res.filePath, jsonString, 'utf8');
    return { ok: true, file: res.filePath };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ---- bring the main window to the front (it may be hidden in the tray) ----
function showMain() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// ---- system tray: lets the app keep running (and firing reminders) after "close" ----
function trayImage() {
  const candidates = [
    path.join(__dirname, 'build', 'icon.ico'),         // dev
    path.join(process.resourcesPath || '', 'icon.ico'), // packaged (extraResources)
    path.join(__dirname, 'src', 'assets', 'icon.ico')
  ];
  for (const p of candidates) {
    try { const img = nativeImage.createFromPath(p); if (img && !img.isEmpty()) return img; } catch (_) {}
  }
  return nativeImage.createEmpty();
}
function createTray() {
  if (tray) return;
  try { tray = new Tray(trayImage()); } catch (_) { return; }
  refreshTray();
  tray.on('click', showMain);
  tray.on('double-click', showMain);
}
// the fixed part of the tray menu (always present)
function trayBaseItems() {
  return [
    { label: 'فتح مُستدرِك', click: showMain },
    { label: 'التقاط فكرة سريعة', click: toggleCaptureWindow },
    { type: 'separator' },
    { label: 'خروج', click: () => { isQuitting = true; app.quit(); } }
  ];
}
// rebuild the tray menu + tooltip; prepends live timer controls when layer (b) is on (twTrayItems)
function refreshTray() {
  if (!tray) return;
  try { tray.setContextMenu(Menu.buildFromTemplate(twTrayItems().concat(trayBaseItems()))); } catch (_) {}
  try {
    const L = twState.layers || {};
    tray.setToolTip((L.tray && twState.active)
      ? ('مُستدرِك — ' + twFmt(twState.remainSec) + ' ' + (twState.isBreak ? 'راحة' : 'متبقّية'))
      : 'مُستدرِك');
  } catch (_) {}
}

// ---- tiny always-on-top quick-capture popup (global Ctrl+Alt+N) ----
function toggleCaptureWindow() {
  if (captureWin && !captureWin.isDestroyed()) { captureWin.close(); captureWin = null; return; }
  captureWin = new BrowserWindow({
    width: 480, height: 188, frame: false, resizable: false, alwaysOnTop: true,
    skipTaskbar: true, backgroundColor: '#11131a', show: false, fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  captureWin.loadFile(path.join(__dirname, 'src', 'capture.html'));
  captureWin.once('ready-to-show', () => { captureWin.show(); captureWin.focus(); });
  captureWin.on('blur', () => { if (captureWin && !captureWin.isDestroyed()) captureWin.close(); });
  captureWin.on('closed', () => { captureWin = null; });
}
ipcMain.on('capture-submit', (e, text) => {
  if (mainWindow && text && String(text).trim()) {
    try { mainWindow.webContents.send('quick-capture', String(text)); } catch (_) {}
  }
  if (captureWin && !captureWin.isDestroyed()) captureWin.close();
});
ipcMain.on('capture-cancel', () => { if (captureWin && !captureWin.isDestroyed()) captureWin.close(); });

// ---- native OS notification from the renderer (shows even when hidden in tray) ----
ipcMain.handle('notify-now', (e, opt) => {
  opt = opt || {};
  try {
    if (!Notification.isSupported()) return false;
    const n = new Notification({ title: opt.title || 'مُستدرِك', body: opt.body || '', silent: !!opt.silent });
    n.on('click', () => {
      showMain();
      if (opt.nav && mainWindow) { try { mainWindow.webContents.send('reminder-nav', opt.nav); } catch (_) {} }
    });
    n.show();
    if (mainWindow && !mainWindow.isFocused()) {
      try { mainWindow.flashFrame(true); mainWindow.once('focus', () => mainWindow.flashFrame(false)); } catch (_) {}
    }
    return true;
  } catch (_) { return false; }
});

// ---- auto-launch at Windows login (opt-in from settings) ----
ipcMain.handle('get-autolaunch', () => {
  try {
    const s = app.getLoginItemSettings();
    const hidden = !!s.openAsHidden ||
      !!(s.launchItems && s.launchItems.some(i => (i.args || []).some(a => /--hidden/.test(a))));
    return { enabled: !!s.openAtLogin, hidden: hidden };
  } catch (_) { return { enabled: false, hidden: false }; }
});
ipcMain.handle('set-autolaunch', (e, opt) => {
  opt = opt || {};
  try {
    app.setLoginItemSettings({
      openAtLogin: !!opt.enabled,
      openAsHidden: !!opt.hidden,
      args: opt.hidden ? ['--hidden'] : []
    });
    return true;
  } catch (_) { return false; }
});

// ---- toggles wired to the settings page ----
ipcMain.handle('set-tray-close', (e, v) => { trayOnClose = !!v; return true; });
function registerHotkey() {
  try { globalShortcut.unregister('CommandOrControl+Alt+N'); } catch (_) {}
  if (!hotkeyEnabled) return;
  try { globalShortcut.register('CommandOrControl+Alt+N', toggleCaptureWindow); } catch (_) {}
}
ipcMain.handle('set-hotkey', (e, v) => { hotkeyEnabled = !!v; registerHotkey(); return true; });

// ---- idle / power awareness → renderer pauses the timer when the user steps away ----
function startIdleWatch() {
  let idleSent = false;
  setInterval(() => {
    try {
      const idle = powerMonitor.getSystemIdleTime(); // seconds since last input
      if (idle >= 300 && !idleSent) { idleSent = true; if (mainWindow) mainWindow.webContents.send('system-idle'); }
      else if (idle < 5 && idleSent) { idleSent = false; if (mainWindow) mainWindow.webContents.send('system-active'); }
    } catch (_) {}
  }, 20000);
  const idle = () => { if (mainWindow) mainWindow.webContents.send('system-idle'); };
  const active = () => { if (mainWindow) mainWindow.webContents.send('system-active'); };
  try {
    powerMonitor.on('lock-screen', idle);
    powerMonitor.on('suspend', idle);
    powerMonitor.on('unlock-screen', active);
    powerMonitor.on('resume', active);
  } catch (_) {}
}

// ---- auto-update (electron-updater + GitHub Releases) ----
// يعمل فقط في نسخة مثبَّتة نُشرت بإعداد publish (وجود app-update.yml) — وإلا يتجاهل بصمت.
// privacy: يتحقق من GitHub Releases فقط؛ لا يرسل أي بيانات مستخدم.
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (_) {}
function initUpdates() {
  if (!autoUpdater || !app.isPackaged) return;
  if (process.env.PORTABLE_EXECUTABLE_DIR) return;   // النسخة المحمولة لا تُحدَّث ذاتياً — تُستبدل يدوياً
  try {
    if (!fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) return;  // لم يُفعَّل النشر بعد
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', (info) => {
      try { mainWindow.webContents.send('update-ready', info.version); } catch (_) {}
    });
    // first line only: electron-updater errors embed full HTTP headers (cookies) that don't belong in a log
    autoUpdater.on('error', (err) => appendLog('updater', String((err && err.message) || err).split(/\r?\n/)[0]));
    autoUpdater.checkForUpdates().catch(() => {});
    setInterval(() => { try { autoUpdater.checkForUpdates().catch(() => {}); } catch (_) {} }, 4 * 60 * 60 * 1000);
  } catch (err) { appendLog('updater', err); }
}
ipcMain.handle('update-restart', () => {
  if (!autoUpdater) return false;
  isQuitting = true;
  try { autoUpdater.quitAndInstall(); } catch (_) { return false; }
  return true;
});

// ==========================================================================
// ==== المؤقّت كويدجت (اختياري بالكامل): أزرار شريط المهام + شارة الدقائق،
//      قائمة Tray حيّة، و Mini-HUD عائم. الحالة تُدفع من الراسم دفعةً واحدة،
//      وكل طبقة مُطفأة افتراضياً (لا يظهر شيء حتى يفعّلها المستخدم في الضبط).
// ==========================================================================
let hudWin = null;                 // نافذة الـMini-HUD العائمة (طبقة ج)
let twState = {                    // آخر لقطة للمؤقّت وصلت من الراسم
  running: false, isBreak: false, isLongBreak: false,
  remainSec: 0, endAt: 0, totalSec: 0, active: false, label: '',
  accent: '#5750d8', layers: { thumbar: false, tray: false, hud: false }
};
let twIconImg = { play: null, pause: null, skip: null };  // أيقونات الأزرار (رسمها الراسم كـPNG)
let twOverlayImg = null;                                   // شارة الدقائق فوق أيقونة التاسك بار

function twFmt(sec) { sec = Math.max(0, sec | 0); const m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
function twToImg(dataUrl) {
  try { if (!dataUrl) return null; const img = nativeImage.createFromDataURL(dataUrl); return (img && !img.isEmpty()) ? img : null; } catch (_) { return null; }
}
// أي سطح تحكّم (HUD/Tray/thumbar) → الراسم الرئيسي عبر قناة موحّدة
function routeTwCommand(cmd) {
  if (cmd === 'open') { showMain(); return; }
  if (mainWindow) { try { mainWindow.webContents.send('tw-cmd', cmd); } catch (_) {} }
}

// ---- طبقة (أ): أزرار thumbnail toolbar على شريط المهام + شارة الدقائق ----
function twThumbarButtons() {
  const L = twState.layers || {};
  if (!L.thumbar) return [];
  const btns = [];
  if (twState.running && twIconImg.pause) btns.push({ icon: twIconImg.pause, tooltip: 'إيقاف مؤقّت', click: () => routeTwCommand('pause') });
  else if (!twState.running && twIconImg.play) btns.push({ icon: twIconImg.play, tooltip: 'بدء', click: () => routeTwCommand('start') });
  if (twState.isBreak && twIconImg.skip) btns.push({ icon: twIconImg.skip, tooltip: 'تخطّي الراحة', click: () => routeTwCommand('skip') });
  return btns;
}
function applyThumbar() {
  if (!mainWindow) return;
  const L = twState.layers || {};
  try { mainWindow.setThumbarButtons(twThumbarButtons()); } catch (_) {}
  try {
    if (L.thumbar && twState.running && twOverlayImg) {
      mainWindow.setOverlayIcon(twOverlayImg, (twState.remainSec > 0 ? Math.ceil(twState.remainSec / 60) + ' دقيقة' : 'المؤقّت'));
    } else {
      mainWindow.setOverlayIcon(null, '');
    }
  } catch (_) {}
}

// ---- طبقة (ب): عناصر المؤقّت الحيّة أعلى قائمة الـTray ----
function twTrayItems() {
  const L = twState.layers || {};
  if (!L.tray) return [];
  const items = [];
  if (twState.active) {
    items.push({ label: (twState.isBreak ? 'راحة' : 'سعي') + ' — ' + twFmt(twState.remainSec) + ' متبقّية', enabled: false });
    if (twState.running) items.push({ label: '⏸  إيقاف مؤقّت', click: () => routeTwCommand('pause') });
    else items.push({ label: '▶  متابعة', click: () => routeTwCommand('start') });
    if (twState.isBreak) items.push({ label: '⏭  تخطّي الراحة', click: () => routeTwCommand('skip') });
    items.push({ label: '■  إنهاء المؤقّت', click: () => routeTwCommand('reset') });
  } else {
    items.push({ label: 'المؤقّت متوقّف', enabled: false });
    items.push({ label: '▶  بدء جلسة سعي', click: () => routeTwCommand('start') });
  }
  items.push({ type: 'separator' });
  return items;
}

// ---- طبقة (ج): نافذة الـMini-HUD العائمة (تُسحب وتتذكّر موضعها) ----
function hudDefaultPos() {
  try { const d = screen.getPrimaryDisplay().workArea; return { x: d.x + d.width - 244, y: d.y + d.height - 108 }; }
  catch (_) { return { x: 80, y: 80 }; }
}
function clampHudPos(p) {
  try {
    const wa = screen.getDisplayMatching({ x: p.x | 0, y: p.y | 0, width: 224, height: 84 }).workArea;
    return { x: Math.round(Math.min(Math.max(p.x, wa.x), wa.x + wa.width - 224)),
             y: Math.round(Math.min(Math.max(p.y, wa.y), wa.y + wa.height - 84)) };
  } catch (_) { return p; }
}
function saveHudPos() {
  if (!hudWin || hudWin.isDestroyed()) return;
  try { const b = hudWin.getBounds(); const c = readConfig(); c.hudPos = { x: b.x, y: b.y }; writeConfig(c); } catch (_) {}
}
function twSendHud() {
  if (hudWin && !hudWin.isDestroyed()) { try { hudWin.webContents.send('tw-hud-state', twState); } catch (_) {} }
}
function ensureHud() {
  if (hudWin && !hudWin.isDestroyed()) { try { hudWin.showInactive(); } catch (_) {} return; }
  const cfg = readConfig();
  const pos = cfg.hudPos ? clampHudPos(cfg.hudPos) : hudDefaultPos();
  hudWin = new BrowserWindow({
    width: 224, height: 84, x: pos.x, y: pos.y,
    frame: false, resizable: false, movable: true, minimizable: false, maximizable: false,
    alwaysOnTop: true, skipTaskbar: true, fullscreenable: false, transparent: true,
    backgroundColor: '#00000000', hasShadow: false, show: false, focusable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  hudWin.loadFile(path.join(__dirname, 'src', 'hud.html'));
  try { hudWin.setAlwaysOnTop(true, 'screen-saver'); } catch (_) {}   // يطفو حتى فوق تطبيقات ملء الشاشة
  hudWin.once('ready-to-show', () => { try { hudWin.showInactive(); twSendHud(); } catch (_) {} });
  hudWin.on('moved', saveHudPos);
  hudWin.on('close', saveHudPos);
  hudWin.on('closed', () => { hudWin = null; });
}
function closeHud() { if (hudWin && !hudWin.isDestroyed()) { try { hudWin.close(); } catch (_) {} } hudWin = null; }

// ---- تطبيق كل الطبقات من الحالة الحالية ----
function applyWidgets() {
  applyThumbar();
  refreshTray();
  const L = twState.layers || {};
  if (L.hud && twState.active) { ensureHud(); twSendHud(); }
  else closeHud();
}

// ---- IPC للويدجت ----
ipcMain.on('tw-icons', (e, obj) => {
  obj = obj || {};
  twIconImg = { play: twToImg(obj.play), pause: twToImg(obj.pause), skip: twToImg(obj.skip) };
  applyThumbar();
});
ipcMain.on('tw-state', (e, s) => {
  s = s || {};
  const overlay = s.overlay; delete s.overlay;               // لا نخزّن الـdataURL الكبير في الحالة
  twState = Object.assign(twState, s);
  twState.layers = s.layers || { thumbar: false, tray: false, hud: false };
  twOverlayImg = twToImg(overlay);
  applyWidgets();
});
ipcMain.on('tw-command', (e, cmd) => routeTwCommand(cmd));

app.whenReady().then(() => {
  shownTrayHint = !!readConfig().trayHintShown;
  createWindow();
  createTray();
  registerHotkey();
  startIdleWatch();
  initUpdates();
});

app.on('second-instance', () => { showMain(); });

app.on('before-quit', () => { isQuitting = true; try { closeHud(); } catch (_) {} });
app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch (_) {} });

app.on('window-all-closed', () => {
  // with the tray active the window only hides, so this fires only after a real quit
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
