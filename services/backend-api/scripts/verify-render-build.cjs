const fs = require("fs");
const path = require("path");

const backendRoot = process.cwd();
const distRoot = path.join(backendRoot, "dist");
const expectedEntry = path.join(distRoot, "services", "backend-api", "src", "main.js");
const compatibilityEntry = path.join(distRoot, "main.js");
const compatibilityShim = `"use strict";

// Compatibility entrypoint for Render services still configured with:
//   node dist/main
// or, from the monorepo root:
//   node services/backend-api/dist/main
//
// The actual Nest build output lives under dist/services/backend-api/src.
// Requiring it here keeps relative imports beside the compiled app module.
require("./services/backend-api/src/main.js");
`;

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
  fs.writeFileSync(compatibilityEntry, compatibilityShim);
  console.log(`Verified backend build entry: ${relative(expectedEntry)}`);
  console.log(`Wrote backend compatibility entry: ${relative(compatibilityEntry)}`);
  process.exit(0);
}

const discovered = findMainFiles(distRoot).map(relative);
const detail = discovered.length
  ? ` Found main.js candidates: ${discovered.join(", ")}.`
  : " No main.js candidates were found under dist.";

throw new Error(`Backend build did not produce ${relative(expectedEntry)}.${detail}`);
