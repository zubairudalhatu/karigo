const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const targets = [
  "apps/customer-app/app",
  "apps/customer-app/src",
  "apps/rider-app/app",
  "apps/rider-app/src",
  "apps/partner-app/app",
  "apps/partner-app/src",
  "services/backend-api/src/modules/auth/account-activation-email.service.ts",
  "services/backend-api/src/modules/notifications/email/templates",
  "services/backend-api/src/modules/notifications/sms/templates"
];

const prohibited = [
  /\bPilot\b/i,
  /\bControlled Early Access\b/i,
  /\bEarly Access\b/i,
  /\bApproved pilot features\b/i,
  /\bLaunch note\b/i,
  /\bTest account\b/i,
  /\bTest mode\b/i,
  /\bActive Test\b/i,
  /\bStaging\b/i,
  /\bSandbox\b/i,
  /\bBeta\b/i,
  /\bDemo\b/i,
  /\bExperimental\b/i,
  /\bComing later\b/i,
  /\bComing soon\b/i,
  /\bNot enabled in this build\b/i,
  /\bBackend storage approval\b/i,
  /\bControlled dispatch\b/i,
  /\bManual pilot\b/i,
  /\bPilot payment\b/i,
  /\bPilot service\b/i,
  /\bPilot account\b/i
];

const ignoredFilePatterns = [
  /\.spec\.[tj]sx?$/,
  /\.test\.[tj]sx?$/,
  /scripts[\\/]/,
  /src[\\/]api[\\/]client\.ts$/,
  /src[\\/]contexts[\\/]auth-context\.tsx$/,
  /src[\\/]lib[\\/]rides-flags\.ts$/,
  /src[\\/]lib[\\/]captain-modes\.ts$/,
  /src[\\/]api[\\/]captain-access\.api\.ts$/,
  /src[\\/]api[\\/]delivery-captain-applications\.api\.ts$/
];

const ignoredLineFragments = [
  "squadSandboxCheckoutEnabled",
  "stagingPaymentProviderOptions",
  "EXPO_PUBLIC_SQUAD_SANDBOX_CHECKOUT_ENABLED",
  "KARIGO_PILOT_EMAIL_LABEL",
  "pilotLabel",
  "isTemporarySessionFailure",
  "refresh_temporary_failure",
  "bootstrap_temporary_failure",
  "isDemoPartnerProfile",
  "/demo|sample|test|seed|staging/i",
  "testMode",
  "isTestMode",
  "sandbox provider is not enabled"
];

function walk(entry) {
  const absolute = path.resolve(root, entry);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  const files = [];
  for (const child of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (child.name === "node_modules" || child.name === ".next" || child.name === "dist") continue;
    const childPath = path.join(absolute, child.name);
    if (child.isDirectory()) files.push(...walk(path.relative(root, childPath)));
    else files.push(childPath);
  }
  return files;
}

function isSourceFile(file) {
  return /\.(ts|tsx|js|jsx)$/.test(file);
}

function shouldIgnoreFile(file) {
  const relative = path.relative(root, file);
  return ignoredFilePatterns.some((pattern) => pattern.test(relative));
}

function shouldIgnoreLine(line) {
  return ignoredLineFragments.some((fragment) => line.includes(fragment));
}

function looksUserFacing(line) {
  return /(<Text|title[:=]|subtitle[:=]|body[:=]|message[:=]|description[:=]|placeholder[:=]|label[:=]|return\s+["'`]|throw new .*Exception|subject:|heading:)/.test(line);
}

const findings = [];
for (const target of targets) {
  for (const file of walk(target).filter(isSourceFile)) {
    if (shouldIgnoreFile(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!looksUserFacing(line) || shouldIgnoreLine(line)) return;
      for (const pattern of prohibited) {
        if (pattern.test(line)) {
          findings.push(`${path.relative(root, file)}:${index + 1}: ${line.trim()}`);
          break;
        }
      }
    });
  }
}

if (findings.length) {
  console.error("Production copy audit failed. Remove or gate these production-facing terms:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Production copy audit passed.");
