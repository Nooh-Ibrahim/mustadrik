'use strict';
// scripts/renderer-globals.js — the names every classic renderer script shares: each top-level
// function / var / let / const declared in src/js/*.js. The renderer is ~36 classic <script> files
// in ONE global scope (functions are called from inline onclick handlers and from each other).
// Used by eslint.config.js (so `no-undef` still works) and tests/handlers.test.js.

const fs = require('fs');
const path = require('path');

const SRC_JS = path.join(__dirname, '..', 'src', 'js');

// split "a=1, b=[1,2], c" on top-level commas only (stops at ';' or a // comment)
function topLevelParts(s) {
  const parts = []; let depth = 0, quote = null, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) { cur += ch; if (ch === '\\') { cur += s[++i] || ''; } else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ';' && depth === 0) break;
    else if (ch === '/' && s[i + 1] === '/' && depth === 0) break;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

function sharedRendererGlobals() {
  const names = {};
  const fn = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/;
  const vr = /^(?:var|let|const)\s+/;
  for (const f of fs.readdirSync(SRC_JS).filter((x) => x.endsWith('.js'))) {
    for (const line of fs.readFileSync(path.join(SRC_JS, f), 'utf8').split(/\r?\n/)) {
      const m = fn.exec(line);
      if (m) { names[m[1]] = 'writable'; continue; }
      if (!vr.test(line)) continue;
      for (const part of topLevelParts(line.replace(vr, ''))) {
        const n = /^\s*([A-Za-z_$][\w$]*)/.exec(part);
        if (n) names[n[1]] = 'writable';
      }
    }
  }
  return names;
}

module.exports = { sharedRendererGlobals, SRC_JS };
