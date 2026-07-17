const fs = require("fs");
const path = require("path");

const backendRoot = process.cwd();
const distRoot = path.join(backendRoot, "dist");
const expectedEntry = path.join(distRoot, "main.js");
const fallbackEntries = [
  path.join(distRoot, "src", "main.js"),
  path.join(distRoot, "services", "backend-api", "src", "main.js"),
  path.join(distRoot, "services", "backend-api", "main.js")
];

function relative(filePath) {
  return path.relative(backendRoot, filePath).replace(/\\/g, "/");
}

function findMainFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMainFiles(fullPath));
    } else if (entry.isFile() && entry.name === "main.js") {
      results.push(fullPath);
    }
  }
  return results;
}

if (fs.existsSync(expectedEntry)) {
  console.log(`Verified backend build entry: ${relative(expectedEntry)}`);
  process.exit(0);
}

const fallbackEntry = fallbackEntries.find((entry) => fs.existsSync(entry));
if (fallbackEntry) {
  fs.mkdirSync(distRoot, { recursive: true });
  fs.copyFileSync(fallbackEntry, expectedEntry);
  console.log(`Copied backend build entry from ${relative(fallbackEntry)} to ${relative(expectedEntry)}`);
  process.exit(0);
}

const discovered = findMainFiles(distRoot).map(relative);
const detail = discovered.length
  ? ` Found main.js candidates: ${discovered.join(", ")}.`
  : " No main.js candidates were found under dist.";

throw new Error(`Backend build did not produce dist/main.js.${detail}`);
