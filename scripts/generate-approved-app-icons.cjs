const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "docs", "google-play", "icon-sources");
const validationRoot = path.join(root, "docs", "google-play", "icon-validation");
const canvasSize = 1024;
const foregroundLimitY = 520;
const backgroundThreshold = 4;
const adaptiveSafeRadius = 320;
const androidDensities = [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192]
];

const apps = [
  {
    key: "customer",
    label: "KariGO Customer",
    previewLabel: "Customer",
    source: "karigo-customer-launcher-master-1024.png",
    workspace: "apps/customer-app",
    background: "#D90000",
    themedBackground: "#F4B8B8",
    themedForeground: "#671010"
  },
  {
    key: "captain",
    label: "KariGO Captain",
    previewLabel: "Captain",
    source: "karigo-captain-launcher-master-1024.png",
    workspace: "apps/rider-app",
    background: "#111111",
    themedBackground: "#D5D5D5",
    themedForeground: "#202020"
  },
  {
    key: "partner",
    label: "KariGO Partner",
    previewLabel: "Partner",
    source: "karigo-partner-launcher-master-1024.png",
    workspace: "apps/partner-app",
    background: "#FAF7F3",
    themedBackground: "#F4C4C4",
    themedForeground: "#6D1117"
  }
];

const sha256 = async (file) => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");

async function describe(file, field) {
  const metadata = await sharp(file).metadata();
  return {
    filename: path.relative(root, file).replaceAll("\\", "/"),
    field,
    width: metadata.width,
    height: metadata.height,
    bytes: (await fs.stat(file)).size,
    hasAlpha: Boolean(metadata.hasAlpha),
    sha256: await sha256(file)
  };
}

function colorDistance(data, index, background) {
  return Math.max(
    Math.abs(data[index] - background[0]),
    Math.abs(data[index + 1] - background[1]),
    Math.abs(data[index + 2] - background[2])
  );
}

async function extractMark(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== canvasSize || info.height !== canvasSize) {
    throw new Error(`${path.basename(source)} must be 1024 x 1024.`);
  }

  const background = [data[0], data[1], data[2]];
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < foregroundLimitY; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 4;
      if (colorDistance(data, index, background) <= backgroundThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) throw new Error(`KariGO K mark was not found in ${path.basename(source)}.`);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const foreground = Buffer.alloc(width * height * 4);
  const monochrome = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = ((minY + y) * info.width + minX + x) * 4;
      const targetIndex = (y * width + x) * 4;
      const distance = colorDistance(data, sourceIndex, background);
      const visible = distance > backgroundThreshold;
      foreground[targetIndex] = data[sourceIndex];
      foreground[targetIndex + 1] = data[sourceIndex + 1];
      foreground[targetIndex + 2] = data[sourceIndex + 2];
      foreground[targetIndex + 3] = visible ? 255 : 0;
      monochrome[targetIndex] = 255;
      monochrome[targetIndex + 1] = 255;
      monochrome[targetIndex + 2] = 255;
      monochrome[targetIndex + 3] = visible ? Math.min(255, Math.max(0, (distance - 2) * 24)) : 0;
    }
  }

  return {
    width,
    height,
    foreground: await sharp(foreground, { raw: { width, height, channels: 4 } }).png().toBuffer(),
    monochrome: await sharp(monochrome, { raw: { width, height, channels: 4 } }).png().toBuffer()
  };
}

async function centeredCanvas(mark) {
  const left = Math.floor((canvasSize - mark.width) / 2);
  const top = Math.floor((canvasSize - mark.height) / 2);
  return {
    left,
    top,
    buffer: await sharp({
      create: { width: canvasSize, height: canvasSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).composite([{ input: mark.buffer, left, top }]).png().toBuffer()
  };
}

async function safeRadius(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let maximum = 0;
  const center = canvasSize / 2;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] < 16) continue;
      maximum = Math.max(maximum, Math.hypot(x + 0.5 - center, y + 0.5 - center));
    }
  }
  return Math.round(maximum * 100) / 100;
}

