const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const svgPath = path.join(rootDir, 'src/app/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // Ensure public directory exists
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Generate apple-icon.png (180x180)
  const appleIconPath = path.join(rootDir, 'src/app/apple-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleIconPath);
  console.log('Generated apple-icon.png (180x180)');

  // 2. Generate public/icon-192.png (192x192, maskable with 20% padding)
  // 192 * 0.8 = ~154px badge centered on #FFFBF7 background
  const badge192 = await sharp(svgBuffer)
    .resize(154, 154)
    .toBuffer();

  const icon192Path = path.join(publicDir, 'icon-192.png');
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 255, g: 251, b: 247, alpha: 1 },
    },
  })
    .composite([{ input: badge192, top: 19, left: 19 }])
    .png()
    .toFile(icon192Path);
  console.log('Generated public/icon-192.png (192x192)');

  // 3. Generate public/icon-512.png (512x512, maskable with 20% padding)
  // 512 * 0.8 = ~410px badge centered on #FFFBF7 background
  const badge512 = await sharp(svgBuffer)
    .resize(410, 410)
    .toBuffer();

  const icon512Path = path.join(publicDir, 'icon-512.png');
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 251, b: 247, alpha: 1 },
    },
  })
    .composite([{ input: badge512, top: 51, left: 51 }])
    .png()
    .toFile(icon512Path);
  console.log('Generated public/icon-512.png (512x512)');

  // 4. Generate multi-resolution favicon.ico (16, 32, 48)
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map((s) => sharp(svgBuffer).resize(s, s).png().toBuffer())
  );

  // Build standard ICO format
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(sizes.length, 4); // Number of images

  let currentOffset = 6 + sizes.length * 16;
  const directoryEntries = [];

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Image byte length
    entry.writeUInt32LE(currentOffset, 12); // Offset to image
    directoryEntries.push(entry);
    currentOffset += buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...directoryEntries, ...pngBuffers]);
  const faviconIcoPath = path.join(rootDir, 'src/app/favicon.ico');
  fs.writeFileSync(faviconIcoPath, icoBuffer);
  console.log('Generated src/app/favicon.ico (16, 32, 48)');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
