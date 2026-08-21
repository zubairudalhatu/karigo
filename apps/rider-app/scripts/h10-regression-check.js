const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const workspace = read("src/components/captain-ride-workspace.tsx");
const background = read("src/lib/background-location.ts");
const buffer = read("src/lib/ride-trace-buffer.ts");

for (const expected of ["Free wait", "Paid wait", "USE LOCATION OVERRIDE", "overrideConfirmed", "recordedAt"]) {
  if (!workspace.includes(expected)) throw new Error(`Missing Captain H10 contract: ${expected}`);
}
if (!background.includes("bufferBackgroundRideTrace") || !background.includes("tracePoints")) throw new Error("Background Ride trace buffer is not wired");
if (!buffer.includes("MAX_BUFFERED_POINTS = 100") || !buffer.includes("clientPointId")) throw new Error("Ride trace dedupe/buffer guard is missing");
console.log("Captain H10 regression checks passed.");