async function maskedIcon(file, size, radius) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`);
  return sharp(file).resize(size, size).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function generateAndroidFallbacks(source, assetRoot) {
  const files = [];
  for (const [density, size] of androidDensities) {
    const directory = path.join(assetRoot, "android-launcher", `mipmap-${density}-v4`);
    const launcher = path.join(directory, "ic_launcher.webp");
    const roundLauncher = path.join(directory, "ic_launcher_round.webp");
    await fs.mkdir(directory, { recursive: true });
    await sharp(source).resize(size, size).webp({ lossless: true }).toFile(launcher);
    const round = await maskedIcon(source, size, size / 2);
    await sharp(round).webp({ lossless: true }).toFile(roundLauncher);
    files.push(
      await describe(launcher, `Android legacy launcher ${density}`),
      await describe(roundLauncher, `Android legacy round launcher ${density}`)
    );
  }
  return files;
}

async function buildPreview(results) {
  const width = 1600;
  const height = 760;
  const cellSize = 160;
  const rowTops = [120, 340, 560];
  const columns = [200, 430, 660, 890, 1120, 1350];
  const headers = ["Fallback", "Circle", "Rounded", "Squircle", "48 px", "Themed"];
  const composites = [];

  for (let index = 0; index < results.length; index += 1) {
    const app = results[index];
    const top = rowTops[index];
    const playIcon = app.playStoreIcon;
    composites.push({ input: await sharp(playIcon).resize(cellSize, cellSize).png().toBuffer(), left: columns[0], top });
    composites.push({ input: await maskedIcon(playIcon, cellSize, cellSize / 2), left: columns[1], top });
    composites.push({ input: await maskedIcon(playIcon, cellSize, 32), left: columns[2], top });
    composites.push({ input: await maskedIcon(playIcon, cellSize, 54), left: columns[3], top });

    const small = await sharp(playIcon).resize(48, 48).png().toBuffer();
    composites.push({ input: small, left: columns[4] + 56, top: top + 56 });

    const monochromeMask = await sharp(app.monochrome).resize(cellSize, cellSize).png().toBuffer();
    const themed = await sharp({
      create: { width: cellSize, height: cellSize, channels: 4, background: app.themedForeground }
    }).composite([{ input: monochromeMask, blend: "dest-in" }]).png().toBuffer();
    const themedBackground = await sharp({
      create: { width: cellSize, height: cellSize, channels: 4, background: app.themedBackground }
    }).composite([{ input: themed, left: 0, top: 0 }]).png().toBuffer();
    composites.push({ input: await maskedIcon(themedBackground, cellSize, 54), left: columns[5], top });
  }

  const labels = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#17191c"/>
      <text x="30" y="58" fill="#fff" font-family="Arial" font-size="38" font-weight="700">KariGO final icon validation</text>
      ${headers.map((header, index) => `<text x="${columns[index]}" y="100" fill="#cbd5e1" font-family="Arial" font-size="22">${header}</text>`).join("")}
      ${results.map((app, index) => `<text x="30" y="${rowTops[index] + 92}" fill="#fff" font-family="Arial" font-size="27" font-weight="700">${app.previewLabel}</text>`).join("")}
    </svg>
  `);

  const target = path.join(validationRoot, "KariGO-Final-Icon-Validation.png");
  await fs.mkdir(validationRoot, { recursive: true });
  await sharp(labels).composite(composites).png({ compressionLevel: 9 }).toFile(target);
  return target;
}

async function generate(app) {
  const source = path.join(sourceRoot, app.source);
  const sourceMetadata = await sharp(source).metadata();
  if (sourceMetadata.format !== "png" || sourceMetadata.width !== canvasSize || sourceMetadata.height !== canvasSize) {
    throw new Error(`${app.source} must be a 1024 x 1024 PNG.`);
  }

  const assetRoot = path.join(root, app.workspace, "assets");
  const docsRoot = path.join(root, "docs", "google-play", app.key);
  await Promise.all([fs.mkdir(assetRoot, { recursive: true }), fs.mkdir(docsRoot, { recursive: true })]);

  const icon = path.join(assetRoot, "icon.png");
  const foreground = path.join(assetRoot, "adaptive-icon-foreground.png");
  const monochrome = path.join(assetRoot, "adaptive-icon-monochrome.png");
  const appPlayStoreIcon = path.join(assetRoot, "play-store-icon.png");
  const docsPlayStoreIcon = path.join(docsRoot, "play-store-icon.png");

  await fs.copyFile(source, icon);
  const mark = await extractMark(source);
  const foregroundCanvas = await centeredCanvas({ ...mark, buffer: mark.foreground });
  const monochromeCanvas = await centeredCanvas({ ...mark, buffer: mark.monochrome });
  await Promise.all([
    fs.writeFile(foreground, foregroundCanvas.buffer),
    fs.writeFile(monochrome, monochromeCanvas.buffer),
    sharp(source).resize(512, 512).flatten({ background: app.background }).removeAlpha().png({ compressionLevel: 9 }).toFile(appPlayStoreIcon)
  ]);
  await fs.copyFile(appPlayStoreIcon, docsPlayStoreIcon);
  const androidFallbackFiles = await generateAndroidFallbacks(source, assetRoot);

  const radius = await safeRadius(foreground);
  if (radius > adaptiveSafeRadius) {
    throw new Error(`${app.label} K mark exceeds adaptive safe radius: ${radius} > ${adaptiveSafeRadius}.`);
  }

  return {
    ...app,
    foreground,
    monochrome,
    playStoreIcon: appPlayStoreIcon,
    safeRadius: radius,
    files: await Promise.all([
      describe(source, "Approved launcher source"),
      describe(icon, "Fallback launcher icon"),
      describe(foreground, "Adaptive icon foreground"),
      describe(monochrome, "Android themed monochrome icon"),
      describe(appPlayStoreIcon, "App-local Play Store icon"),
      describe(docsPlayStoreIcon, "Google Play Console app icon"),
      ...androidFallbackFiles
    ])
  };
}

Promise.all(apps.map(generate))
  .then(async (results) => {
    const preview = await buildPreview(results);
    const approvedMaskPreview = path.join(sourceRoot, "KariGO-Android-Mask-Previews.png");
    const manifest = {
      generatedBy: "scripts/generate-approved-app-icons.cjs",
      adaptiveSafeRadius,
      approvedMaskPreview: await describe(approvedMaskPreview, "Approved Android mask reference"),
      preview: await describe(preview, "Mask, small-size and themed-icon validation"),
      apps: results.map(({ key, label, background, safeRadius: radius, files }) => ({
        app: key,
        label,
        adaptiveBackground: background,
        measuredForegroundRadius: radius,
        files
      }))
    };
    await fs.writeFile(
      path.join(root, "docs", "google-play", "approved-icon-asset-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    process.stdout.write(`Generated approved launcher assets for ${results.length} apps.\n`);
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
