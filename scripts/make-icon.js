'use strict';
// Generates build/icon.ico + icon.png (256x256, PNG-embedded ICO), no external deps.
// Design: rounded square, indigo→teal diagonal gradient, white 8-pointed Islamic star
// (Rub el Hizb / khatam) with a gold inner star. Rendered at 2× then downsampled (smooth).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256, SS = 2, BIG = SIZE * SS;

// ---- CRC32 / PNG chunk ----
const crcTable = (() => { const t = new Uint32Array(256); for (let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } return t; })();
function crc32(buf){ let c=0xFFFFFFFF; for(let i=0;i<buf.length;i++) c=crcTable[(c^buf[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function chunk(type,data){ const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0); const tb=Buffer.from(type,'ascii'); const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb,data])),0); return Buffer.concat([len,tb,data,crc]); }
function hex(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }

const C1 = hex('#6d5cf0');  // indigo
const C2 = hex('#10b3a0');  // teal
const GOLD = hex('#f1c75e');
const WHITE = [255,255,255];

// ---- draw at 2× ----
const big = Buffer.alloc(BIG*BIG*4, 0);
function bset(x,y,rgb,a){ if(x<0||y<0||x>=BIG||y>=BIG)return; const i=(y*BIG+x)*4; big[i]=rgb[0];big[i+1]=rgb[1];big[i+2]=rgb[2];big[i+3]=(a==null?255:a); }

const cx = BIG/2, cy = BIG/2;
const radius = Math.round(BIG*0.20);
function inRR(x,y){
  const minX=radius,maxX=BIG-radius,minY=radius,maxY=BIG-radius;
  if(x>=minX&&x<=maxX) return y>=0&&y<BIG;
  if(y>=minY&&y<=maxY) return x>=0&&x<BIG;
  const cxr=x<minX?minX:maxX, cyr=y<minY?minY:maxY, dx=x-cxr, dy=y-cyr;
  return dx*dx+dy*dy<=radius*radius;
}
// 8-pointed star = union of an axis square and a 45°-rotated square (diamond)
function inStar(dx,dy,A,Di){ return (Math.max(Math.abs(dx),Math.abs(dy))<=A) || (Math.abs(dx)+Math.abs(dy)<=Di); }
const A_OUT = Math.round(BIG*0.255), D_OUT = Math.round(BIG*0.355);
const A_IN  = Math.round(BIG*0.125), D_IN  = Math.round(BIG*0.175);

for(let y=0;y<BIG;y++){
  for(let x=0;x<BIG;x++){
    if(!inRR(x,y)){ bset(x,y,[0,0,0],0); continue; }
    const t=(x+y)/(2*BIG);                                   // diagonal gradient
    let rgb=[Math.round(C1[0]+(C2[0]-C1[0])*t),Math.round(C1[1]+(C2[1]-C1[1])*t),Math.round(C1[2]+(C2[2]-C1[2])*t)];
    const dx=x-cx, dy=y-cy;
    if(inStar(dx,dy,A_OUT,D_OUT)) rgb=WHITE;
    if(inStar(dx,dy,A_IN,D_IN))   rgb=GOLD;
    bset(x,y,rgb,255);
  }
}

// ---- downsample 2×2 → 256 ----
const px = Buffer.alloc(SIZE*SIZE*4, 0);
for(let Y=0;Y<SIZE;Y++){
  for(let X=0;X<SIZE;X++){
    let r=0,g=0,b=0,a=0;
    for(let oy=0;oy<SS;oy++)for(let ox=0;ox<SS;ox++){ const i=(((Y*SS+oy)*BIG)+(X*SS+ox))*4; r+=big[i];g+=big[i+1];b+=big[i+2];a+=big[i+3]; }
    const n=SS*SS, j=(Y*SIZE+X)*4;
    px[j]=Math.round(r/n);px[j+1]=Math.round(g/n);px[j+2]=Math.round(b/n);px[j+3]=Math.round(a/n);
  }
}

// ---- encode PNG ----
const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(SIZE,0); ihdr.writeUInt32BE(SIZE,4); ihdr[8]=8; ihdr[9]=6;
const raw=Buffer.alloc(SIZE*(SIZE*4+1));
for(let y=0;y<SIZE;y++){ raw[y*(SIZE*4+1)]=0; px.copy(raw,y*(SIZE*4+1)+1,y*SIZE*4,(y+1)*SIZE*4); }
const idat=zlib.deflateSync(raw,{level:9});
const png=Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);

// ---- wrap PNG into ICO ----
const icondir=Buffer.alloc(6); icondir.writeUInt16LE(0,0); icondir.writeUInt16LE(1,2); icondir.writeUInt16LE(1,4);
const entry=Buffer.alloc(16); entry[0]=0; entry[1]=0; entry.writeUInt16LE(1,4); entry.writeUInt16LE(32,6); entry.writeUInt32LE(png.length,8); entry.writeUInt32LE(22,12);
const ico=Buffer.concat([icondir,entry,png]);

const outDir=path.join(__dirname,'..','build'); fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'icon.ico'),ico);
fs.writeFileSync(path.join(outDir,'icon.png'),png);
console.log('icon.ico + icon.png written ('+ico.length+' bytes ico) — Islamic 8-point star');
