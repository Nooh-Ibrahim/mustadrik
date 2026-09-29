// tests/handlers.test.js — every function named in an inline handler (onclick="…", onchange="…" …)
// must exist. ESLint cannot see these: a typo in index.html or in a rendered HTML string fails
// silently only when the user clicks. Scans src/*.html and the HTML strings built in src/js/*.js.
// تشغيل: npm test

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sharedRendererGlobals, SRC_JS } = require('../scripts/renderer-globals');

const SRC = path.join(__dirname, '..', 'src');
const KNOWN = new Set([
  ...Object.keys(sharedRendererGlobals()),
  // browser built-ins / expressions that legitimately appear inside handlers
  'if', 'return', 'function', 'typeof', 'parseInt', 'parseFloat', 'Number', 'String', 'Math', 'Date', 'JSON',
  'setTimeout', 'clearTimeout', 'alert', 'confirm', 'encodeURIComponent', 'isNaN', 'Boolean', 'Array', 'Object',
]);

function handlerCalls(text) {
  const out = [];
  // on<event>="…" or on<event>=\"…\" or on<event>='…'
  const attr = /\bon[a-z]+=\\?(["'])([\s\S]*?)\\?\1/g;
  let m;
  while ((m = attr.exec(text))) {
    const body = m[2];
    const call = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
    let c;
    while ((c = call.exec(body))) out.push(c[2]);
  }
  return out;
}

test('every function called from an inline event handler is defined', () => {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.html')).map((f) => path.join(SRC, f))
    .concat(fs.readdirSync(SRC_JS).filter((f) => f.endsWith('.js')).map((f) => path.join(SRC_JS, f)));
  const missing = [];
  let checked = 0;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    // capture.html / hud.html run their own inline <script>: names declared there are local to that page
    const local = new Set();
    if (f.endsWith('.html')) for (const d of text.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) local.add(d[1]);
    for (const name of handlerCalls(text)) {
      checked++;
      if (!KNOWN.has(name) && !local.has(name)) missing.push(path.relative(SRC, f) + ': ' + name);
    }
  }
  assert.ok(checked > 200, 'the scanner should find hundreds of handlers (found ' + checked + ')');
  assert.deepEqual([...new Set(missing)], []);
});
