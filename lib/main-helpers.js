'use strict';
// lib/main-helpers.js — pure, testable helpers for the Electron main process:
// where user data lives, backup file names, and the folder-sync file.
// No Electron imports here, so tests can require it directly (tests/main-helpers.test.js).

const fs = require('fs');
const path = require('path');

// Existing installs keep their data folder. Electron used to derive it from the old npm
// package name, so it is literally "noah-dashboard" — never rename it or that data is orphaned.
const LEGACY_USERDATA_DIR = 'noah-dashboard';
const USERDATA_DIR = 'Mustadrik';

// Daily disk backups: new name + the legacy name, both are listed/read/pruned.
const BACKUP_PREFIX = 'mustadrik-backup-';
const LEGACY_BACKUP_PREFIX = 'noah-backup-';
const BACKUP_RE = /^(mustadrik|noah)-backup-\d{4}-\d{2}-\d{2}\.json$/;
const MAX_BACKUPS = 14;

// Folder sync ("live" file inside the chosen backups folder).
const SYNC_FILE = 'mustadrik-live.json';
const LEGACY_SYNC_FILE = 'noah-live.json';

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function localDateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

// A folder "has user data" when Chromium storage or our backups exist in it.
function hasUserData(dir) {
  return ['IndexedDB', 'Local Storage', 'backups'].some((sub) => {
    try { return fs.existsSync(path.join(dir, sub)); } catch (_) { return false; }
  });
}

// --data-dir=<path> (portable / testing) — returns null when absent.
function parseDataDirArg(argv) {
  for (const a of argv || []) {
    if (typeof a === 'string' && a.startsWith('--data-dir=')) {
      const v = a.slice('--data-dir='.length).trim();
      if (v) return v;
    }
  }
  return null;
}

// Decide the userData folder:
//   1. explicit override (--data-dir=… or MUSTADRIK_USER_DATA) — tests, portable use;
//   2. the legacy folder, when it already holds data (existing users);
//   3. otherwise the new "Mustadrik" folder (new users).
function resolveUserDataDir(appDataDir, opts) {
  opts = opts || {};
  const override = opts.override || parseDataDirArg(opts.argv) || (opts.env && opts.env.MUSTADRIK_USER_DATA);
  if (override) return { dir: path.resolve(override), reason: 'override' };
  const legacy = path.join(appDataDir, LEGACY_USERDATA_DIR);
  if (hasUserData(legacy)) return { dir: legacy, reason: 'legacy' };
  return { dir: path.join(appDataDir, USERDATA_DIR), reason: 'new' };
}

// Only plain backup file names we created ourselves — blocks path traversal from the renderer.
function isBackupFileName(name) {
  return typeof name === 'string' && path.basename(name) === name && BACKUP_RE.test(name);
}
function backupFileName(date) { return BACKUP_PREFIX + localDateKey(date) + '.json'; }

// Backups in a folder, newest first. When the same day exists under both prefixes the
// new-prefix file wins (it is the one we keep writing).
function listBackups(dir) {
  let names = [];
  try { names = fs.readdirSync(dir).filter(isBackupFileName); } catch (_) { return []; }
  return names
    .map((name) => {
      const st = fs.statSync(path.join(dir, name));
      return { name, mtime: st.mtimeMs, size: st.size };
    })
    .sort((a, b) => b.mtime - a.mtime || (a.name.startsWith(BACKUP_PREFIX) ? -1 : 1));
}

// Keep the newest `keep` backups (both prefixes counted together); returns deleted names.
function pruneBackups(dir, keep) {
  keep = typeof keep === 'number' ? keep : MAX_BACKUPS;
  const removed = [];
  listBackups(dir).slice(keep).forEach((b) => {
    try { fs.unlinkSync(path.join(dir, b.name)); removed.push(b.name); } catch (_) {}
  });
  return removed;
}

// The sync file to read: whichever of the new/legacy names was written most recently
// (a device still on an older version keeps writing the legacy name).
function pickSyncFile(dir) {
  let best = null;
  for (const name of [SYNC_FILE, LEGACY_SYNC_FILE]) {
    const f = path.join(dir, name);
    try {
      if (fs.existsSync(f)) {
        const t = fs.statSync(f).mtimeMs;
        if (!best || t > best.t) best = { file: f, t };
      }
    } catch (_) {}
  }
  return best ? best.file : null;
}

module.exports = {
  LEGACY_USERDATA_DIR, USERDATA_DIR,
  BACKUP_PREFIX, LEGACY_BACKUP_PREFIX, MAX_BACKUPS,
  SYNC_FILE, LEGACY_SYNC_FILE,
  localDateKey, hasUserData, parseDataDirArg, resolveUserDataDir,
  isBackupFileName, backupFileName, listBackups, pruneBackups, pickSyncFile,
};
