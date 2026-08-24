const fs = require("node:fs");
const path = require("node:path");

const migrationPath = path.join(
  __dirname,
  "..",
  "prisma",
  "migrations",
  "20260824110000_task209b_partner_commercial_policies",
  "migration.sql"
);
const sql = fs.readFileSync(migrationPath, "utf8");

function fail(message) {
  throw new Error(`H11.2 migration validation failed: ${message}`);
}

function assertIncludes(value, message) {
  if (!sql.includes(value)) fail(message);
}

let depth = 0;
let statementStart = 0;
let statementCount = 0;
let quote = null;
let lineComment = false;
let blockComment = false;

for (let index = 0; index < sql.length; index += 1) {
  const current = sql[index];
  const next = sql[index + 1];

  if (lineComment) {
    if (current === "\n") lineComment = false;
    continue;
  }
  if (blockComment) {
    if (current === "*" && next === "/") {
      blockComment = false;
      index += 1;
    }
    continue;
  }
  if (quote) {
    if (current === quote && next === quote) {
      index += 1;
    } else if (current === quote) {
      quote = null;
    }
    continue;
  }
  if (current === "-" && next === "-") {
    lineComment = true;
    index += 1;
    continue;
  }
  if (current === "/" && next === "*") {
    blockComment = true;
    index += 1;
    continue;
  }
  if (current === "'" || current === '"') {
    quote = current;
    continue;
  }
  if (current === "(") depth += 1;
  if (current === ")") {
    depth -= 1;
    if (depth < 0) fail(`unexpected closing parenthesis at character ${index}`);
  }
  if (current === ";") {
    if (depth !== 0) fail(`statement terminator found inside an open parenthesized statement at character ${index}`);
    if (sql.slice(statementStart, index).trim()) statementCount += 1;
    statementStart = index + 1;
  }
}

if (quote || blockComment) fail("unterminated quoted value or block comment");
if (depth !== 0) fail(`unbalanced parentheses; final depth is ${depth}`);
if (sql.slice(statementStart).replace(/--.*$/gm, "").trim()) fail("final SQL statement is missing a semicolon");
if (statementCount !== 34) fail(`expected 34 terminated statements, found ${statementCount}`);

const requiredTables = [
  "partner_commercial_policies",
  "partner_commercial_agreements",
  "partner_onboarding_payments",
  "partner_onboarding_fee_waivers"
];
for (const table of requiredTables) {
  assertIncludes(`CREATE TABLE "${table}"`, `missing CREATE TABLE for ${table}`);
}

assertIncludes('CREATE TYPE "PartnerCommercialModel"', "missing PartnerCommercialModel enum");
assertIncludes('CREATE TYPE "PartnerOnboardingPaymentStatus"', "missing PartnerOnboardingPaymentStatus enum");
assertIncludes('ALTER TABLE "vendor_settlements" ADD COLUMN "commercialAgreementId" UUID;', "missing VendorSettlement commercial agreement column");
assertIncludes('ALTER TABLE "vendors" ADD COLUMN "commercialAgreementId" UUID;', "missing Vendor commercial agreement column");
assertIncludes('CREATE INDEX "vendor_settlements_commercialAgreementId_idx"', "missing VendorSettlement commercial agreement index");
assertIncludes('ADD CONSTRAINT "vendor_settlements_commercialAgreementId_fkey"', "missing VendorSettlement commercial agreement foreign key");
assertIncludes('"partner_commercial_policies_businessCategory_isActive_effec_idx"', "policy readiness index name does not match Prisma");
assertIncludes('"partner_commercial_policies_isActive_effectiveFrom_effectiv_idx"', "policy effective-window index name does not match Prisma");

const settlementColumn = sql.indexOf('ALTER TABLE "vendor_settlements" ADD COLUMN "commercialAgreementId"');
const settlementIndex = sql.indexOf('CREATE INDEX "vendor_settlements_commercialAgreementId_idx"');
const settlementForeignKey = sql.indexOf('ADD CONSTRAINT "vendor_settlements_commercialAgreementId_fkey"');
if (!(settlementColumn < settlementIndex && settlementIndex < settlementForeignKey)) {
  fail("VendorSettlement column/index/foreign-key ordering is invalid");
}

if (/^\s*(UPDATE|DELETE|DROP|TRUNCATE)\b/im.test(sql)) fail("destructive or historical-data mutation SQL found");
assertIncludes("'RESTAURANT', 'COMMISSION', 1000, NULL", "Restaurant launch seed is not 10% commission");
for (const category of ["GROCERIES", "MARKET_ITEMS", "PHARMACY", "SME_SERVICES"]) {
  assertIncludes(`'${category}', 'ONBOARDING_FEE', 0, NULL`, `${category} seed must retain 0% commission and an unconfigured fee`);
}
assertIncludes("'PARCEL_LOGISTICS_PARTNER', 'QUOTATION', 0, NULL, 'NGN', CURRENT_TIMESTAMP, true, false", "Parcel onboarding must remain private and quotation-based");
assertIncludes("'OTHER_MARKETPLACE_VENDOR', 'REVIEW_REQUIRED', 0, NULL", "Other Marketplace seed must remain review-required");

console.log(`H11.2 migration structure check passed (${statementCount} statements).`);
