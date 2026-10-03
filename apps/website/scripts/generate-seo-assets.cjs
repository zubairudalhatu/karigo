const path = require("path");
const sharp = require("sharp");

const publicDir = path.join(__dirname, "..", "public");
const sourceLogo = path.join(publicDir, "karigo-logo.png");

async function main() {
  const logo = await sharp(sourceLogo).resize(330, 330, { fit: "contain" }).png().toBuffer();
  const background = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#e11d2e"/>
      <rect x="72" y="72" width="1056" height="486" rx="48" fill="#ffffff"/>
      <text x="510" y="285" font-family="Arial, sans-serif" font-size="96" font-weight="800" fill="#111111">KariGO</text>
      <text x="510" y="355" font-family="Arial, sans-serif" font-size="34" font-weight="600" fill="#202124">Everything You Need, Delivered</text>
    </svg>
  `);

  await sharp(background)
    .composite([{ input: logo, left: 130, top: 150 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "karigo-social-card.png"));

  await sharp(sourceLogo)
    .resize(192, 192, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "favicon.png"));

  await sharp(sourceLogo)
    .resize(180, 180, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
