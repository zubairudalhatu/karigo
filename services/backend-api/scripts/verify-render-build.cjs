const fs = require("fs");
const path = require("path");

const backendRoot = process.cwd();
const distRoot = path.join(backendRoot, "dist");
const expectedEntry = path.join(distRoot, "services", "backend-api", "src", "main.js");
const compatibilityEntry = path.join(distRoot, "main.js");
const compiledPlatformCatalog = path.join(distRoot, "services", "backend-api", "src", "modules", "platform", "platform-catalog.service.js");
const compiledCaptainCatalog = path.join(distRoot, "services", "backend-api", "src", "modules", "platform", "captain-catalog.js");
const compiledCaptainValidation = path.join(distRoot, "services", "backend-api", "src", "modules", "platform", "captain-catalog.validation.js");
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

const forbiddenRuntimePatterns = [
  {
    pattern: /require\(["'][^"']+\.ts["']\)/,
    reason: "runtime require points to a TypeScript source file"
  },
  {
    pattern: /import\(["'][^"']+\.ts["']\)/,
    reason: "dynamic runtime import points to a TypeScript source file"
  },
  {
    pattern: /from\s+["'][^"']+\.ts["']/,
    reason: "runtime import points to a TypeScript source file"
  },
  {
    pattern: /packages[\\/][^\\/]+[\\/]src/,
    reason: "runtime output points to a workspace source directory"
  },
  {
    pattern: /@karigo\/(?:shared-types|config|ui-components)/,
    reason: "runtime output imports a source-only KariGO workspace package"
  }
];

function relative(filePath) {
  return path.relative(backendRoot, filePath).replace(/\\/g, "/");
}

function walkJsFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

function findMainFiles(directory) {
  return walkJsFiles(directory).filter((filePath) => path.basename(filePath) === "main.js");
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} was not emitted: ${relative(filePath)}`);
  }
}

function assertNoForbiddenRuntimeImports() {
  const offenders = [];
  for (const filePath of walkJsFiles(distRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const check of forbiddenRuntimePatterns) {
      if (check.pattern.test(source)) {
        offenders.push(`${relative(filePath)}: ${check.reason}`);
      }
    }
  }

  if (offenders.length) {
    throw new Error(`Backend build contains production-unsafe runtime imports:\n- ${offenders.join("\n- ")}`);
  }
}

function assertCompiledCatalogSmoke() {
  const catalog = require(compiledCaptainCatalog);
  const validation = require(compiledCaptainValidation);
  const { PlatformCatalogService } = require(compiledPlatformCatalog);

  const vehicleCatalog = catalog.vehicleCatalog();
  if (!vehicleCatalog?.makes?.length || !vehicleCatalog?.colours?.length) {
    throw new Error("Compiled Captain vehicle catalog did not load correctly.");
  }

  const serviceAreaCatalog = catalog.captainServiceAreaCatalog();
  const activeAreaIds = new Set((serviceAreaCatalog?.areas ?? []).filter((area) => area.isActive).map((area) => area.id));
  if (!activeAreaIds.has("kano-kano") || !activeAreaIds.has("fct-abuja")) {
    throw new Error("Compiled Captain service-area catalog did not load Kano and Abuja.");
  }

  const platformService = new PlatformCatalogService();
  if (!platformService.vehicleCatalog()?.makes?.length || !platformService.captainServiceAreas()?.areas?.length) {
    throw new Error("Compiled platform catalog service did not load catalog data.");
  }

  validation.resolveCaptainLocation({
    residentialStateCode: "KANO",
    residentialCityCode: "KANO",
    operatingAreaIds: ["kano-kano"],
    primaryOperatingAreaId: "kano-kano"
  });
  validation.resolveVehicleDetails({
    vehicleMake: "TOYOTA",
    vehicleModel: "COROLLA",
    vehicleYear: 2018,
    vehicleColour: "BLACK"
  });
}

if (!fs.existsSync(expectedEntry)) {
  const discovered = findMainFiles(distRoot).map(relative);
  const detail = discovered.length
    ? ` Found main.js candidates: ${discovered.join(", ")}.`
    : " No main.js candidates were found under dist.";
  throw new Error(`Backend build did not produce ${relative(expectedEntry)}.${detail}`);
}

assertFile(compiledCaptainCatalog, "Compiled Captain catalog module");
assertFile(compiledCaptainValidation, "Compiled Captain catalog validation module");
assertFile(compiledPlatformCatalog, "Compiled platform catalog service module");
assertNoForbiddenRuntimeImports();
assertCompiledCatalogSmoke();

fs.writeFileSync(compatibilityEntry, compatibilityShim);
console.log(`Verified backend build entry: ${relative(expectedEntry)}`);
console.log("Verified backend runtime imports contain no TypeScript source or source-only workspace package references.");
console.log("Verified compiled Captain catalog and validation modules load with plain Node.js.");
console.log("No backend runtime workspace packages are required for Captain catalog data.");
console.log(`Wrote backend compatibility entry: ${relative(compatibilityEntry)}`);
