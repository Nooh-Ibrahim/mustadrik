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
const css  = fs.readFileSync(path.join(SRC, 'styles.css'),   'utf8');
// renderer logic now lives in 10 classic-script modules under src/js/ (must concat in load order)
const JS_MODULES = ['core','db','migrate','storage','shell','timer','tasks','habits','stats','courses','grades','schedule','prayer','braindump','worship','coach','sakina','studio','dayplan','sport','recovery','confidence','customize','hub','palette','profiles','backup','home','cards','islamic','rewards','meds','sync','remind','widget','bootstrap'];
const js   = JS_MODULES.map(function(m){ return fs.readFileSync(path.join(SRC, 'js', m + '.js'), 'utf8'); }).join('\n');
let   html = fs.readFileSync(path.join(SRC, 'index.html'),   'utf8');

// 1) Remove CSP meta (blocks onclick in plain browser).
html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/g, '');

// 2) Replace local Lucide script with CDN.
html = html.replace(
  /<script defer src="assets\/lucide\.min\.js"><\/script>/,
  '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>'
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

const out = path.join(__dirname, '..', 'noah_dashboard_v10.html');
fs.writeFileSync(out, html, 'utf8');
const sz = (fs.statSync(out).size / 1024).toFixed(0);
console.log('✓ noah_dashboard_v10.html written — ' + sz + ' KB');
console.log('  at: ' + out);
