const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const expected = "google.com, pub-8797316301984037, DIRECT, f08c47fec0942fa0";
const declaration = fs.readFileSync(path.join(root, "public", "app-ads.txt"), "utf8").trimEnd();
const robots = fs.readFileSync(path.join(root, "app", "robots.ts"), "utf8");

assert.equal(declaration, expected, "app-ads.txt must contain only the approved AdMob declaration.");
assert.equal(declaration.split(/\r?\n/).length, 1, "app-ads.txt must contain exactly one line.");
assert(robots.includes('allow: ["/", "/app-ads.txt"]'), "Google crawlers must be explicitly allowed to fetch app-ads.txt.");
assert(!declaration.includes("<html") && !declaration.includes("<!DOCTYPE"), "app-ads.txt must be plain text.");

console.log("AdMob app-ads.txt regression checks passed.");
