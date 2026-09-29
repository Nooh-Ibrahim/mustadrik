'use strict';
// bundle-web.js
// Reverse of split.js — folds styles.css + renderer.js back into a single self-contained
// HTML file suitable for opening directly in a browser (no Electron, no local server).
// Differences vs the Electron version:
//  • Google Fonts loaded from CDN (browser has internet; Electron used local copies).
//  • Lucide loaded from CDN (same reason).
//  • CSP meta removed (would block onclick handlers in a plain browser tab).
//  • noahAPI calls are already guarded by if(window.noahAPI) — degrade gracefully.

const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '..', 'src');
// same lucide release as the bundled offline copy (src/assets/lucide.min.js)
const LUCIDE_VERSION = (/lucide v([\d.]+)/.exec(fs.readFileSync(path.join(SRC, 'assets', 'lucide.min.js'), 'utf8').slice(0, 200)) || [])[1] || '1.17.0';
const css  = fs.readFileSync(path.join(SRC, 'styles.css'),   'utf8');
let   html = fs.readFileSync(path.join(SRC, 'index.html'),   'utf8');
// renderer modules, in the exact load order of index.html (single source of truth — no second list to keep in sync)
const JS_MODULES = Array.from(html.matchAll(/<script defer src="js\/([\w-]+)\.js"><\/script>/g), function(m){ return m[1]; });
if (JS_MODULES.length < 10) throw new Error('could not read the module list from index.html');
const js   = JS_MODULES.map(function(m){ return fs.readFileSync(path.join(SRC, 'js', m + '.js'), 'utf8'); }).join('\n');

// 1) Remove CSP meta (blocks onclick in plain browser).
html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/g, '');

// 2) Replace local Lucide script with CDN.
html = html.replace(
  /<script defer src="assets\/lucide\.min\.js"><\/script>/,
  '<script src="https://unpkg.com/lucide@' + LUCIDE_VERSION + '/dist/umd/lucide.min.js"></script>'
);

// 3) Replace local fonts.css + styles.css with CDN fonts + inline CSS.
html = html.replace(
  /<link rel="stylesheet" href="assets\/fonts\.css">\n<link rel="stylesheet" href="styles\.css">/,
  [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">',
    '<style>',
    css.trim(),
    '</style>'
  ].join('\n')
);

// 4) Replace the block of 10 module <script> tags with one inline script (in load order).
html = html.replace(
  /<script defer src="js\/core\.js"><\/script>[\s\S]*?<script defer src="js\/bootstrap\.js"><\/script>/,
  '<script>\n' + js.trim() + '\n</script>'
);

const outDir = path.join(__dirname, '..', 'web');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'mustadrik-web.html');
fs.writeFileSync(out, html, 'utf8');
const sz = (fs.statSync(out).size / 1024).toFixed(0);
console.log('✓ web/mustadrik-web.html written — ' + sz + ' KB (' + JS_MODULES.length + ' modules)');
console.log('  at: ' + out);
