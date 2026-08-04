const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "docs/google-play/approved-icon-asset-manifest.json"), "utf8"));
const androidLauncherPlugin = fs.readFileSync(path.join(root, "scripts/with-approved-android-launcher-icons.cjs"), "utf8");

const checksum = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const byField = (app, field) => app.files.find((file) => file.field === field);

async function verifyFile(record) {
  const file = path.join(root, record.filename);
  assert(fs.existsSync(file), `${record.filename} must exist.`);
  const metadata = await sharp(file).metadata();
  const expectedFormat = path.extname(file).toLowerCase() === ".webp" ? "webp" : "png";
  assert.equal(metadata.format, expectedFormat, `${record.filename} must be ${expectedFormat.toUpperCase()}.`);
  assert.equal(metadata.width, record.width, `${record.filename} width must match its manifest.`);
  assert.equal(metadata.height, record.height, `${record.filename} height must match its manifest.`);
  assert.equal(fs.statSync(file).size, record.bytes, `${record.filename} size must match its manifest.`);
  assert.equal(checksum(file), record.sha256, `${record.filename} checksum must match its manifest.`);
}

async function verifyMonochrome(record) {
  const file = path.join(root, record.filename);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const visibleColors = new Set();
  let transparentPixels = 0;
  let visiblePixels = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const alpha = data[index + 3];
    if (alpha === 0) {
      transparentPixels += 1;
      continue;
    }
    visiblePixels += 1;
    visibleColors.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
  }
  assert(transparentPixels > 0 && visiblePixels > 0, `${record.filename} must have transparent and visible pixels.`);
  assert.deepEqual([...visibleColors], ["255,255,255"], `${record.filename} must be a single-colour white silhouette.`);
}

async function main() {
  assert(
    androidLauncherPlugin.includes('path.join(resourceRoot, `mipmap-${density}`)'),
    "The Android launcher plugin must overwrite Expo's canonical density folders."
  );
  assert(
    !androidLauncherPlugin.includes('path.join(resourceRoot, `mipmap-${density}-v4`)'),
    "The Android launcher plugin must not create duplicate -v4 density resources."
  );
  assert.equal(manifest.apps.length, 3, "Exactly three app icon sets must be present.");
  assert.equal(manifest.adaptiveSafeRadius, 320, "The approved adaptive safe radius must remain 320px.");
  await verifyFile(manifest.approvedMaskPreview);
  await verifyFile(manifest.preview);

  for (const app of manifest.apps) {
    for (const file of app.files) await verifyFile(file);
    const source = byField(app, "Approved launcher source");
    const fallback = byField(app, "Fallback launcher icon");
    const foreground = byField(app, "Adaptive icon foreground");
    const monochrome = byField(app, "Android themed monochrome icon");
    const appStore = byField(app, "App-local Play Store icon");
    const docsStore = byField(app, "Google Play Console app icon");
    const legacyLaunchers = app.files.filter((file) => file.field.startsWith("Android legacy launcher "));
    const roundLaunchers = app.files.filter((file) => file.field.startsWith("Android legacy round launcher "));

    assert(source && fallback && foreground && monochrome && appStore && docsStore, `${app.label} must include every required icon role.`);
    assert.equal(source.width, 1024);
    assert.equal(source.height, 1024);
    assert.equal(source.hasAlpha, false);
    assert.equal(source.sha256, fallback.sha256, `${app.label} fallback icon must exactly match its approved source.`);
    assert.equal(foreground.width, 1024);
    assert.equal(foreground.height, 1024);
    assert.equal(foreground.hasAlpha, true);
    assert.equal(monochrome.width, 1024);
    assert.equal(monochrome.height, 1024);
    assert.equal(monochrome.hasAlpha, true);
    assert(app.measuredForegroundRadius <= manifest.adaptiveSafeRadius, `${app.label} adaptive foreground must remain inside the safe zone.`);
    assert.equal(appStore.width, 512);
    assert.equal(appStore.height, 512);
    assert.equal(appStore.hasAlpha, false);
    assert(appStore.bytes < 1_000_000, `${app.label} Play Store icon must be under 1 MB.`);
    assert.equal(appStore.sha256, docsStore.sha256, `${app.label} app-local and Play Console icons must match.`);
    assert.equal(legacyLaunchers.length, 5, `${app.label} must include all five Android legacy launcher densities.`);
    assert.equal(roundLaunchers.length, 5, `${app.label} must include all five Android round launcher densities.`);
    for (const launcher of legacyLaunchers) {
      assert.equal(launcher.hasAlpha, false, `${launcher.filename} must be opaque.`);
    }
    for (const launcher of roundLaunchers) {
      assert.equal(launcher.hasAlpha, true, `${launcher.filename} must retain its circular transparency.`);
    }
    await verifyMonochrome(monochrome);
  }

  process.stdout.write("Approved KariGO icon validation passed for Customer, Captain and Partner.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
