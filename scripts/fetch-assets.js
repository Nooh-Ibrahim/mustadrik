'use strict';
// Downloads Lucide (UMD) + Tajawal webfont for fully-offline use.
// Best-effort: failures are non-fatal (app falls back to system font / no icons),
// but normally everything is bundled so the .exe works with no internet.

const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'src', 'assets');
const FONTS = path.join(ASSETS, 'fonts');
fs.mkdirSync(FONTS, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function download(url, dest, headers) {
  const res = await fetch(url, { headers: headers || {} });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf;
}

async function getLucide() {
  const dest = path.join(ASSETS, 'lucide.min.js');
  try {
    await download('https://unpkg.com/lucide@latest/dist/umd/lucide.min.js', dest);
    console.log('✓ lucide.min.js');
  } catch (e) {
    console.warn('✗ lucide download failed:', e.message);
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, '/* lucide unavailable offline */\nwindow.lucide={createIcons:function(){}};');
  }
}

async function getTajawal() {
  try {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';
    const res = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
    let css = await res.text();
    const urls = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map(m => m[1]);
    const seen = {};
    let idx = 0;
    for (const u of urls) {
      if (seen[u]) continue;
      seen[u] = 'tajawal-' + (idx++) + '.woff2';
      await download(u, path.join(FONTS, seen[u]), { 'User-Agent': UA });
      css = css.split(u).join('./fonts/' + seen[u]);
    }
    fs.writeFileSync(path.join(ASSETS, 'fonts.css'), css, 'utf8');
    console.log('✓ Tajawal font (' + Object.keys(seen).length + ' files)');
  } catch (e) {
    console.warn('✗ Tajawal download failed:', e.message);
    // write empty fonts.css so the <link> doesn't 404; system font fallback kicks in
    const fontsCss = path.join(ASSETS, 'fonts.css');
    if (!fs.existsSync(fontsCss)) fs.writeFileSync(fontsCss, '/* Tajawal unavailable; falling back to system fonts */');
  }
}

// Amiri (Naskh serif) — optional «calm» heading font. Downloads arabic+latin woff2 for 400/700
// to stable names, then appends @font-face rules to fonts.css (after Tajawal). Best-effort.
async function getAmiri() {
  try {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap';
    const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
    const blocks = css.split('@font-face').slice(1);
    let got = 0;
    for (const b of blocks) {
      const weight = /font-weight:\s*(\d+)/.exec(b);
      const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(b);
      const range = /unicode-range:\s*([^;]+)/.exec(b);
      if (!weight || !url || !range) continue;
      const w = weight[1];
      let sub = null;
      if (/0600-06FF/.test(range[1])) sub = 'ar';
      else if (/0000-00FF/.test(range[1])) sub = 'lat';
      if (!sub) continue;                                  // skip latin-ext
      const name = 'amiri-' + sub + '-' + w + '.woff2';
      await download(url[1], path.join(FONTS, name), { 'User-Agent': UA });
      got++;
    }
    const block = "\n/* ===== Amiri — خط Naskh كلاسيكي للعناوين (نمط هادئ اختياري) ===== */\n" +
      [['ar','400'],['lat','400'],['ar','700'],['lat','700']].map(function(p){
        var arabic = p[0]==='ar';
        var ur = arabic
          ? 'U+0600-06FF, U+0750-077F, U+0870-088E, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC'
          : 'U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD';
        return "@font-face{font-family:'Amiri';font-style:normal;font-weight:"+p[1]+
          ";font-display:swap;src:url(./fonts/amiri-"+p[0]+"-"+p[1]+".woff2) format('woff2');unicode-range:"+ur+";}";
      }).join('\n') + "\n";
    fs.appendFileSync(path.join(ASSETS, 'fonts.css'), block, 'utf8');
    console.log('✓ Amiri font (' + got + ' files)');
  } catch (e) {
    console.warn('✗ Amiri download failed (calm-mode serif will fall back):', e.message);
  }
}

(async () => {
  await Promise.all([getLucide(), getTajawal()]);
  await getAmiri();                 // after Tajawal: getTajawal rewrites fonts.css, then we append
  console.log('assets done.');
})();
