const fs = require("fs");
const path = require("path");

const backendRoot = process.cwd();
const distRoot = path.join(backendRoot, "dist");

if (path.basename(backendRoot) !== "backend-api") {
  throw new Error(`Refusing to clean dist outside backend-api workspace: ${backendRoot}`);
}

fs.rmSync(distRoot, { recursive: true, force: true });
console.log("Cleaned backend dist output.");
