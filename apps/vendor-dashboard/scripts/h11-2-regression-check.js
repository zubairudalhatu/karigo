const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const page = read("app", "settlements", "page.tsx");
const api = read("src", "api", "settlements.api.ts");
if (!page.includes("Gross merchandise sales") || !page.includes("Delivery fee excluded from commission") || !api.includes("commercialModel")) {
  throw new Error("Partner Workspace settlement presentation must use category-specific commercial fields.");
}
console.log("Partner Workspace H11.2 regression check passed.");
