import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const source = await readFile(path.join(publicDir, 'brand', 'app-icon.svg'));
const maskableSource = await readFile(path.join(publicDir, 'brand', 'app-icon-maskable.svg'));

async function png(svg, size, destination) {
  const output = path.join(publicDir, destination);
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(svg, { density: 768 }).resize(size, size).png({ compressionLevel: 9 }).toFile(output);
  return output;
}

const favicon16 = await sharp(source, { density: 768 }).resize(16, 16).png().toBuffer();
const favicon32 = await sharp(source, { density: 768 }).resize(32, 32).png().toBuffer();
const favicon48 = await sharp(source, { density: 768 }).resize(48, 48).png().toBuffer();

await png(source, 16, 'icons/favicon-16x16.png');
await png(source, 32, 'icons/favicon-32x32.png');
await png(source, 48, 'icons/favicon-48x48.png');

for (const size of [16, 32, 48, 128]) {
  await png(source, size, `icons/chrome/icon-${size}.png`);
}

for (const size of [120, 152, 167, 180]) {
  await png(source, size, `icons/apple/apple-touch-icon-${size}.png`);
}
await png(source, 180, 'apple-touch-icon.png');

for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
  await png(source, size, `icons/pwa/icon-${size}.png`);
}
for (const size of [192, 512]) {
  await png(maskableSource, size, `icons/pwa/maskable-${size}.png`);
}

await png(source, 150, 'icons/windows/mstile-150x150.png');
await png(source, 310, 'icons/windows/mstile-310x310.png');
await png(source, 96, 'icons/notification-badge.png');

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = Buffer.alloc(16 * images.length);
  let offset = 6 + entries.length;
  images.forEach(({ size, data }, index) => {
    const base = index * 16;
    entries.writeUInt8(size === 256 ? 0 : size, base);
    entries.writeUInt8(size === 256 ? 0 : size, base + 1);
    entries.writeUInt8(0, base + 2);
    entries.writeUInt8(0, base + 3);
    entries.writeUInt16LE(1, base + 4);
    entries.writeUInt16LE(32, base + 6);
    entries.writeUInt32LE(data.length, base + 8);
    entries.writeUInt32LE(offset, base + 12);
    offset += data.length;
  });
  return Buffer.concat([header, entries, ...images.map(({ data }) => data)]);
}

await writeFile(path.join(publicDir, 'favicon.ico'), ico([
  { size: 16, data: favicon16 },
  { size: 32, data: favicon32 },
  { size: 48, data: favicon48 },
]));

await writeFile(path.join(root, 'src', 'app', 'favicon.ico'), ico([
  { size: 16, data: favicon16 },
  { size: 32, data: favicon32 },
  { size: 48, data: favicon48 },
]));

console.log('Brand assets generated from public/brand/app-icon.svg');
