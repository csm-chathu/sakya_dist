/**
 * Generates icon-192.png and icon-512.png in public/
 * Run: node generate-icons.js
 * No npm installs required — uses Node built-ins only.
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function makePng(size) {
  // Background: #2563EB (blue-600)
  const bg = { r: 0x25, g: 0x63, b: 0xeb };
  // Accent circle inner: #1d4ed8
  const dark = { r: 0x1d, g: 0x4e, b: 0xd8 };
  // White
  const wh = { r: 255, g: 255, b: 255 };

  const pixels = [];
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.44;
  const innerR = size * 0.32;

  // Simple 5-segment "P" letter mask (pixel-art style scaled to size)
  function inLetter(x, y) {
    // Normalize to a 0–1 grid centered at cx, cy
    const nx = (x - cx) / size;
    const ny = (y - cy) / size;
    // Draw "S" shape using bezier-free approximation
    // Upper arc of S: top-right bump
    const s = 0.18; // scale
    // Just draw a bold "S" using two rectangles + two half-circles approach
    // Stem left
    if (nx > -0.13 && nx < -0.01 && ny > -0.38 && ny < 0.0)  return true;
    // Stem right
    if (nx >  0.01 && nx <  0.13 && ny >  0.0  && ny < 0.38)  return true;
    // Top bar
    if (nx > -0.13 && nx < 0.13 && ny > -0.38 && ny < -0.26)  return true;
    // Middle bar
    if (nx > -0.13 && nx < 0.13 && ny > -0.06 && ny <  0.06)  return true;
    // Bottom bar
    if (nx > -0.13 && nx < 0.13 && ny >  0.26 && ny <  0.38)  return true;
    // Top-right fill
    if (nx >  0.01 && nx <  0.13 && ny > -0.38 && ny < -0.06)  return true;
    // Bottom-left fill
    if (nx > -0.13 && nx < -0.01 && ny >  0.06 && ny <  0.38)  return true;
    return false;
  }

  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let col;
      if (dist > outerR) {
        col = bg; // outside circle — background colour
      } else if (dist > innerR) {
        // ring: slightly darker blue
        col = dark;
      } else {
        col = bg;
      }
      // letter overlay
      if (inLetter(x, y)) col = wh;
      row.push(col.r, col.g, col.b);
    }
    pixels.push(...row);
  }

  const raw   = Buffer.from(pixels);
  const idat  = zlib.deflateSync(raw, { level: 9 });

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = (() => {
    const b = Buffer.alloc(13);
    b.writeUInt32BE(size, 0);
    b.writeUInt32BE(size, 4);
    b[8]  = 8;  // bit depth
    b[9]  = 2;  // RGB
    b[10] = 0; b[11] = 0; b[12] = 0;
    return b;
  })();

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, 'public');
for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, makePng(size));
  console.log(`✔  public/icon-${size}.png`);
}
console.log('\nDone. Rebuild the app to activate the updated manifest.');
