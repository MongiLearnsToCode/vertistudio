const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generates the 1024x1024 Verti Studio V mark for resources/icon.png.
// Uses only Node built-ins so contributors don't need extra deps.
// electron-builder auto-derives .ico (Windows) and .icns (macOS) from this file.

const SIZE = 1024;
const BG = [0x1a, 0x1a, 0x1e];      // app-base
const FG = [0x7f, 0x77, 0xdd];      // accent

function writeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr.writeUInt8(8, 8);    // bit depth
ihdr.writeUInt8(2, 9);    // color type: RGB
ihdr.writeUInt8(0, 10);   // compression
ihdr.writeUInt8(0, 11);   // filter
ihdr.writeUInt8(0, 12);   // interlace

// Pixel data: solid background with a centered rounded square in accent color
const rowBytes = SIZE * 3;
const raw = Buffer.alloc((rowBytes + 1) * SIZE);
const margin = Math.floor(SIZE * 0.18);
const radius = Math.floor(SIZE * 0.16);
const innerStart = margin;
const innerEnd = SIZE - margin;

for (let y = 0; y < SIZE; y++) {
  raw[y * (rowBytes + 1)] = 0; // filter: None
  for (let x = 0; x < SIZE; x++) {
    const offset = y * (rowBytes + 1) + 1 + x * 3;
    let inside = x >= innerStart && x < innerEnd && y >= innerStart && y < innerEnd;
    if (inside) {
      // round the four corners of the inner square
      const cornerCheck = (cx, cy) => {
        const dx = x - cx;
        const dy = y - cy;
        return dx * dx + dy * dy <= radius * radius;
      };
      const inTL = x < innerStart + radius && y < innerStart + radius;
      const inTR = x >= innerEnd - radius && y < innerStart + radius;
      const inBL = x < innerStart + radius && y >= innerEnd - radius;
      const inBR = x >= innerEnd - radius && y >= innerEnd - radius;
      if (inTL) inside = cornerCheck(innerStart + radius, innerStart + radius);
      else if (inTR) inside = cornerCheck(innerEnd - radius - 1, innerStart + radius);
      else if (inBL) inside = cornerCheck(innerStart + radius, innerEnd - radius - 1);
      else if (inBR) inside = cornerCheck(innerEnd - radius - 1, innerEnd - radius - 1);
    }
    const onArm = (ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - ax - t * dx, y - ay - t * dy) < 32;
    };
    const mark = inside && (onArm(330, 340, 512, 690) || onArm(512, 690, 694, 340));
    const c = mark ? [245, 245, 247] : inside ? FG : BG;
    raw[offset] = c[0];
    raw[offset + 1] = c[1];
    raw[offset + 2] = c[2];
  }
}

const idat = zlib.deflateSync(raw, { level: 9 });
const iend = Buffer.alloc(0);

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  writeChunk('IHDR', ihdr),
  writeChunk('IDAT', idat),
  writeChunk('IEND', iend),
]);

const outPath = path.join(__dirname, '..', 'resources', 'icon.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, png);
console.log(`Wrote ${outPath} (${png.length} bytes, ${SIZE}x${SIZE})`);
