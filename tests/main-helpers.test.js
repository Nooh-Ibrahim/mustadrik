// tests/main-helpers.test.js — مسار بيانات المستخدم وأسماء ملفات النسخ (العملية الرئيسية)
// تشغيل: npm test

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const H = require('../lib/main-helpers');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mustadrik-test-')); }
function touch(f, mtimeMs) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, '{}'); if (mtimeMs) fs.utimesSync(f, mtimeMs / 1000, mtimeMs / 1000); }

test('existing users keep the legacy data folder', () => {
  const appData = tmp();
  fs.mkdirSync(path.join(appData, 'noah-dashboard', 'IndexedDB'), { recursive: true });
  const r = H.resolveUserDataDir(appData, { argv: [], env: {} });
  assert.equal(r.reason, 'legacy');
  assert.equal(r.dir, path.join(appData, 'noah-dashboard'));
});

test('new users get the Mustadrik folder (an empty legacy folder does not count)', () => {
  const appData = tmp();
  fs.mkdirSync(path.join(appData, 'noah-dashboard', 'Cache'), { recursive: true });
  const r = H.resolveUserDataDir(appData, { argv: [], env: {} });
  assert.equal(r.reason, 'new');
  assert.equal(r.dir, path.join(appData, 'Mustadrik'));
});

test('--data-dir and MUSTADRIK_USER_DATA override everything', () => {
  const appData = tmp();
  fs.mkdirSync(path.join(appData, 'noah-dashboard', 'IndexedDB'), { recursive: true });
  const target = path.join(appData, 'scratch');
  assert.equal(H.resolveUserDataDir(appData, { argv: ['electron', '.', '--data-dir=' + target], env: {} }).dir, target);
  assert.equal(H.resolveUserDataDir(appData, { argv: [], env: { MUSTADRIK_USER_DATA: target } }).dir, target);
});

test('backup names: only our own plain file names are accepted (no path traversal)', () => {
  assert.ok(H.isBackupFileName('mustadrik-backup-2026-09-29.json'));
  assert.ok(H.isBackupFileName('noah-backup-2026-09-28.json'));
  for (const bad of ['../x.json', '..\\..\\secret.json', 'C:\\x\\noah-backup-2026-09-28.json', 'noah-backup-2026-09-28.json/../../a',
                     'mustadrik-backup-2026-9-2.json', 'other.json', '', null, 42]) {
    assert.equal(H.isBackupFileName(bad), false, String(bad));
  }
  assert.match(H.backupFileName(new Date(2026, 8, 5, 1, 0)), /^mustadrik-backup-2026-09-05\.json$/);
});

test('listBackups/pruneBackups handle legacy and new names together', () => {
  const dir = tmp();
  const t0 = Date.now() - 30 * 86400000;
  for (let i = 0; i < 10; i++) touch(path.join(dir, 'noah-backup-2026-08-' + String(10 + i).padStart(2, '0') + '.json'), t0 + i * 86400000);
  for (let i = 0; i < 8; i++) touch(path.join(dir, 'mustadrik-backup-2026-09-' + String(10 + i).padStart(2, '0') + '.json'), t0 + (20 + i) * 86400000);
  touch(path.join(dir, 'notes.json'));
  assert.equal(H.listBackups(dir).length, 18);
  const removed = H.pruneBackups(dir, 14);
  assert.equal(removed.length, 4);
  assert.ok(removed.every((n) => n.startsWith('noah-backup-')), 'the oldest (legacy) ones go first');
  const left = H.listBackups(dir);
  assert.equal(left.length, 14);
  assert.match(left[0].name, /^mustadrik-backup-2026-09-17/);
  assert.ok(fs.existsSync(path.join(dir, 'notes.json')), 'unrelated files are never touched');
});

test('pickSyncFile() reads whichever sync file was written last', () => {
  const dir = tmp();
  assert.equal(H.pickSyncFile(dir), null);
  touch(path.join(dir, 'noah-live.json'), Date.now() - 1000);
  assert.equal(path.basename(H.pickSyncFile(dir)), 'noah-live.json');
  touch(path.join(dir, 'mustadrik-live.json'), Date.now());
  assert.equal(path.basename(H.pickSyncFile(dir)), 'mustadrik-live.json');
  touch(path.join(dir, 'noah-live.json'), Date.now() + 5000);   // an older-version device just wrote
  assert.equal(path.basename(H.pickSyncFile(dir)), 'noah-live.json');
});
