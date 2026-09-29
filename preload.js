'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Secure, minimal API surface exposed to the renderer.
// contextIsolation is ON, so the renderer can only touch window.noahAPI.
contextBridge.exposeInMainWorld('noahAPI', {
  isElectron: true,
  flashFrame: () => ipcRenderer.send('flash-frame'),
  // سعي progress in the Windows taskbar (0..1, or -1 to clear)
  taskbarProgress: (v) => ipcRenderer.send('taskbar-progress', v),
  // auto-update: notified when a new version is downloaded + restart to install
  updates: {
    onReady: (cb) => ipcRenderer.on('update-ready', (e, v) => cb(v)),
    restart: () => ipcRenderer.invoke('update-restart')
  },
  backupData: (json) => ipcRenderer.invoke('backup-data', json),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  readBackup: (name) => ipcRenderer.invoke('read-backup', name),
  openBackupsFolder: () => ipcRenderer.invoke('open-backups-folder'),
  chooseBackupFolder: () => ipcRenderer.invoke('choose-backup-folder'),
  getBackupFolder: () => ipcRenderer.invoke('get-backup-folder'),
  exportDialog: (json, name) => ipcRenderer.invoke('export-dialog', json, name),
  // local error log (privacy-first: on-disk only, never uploaded)
  logError: (msg) => ipcRenderer.send('log-error', msg),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
  // two-way folder sync (single live file in the Drive-synced backups folder)
  syncWrite: (json) => ipcRenderer.invoke('sync-write', json),
  syncRead: () => ipcRenderer.invoke('sync-read'),
  // frameless custom title-bar window controls
  win: {
    action: (a) => ipcRenderer.send('win-action', a),
    isMaximized: () => ipcRenderer.invoke('win-is-maximized'),
    onState: (cb) => ipcRenderer.on('win-state', (e, max) => cb(max))
  },

  // ===== background mode: native reminders, tray, auto-launch, global hotkey, idle =====
  // fire a real OS notification (works even when the window is hidden in the tray)
  notifyNow: (title, body, nav) => ipcRenderer.invoke('notify-now', { title, body, nav }),
  // user clicked a reminder → navigate to a page
  onReminderNav: (cb) => ipcRenderer.on('reminder-nav', (e, nav) => cb(nav)),
  // text captured from the global quick-capture popup arrives here
  onQuickCapture: (cb) => ipcRenderer.on('quick-capture', (e, text) => cb(text)),
  // system idle/active (powerMonitor) → pause/resume the running timer
  onSystemIdle: (cb) => ipcRenderer.on('system-idle', () => cb()),
  onSystemActive: (cb) => ipcRenderer.on('system-active', () => cb()),
  // auto-launch at login
  autoLaunch: {
    get: () => ipcRenderer.invoke('get-autolaunch'),
    set: (opt) => ipcRenderer.invoke('set-autolaunch', opt)
  },
  // close button hides to tray (true) vs. quits (false)
  tray: { setClose: (v) => ipcRenderer.invoke('set-tray-close', v) },
  // enable/disable the global Ctrl+Alt+N capture hotkey
  hotkey: { set: (v) => ipcRenderer.invoke('set-hotkey', v) },

  // used by the small capture.html popup window (shares this preload)
  captureSubmit: (text) => ipcRenderer.send('capture-submit', text),
  captureCancel: () => ipcRenderer.send('capture-cancel'),

  // ===== timer widget (opt-in): taskbar thumbar/overlay, tray timer, floating mini-HUD =====
  // All three layers are driven by a single state push from the renderer; each is off by default.
  timerWidget: {
    // renderer → main: current timer snapshot (running, remaining, endAt, enabled layers, overlay badge)
    state: (s) => ipcRenderer.send('tw-state', s),
    // renderer → main: cached button/overlay icon PNGs (data URLs), sent once + on accent change
    icons: (obj) => ipcRenderer.send('tw-icons', obj),
    // any surface (HUD window, future callers) → main → routed to the main renderer
    command: (cmd) => ipcRenderer.send('tw-command', cmd),
    // main → main renderer: a widget control was pressed (start/pause/skip/reset/hud-off)
    onCommand: (cb) => ipcRenderer.on('tw-cmd', (e, cmd) => cb(cmd)),
    // main → HUD window: latest timer state to render
    onHudState: (cb) => ipcRenderer.on('tw-hud-state', (e, s) => cb(s))
  }
});
