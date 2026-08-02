const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../../..");

const targets = [
  "apps/rider-app/app",
  "apps/rider-app/src",
  "services/backend-api/src/common/services/application-notifications.service.ts",
  "services/backend-api/src/modules/riders/riders.service.ts",
  "services/backend-api/src/modules/taxi/taxi.service.ts"
];

const ignoredDirectories = new Set(["node_modules", "dist", "build", "coverage", ".expo"]);
const ignoredLineFragments = [
  "EXPO_PUBLIC_RIDES_CONTROLLED_PILOT_ENABLED",
  "EXPO_PUBLIC_TAXI_STAGING_DISPATCH_ENABLED",
  "vendor application"
];

const prohibited = [
  /Controlled Early Access/i,
  /Early Access/i,
  /Active Test/i,
  /ACTIVE_TEST/i,
  /staging dispatch/i,
  /test dispatch/i,
  /controlled pilot/i,
  /pilot dispatch/i,
  /Pilot:/i,
  /not live yet/i,
  /readiness-only/i,
  /launch onboarding/i,
  /launch workflow/i,
  /launch readiness/i,
  /Manage your delivery assignments and availability/i,
  /Profile photo URL optional/i,
  /Device upload is not enabled in this build/i,
  /Preferred areas, comma-separated/i,
  /Update manual coordinates/i,
  /Track your Captain onboarding/i,
  /28 unread updates/i
];

function filesIn(target) {
  const absolute = path.join(repoRoot, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const next = path.join(absolute, entry.name);
    if (entry.isDirectory()) return filesIn(path.relative(repoRoot, next));
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
    return [next];
  });
}

const failures = [];

for (const file of targets.flatMap(filesIn)) {
  const relative = path.relative(repoRoot, file).replaceAll("\\", "/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (ignoredLineFragments.some((fragment) => line.includes(fragment))) return;
    const matched = prohibited.find((pattern) => pattern.test(line));
    if (matched) failures.push(`${relative}:${index + 1}: ${matched} -> ${line.trim()}`);
  });
}

if (failures.length) {
  console.error("Captain production copy audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Captain production copy audit passed.");
