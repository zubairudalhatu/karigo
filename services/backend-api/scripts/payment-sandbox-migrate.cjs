// Fresh synthetic databases have no seven historical Production evidence records.
// Never modify the shipped migration or apply this exception to populated identities.
const fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  crypto = require("node:crypto");
const name = "20261001120000_task209b_partner_evidence_reacquisition";
const expected =
  "cba43bed675b632510d147b47b0d9ffea37be059d05015b34fa3d3f27d92bbec";
async function migrateStaging() {
  require("./payment-sandbox-guard.cjs").assertPaymentSandbox(process.env);
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient();
  const cli = require.resolve("prisma/build/index.js");
  const run = (args, input) =>
    cp.execFileSync(process.execPath, [cli, ...args], {
      stdio: "pipe",
      env: process.env,
      input,
    });
  try {
    try {
      run(["migrate", "deploy"]);
    } catch (error) {
      const failures = await db.$queryRawUnsafe(
        "SELECT migration_name, logs FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL",
      );
      if (
        failures.length !== 1 ||
        failures[0].migration_name !== name ||
        !failures[0].logs?.includes(
          "expected 7 eligible historical records, found 0",
        )
      )
        throw Error("STAGING_MIGRATION_REVIEW_REQUIRED");
      if (
        (await db.user.count()) ||
        (await db.vendor.count()) ||
        (await db.vendorOnboardingDocument.count())
      )
        throw Error("STAGING_EMPTY_IDENTITY_DATABASE_REQUIRED");
      const file = path.join("prisma/migrations", name, "migration.sql"),
        bytes = fs.readFileSync(file);
      if (
        crypto
          .createHash("sha256")
          .update(bytes.toString("utf8").replaceAll("\r\n", "\n"))
          .digest("hex") !== expected
      )
        throw Error("STAGING_HISTORICAL_MIGRATION_CHANGED");
      const shape = await db.$queryRawUnsafe(
        `SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='public' AND table_name='vendor_onboarding_documents' AND column_name IN ('evidenceAvailability','replacesDocumentId')`,
      );
      if (shape[0].count === 0)
        run(
          ["db", "execute", "--schema", "prisma/schema.prisma", "--stdin"],
          bytes.toString("utf8").split("DO $$")[0],
        );
      else if (shape[0].count !== 2)
        throw Error("STAGING_PARTIAL_HISTORICAL_SCHEMA");
      // Prisma records the original shipped checksum after the DDL has been applied.
      run(["migrate", "resolve", "--applied", name]);
      run(["migrate", "deploy"]);
      process.stdout.write(
        "PAYMENT_SANDBOX_EMPTY_DATABASE_HISTORICAL_REPAIR_NOT_APPLICABLE\n",
      );
    }
    const diffArgs = [
      "migrate",
      "diff",
      "--from-schema-datasource",
      "prisma/schema.prisma",
      "--to-schema-datamodel",
      "prisma/schema.prisma",
    ];
    try {
      run([...diffArgs, "--exit-code"]);
    } catch (error) {
      if (error.status !== 2) throw Error("STAGING_SCHEMA_DIFF_FAILED");
      if (
        (await db.user.count()) ||
        (await db.vendor.count()) ||
        (await db.order.count()) ||
        (await db.payment.count()) ||
        (await db.taxiTrip.count()) ||
        (await db.taxiDriverProfile.count())
      )
        throw Error("STAGING_ALIGNMENT_REQUIRES_EMPTY_BUSINESS_DATABASE");
      const file = path.resolve(
          "../../infra/partner-staging-schema-alignment.sql",
        ),
        sql =
          fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n").trim() + "\n";
      const actual =
        run([...diffArgs, "--script"])
          .toString("utf8")
          .replaceAll("\r\n", "\n")
          .trim() + "\n";
      if (
        crypto.createHash("sha256").update(sql).digest("hex") !==
          "090f4a7a072e0d2d582b92c60b9c37b558020ba74e21e00f4b8ea6f4225e6d07" ||
        actual !== sql
      )
        throw Error("STAGING_SCHEMA_ALIGNMENT_REVIEW_REQUIRED");
      run(
        ["db", "execute", "--schema", "prisma/schema.prisma", "--stdin"],
        sql,
      );
      run([...diffArgs, "--exit-code"]);
      process.stdout.write(
        "PAYMENT_SANDBOX_EMPTY_DATABASE_MODEL_ALIGNMENT_PASS\n",
      );
    }
    process.stdout.write("PAYMENT_SANDBOX_MIGRATIONS_AND_SCHEMA_DRIFT_PASS\n");
  } finally {
    await db.$disconnect();
  }
}
module.exports = { migrateStaging };

if (require.main === module)
  migrateStaging().catch(() => {
    console.error("PAYMENT_SANDBOX_MIGRATION_FAILED");
    process.exitCode = 1;
  });
