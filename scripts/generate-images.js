'use strict';

// Generates static brand images with zero dependencies:
//   public/og-image.png (1200x630 social share card)
//   public/apple-touch-icon.png (180x180)
// Run: node scripts/generate-images.js

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public');
fs.mkdirSync(OUT, { recursive: true });

// ---- minimal PNG writer (RGBA, 8-bit) ----
function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function writePng(file, w, h, px) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const out = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, out);
  console.log(`Wrote ${file} (${(out.length / 1024).toFixed(1)} KB)`);
}

function canvas(w, h, rgb) {
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = rgb[0]; px[i * 4 + 1] = rgb[1]; px[i * 4 + 2] = rgb[2]; px[i * 4 + 3] = 255;
  }
  return px;
}

function set(px, w, x, y, rgb) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  if (i + 3 >= px.length || i < 0) return;
  px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
}

function rect(px, w, x, y, rw, rh, rgb) {
  for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(px, w, i, j, rgb);
}

function rrect(px, w, x, y, rw, rh, r, rgb) {
  for (let j = y; j < y + rh; j++) {
    for (let i = x; i < x + rw; i++) {
      const cx = Math.min(Math.max(i, x + r), x + rw - 1 - r);
      const cy = Math.min(Math.max(j, y + r), y + rh - 1 - r);
      const dx = i - cx, dy = j - cy;
      if (dx * dx + dy * dy <= r * r) set(px, w, i, j, rgb);
    }
  }
}

// ---- 5x7 bitmap font (uppercase + + . space mid-dot) ----
const FONT = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '·': ['00000', '00000', '01100', '01100', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function text(px, w, str, x, y, scale, rgb) {
  let cx = x;
  for (const ch of str.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === '1') {
          for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) set(px, w, cx + c * scale + sx, y + r * scale + sy, rgb);
        }
      }
    }
    cx += 6 * scale;
  }
  return cx - x - scale;
}

// ---- og-image.png 1200x630 ----
(function og() {
  const W = 1200, H = 630;
  const INK = [23, 21, 18];
  const CREAM = [253, 252, 248];
  const OXIDE = [196, 90, 60];
  const STONE = [154, 149, 144];
  const px = canvas(W, H, INK);
  // ledger grid hint
  for (let gx = 0; gx < W; gx += 80) for (let gy = 0; gy < H; gy++) set(px, W, gx, gy, [33, 30, 26]);
  for (let gy = 0; gy < H; gy += 80) for (let gx = 0; gx < W; gx++) set(px, W, gx, gy, [33, 30, 26]);
  // brand mark
  rrect(px, W, 90, 195, 230, 230, 44, OXIDE);
  rrect(px, W, 150, 245, 110, 130, 10, CREAM);
  rect(px, W, 172, 275, 66, 12, INK);
  rect(px, W, 172, 297, 66, 12, INK);
  rect(px, W, 172, 319, 44, 12, INK);
  // title + sub
  text(px, W, 'INVOIX', 370, 205, 13, CREAM);
  text(px, W, 'GST BILLING · DESKTOP + WEB', 372, 330, 4, STONE);
  // amber rule
  rect(px, W, 90, 480, 1020, 8, OXIDE);
  text(px, W, 'OFFLINE-FIRST LEDGER · GSTR-1 + 3B · LIVE WEB MIRROR', 92, 510, 3, STONE);
  writePng(path.join(OUT, 'og-image.png'), W, H, px);
})();

// ---- apple-touch-icon.png 180x180 ----
(function touch() {
  const W = 180, H = 180;
  const OXIDE = [196, 90, 60];
  const CREAM = [253, 252, 248];
  const INK = [23, 21, 18];
  const px = canvas(W, H, OXIDE);
  rrect(px, W, 45, 40, 90, 100, 12, CREAM);
  rect(px, W, 63, 62, 54, 10, INK);
  rect(px, W, 63, 80, 54, 10, INK);
  rect(px, W, 63, 98, 36, 10, INK);
  writePng(path.join(OUT, 'apple-touch-icon.png'), W, H, px);
})();
