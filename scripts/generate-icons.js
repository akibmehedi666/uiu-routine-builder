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

  // 1. Generate apple-icon.png (180x180, full-bleed orange background, no transparent corners)
  const appleSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180">
      <rect width="64" height="64" fill="#F26B21"/>
      <rect x="13" y="13" width="17" height="17" rx="4" fill="#FFFFFF"/>
      <rect x="13" y="34" width="17" height="17" rx="4" fill="#FFFFFF" opacity="0.6"/>
      <rect x="34" y="13" width="17" height="38" rx="4" fill="#FFFFFF"/>
    </svg>
  `;
  const appleIconPath = path.join(rootDir, 'src/app/apple-icon.png');
  await sharp(Buffer.from(appleSvg))
    .resize(180, 180)
    .png()
    .toFile(appleIconPath);
  console.log('Generated apple-icon.png (180x180, full-bleed)');

  // 2. Generate maskable PWA icons (public/icon-192.png, public/icon-512.png)
  // Central blocks safely inside 70% area on full-bleed #F26B21 background
  function makeMaskableSvg(size) {
    // 64x64 design where blocks (38x38) are scaled to ~60% of total canvas
    // scale 0.8 centered: translate = (64 - 64*0.8)/2 = 6.4
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
        <rect width="64" height="64" fill="#F26B21"/>
        <g transform="translate(6.4, 6.4) scale(0.8)">
          <rect x="13" y="13" width="17" height="17" rx="4" fill="#FFFFFF"/>
          <rect x="13" y="34" width="17" height="17" rx="4" fill="#FFFFFF" opacity="0.6"/>
          <rect x="34" y="13" width="17" height="38" rx="4" fill="#FFFFFF"/>
        </g>
      </svg>
    `;
  }

  const icon192Path = path.join(publicDir, 'icon-192.png');
  await sharp(Buffer.from(makeMaskableSvg(192)))
    .resize(192, 192)
    .png()
    .toFile(icon192Path);
  console.log('Generated public/icon-192.png (192x192, maskable safe)');

  const icon512Path = path.join(publicDir, 'icon-512.png');
  await sharp(Buffer.from(makeMaskableSvg(512)))
    .resize(512, 512)
    .png()
    .toFile(icon512Path);
  console.log('Generated public/icon-512.png (512x512, maskable safe)');

  // 3. Generate multi-resolution favicon.ico (16, 32, 48) from icon.svg
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
