const fs = require("node:fs/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const apps = [
  {
    key: "customer",
    source: "apps/customer-app/assets/play-store-icon.png",
    logo: "apps/customer-app/assets/karigo-logo.png",
    title: "KariGO",
    strapline: "Rides, deliveries and local services",
    accent: "#dc2626"
  },
  {
    key: "captain",
    source: "apps/rider-app/assets/play-store-icon.png",
    logo: "apps/rider-app/assets/karigo-logo.png",
    title: "KariGO Captain",
    strapline: "Manage availability and assigned work",
    accent: "#111827"
  },
  {
    key: "partner",
    source: "apps/partner-app/assets/play-store-icon.png",
    logo: "apps/partner-app/assets/karigo-logo.png",
    title: "KariGO Partner",
    strapline: "Manage products, services and orders",
    accent: "#dc2626"
  }
];

function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;"
  })[character]);
}

async function generate(app) {
  const output = path.join(root, "docs", "google-play", app.key);
  await fs.mkdir(output, { recursive: true });

  const iconPath = path.join(output, "play-store-icon.png");
  await sharp(path.join(root, app.source))
    .resize(512, 512, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(iconPath);

  const logoBuffer = await sharp(path.join(root, app.logo))
    .resize(470, 170, {
      fit: "contain",
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();
  const copy = Buffer.from(`
    <svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="500" fill="#f8fafc"/>
      <rect x="0" y="0" width="20" height="500" fill="${app.accent}"/>
      <circle cx="905" cy="85" r="180" fill="#fee2e2" opacity="0.7"/>
      <circle cx="930" cy="430" r="245" fill="#e5e7eb" opacity="0.68"/>
      <text x="535" y="218" fill="#111827" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700">${escapeXml(app.title)}</text>
      <text x="535" y="284" fill="#475569" font-family="Arial, Helvetica, sans-serif" font-size="28">${escapeXml(app.strapline)}</text>
      <rect x="535" y="322" width="124" height="8" rx="4" fill="${app.accent}"/>
    </svg>
  `);
  const graphicPath = path.join(output, `${app.key}-feature-graphic-1024x500.png`);
  await sharp(copy)
    .composite([{ input: logoBuffer, left: 45, top: 165 }])
    .flatten({ background: "#f8fafc" })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(graphicPath);

  const [iconMetadata, graphicMetadata] = await Promise.all([
    sharp(iconPath).metadata(),
    sharp(graphicPath).metadata()
  ]);
  const checksum = async (file) => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
  return {
    app: app.key,
    files: [
      {
        filename: path.basename(iconPath),
        field: "App icon",
        width: iconMetadata.width,
        height: iconMetadata.height,
        bytes: (await fs.stat(iconPath)).size,
        transparency: Boolean(iconMetadata.hasAlpha),
        sha256: await checksum(iconPath)
      },
      {
        filename: path.basename(graphicPath),
        field: "Feature graphic",
        width: graphicMetadata.width,
        height: graphicMetadata.height,
        bytes: (await fs.stat(graphicPath)).size,
        transparency: Boolean(graphicMetadata.hasAlpha),
        sha256: await checksum(graphicPath)
      }
    ]
  };
}

Promise.all(apps.map(generate))
  .then(async (manifest) => {
    await fs.writeFile(
      path.join(root, "docs", "google-play", "generated-asset-manifest.json"),
      `${JSON.stringify({ generatedBy: "scripts/generate-google-play-assets.cjs", assets: manifest }, null, 2)}\n`
    );
    process.stdout.write(`Generated ${manifest.length * 2} Google Play assets.\n`);
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
