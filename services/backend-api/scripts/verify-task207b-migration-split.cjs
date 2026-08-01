const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");
const migrationRoot = path.join(backendRoot, "prisma", "migrations");
const firstMigration = path.join(
  migrationRoot,
  "20260801100000_task207b_production_rides_and_application_trash",
  "migration.sql"
);
const secondMigration = path.join(
  migrationRoot,
  "20260801100500_task207b_activate_ride_captain_profiles",
  "migration.sql"
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readSql(file) {
  assert(fs.existsSync(file), `Missing migration file: ${path.relative(backendRoot, file)}`);
  return fs.readFileSync(file, "utf8");
}

const firstSql = readSql(firstMigration);
const secondSql = readSql(secondMigration);

assert(
  firstSql.includes(`ALTER TYPE "TaxiDriverProfileStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';`),
  "First Task 207B migration must add ACTIVE to TaxiDriverProfileStatus."
);
assert(
  !/UPDATE\s+"taxi_driver_profiles"\s+SET\s+"status"\s*=\s*'ACTIVE'\s+WHERE\s+"status"\s*=\s*'ACTIVE_TEST'/i.test(firstSql),
  "First Task 207B migration must not use ACTIVE before the enum addition commits."
);
assert(
  /UPDATE\s+"taxi_driver_profiles"\s+SET\s+"status"\s*=\s*'ACTIVE'\s+WHERE\s+"status"\s*=\s*'ACTIVE_TEST'/i.test(secondSql),
  "Second Task 207B migration must convert ACTIVE_TEST profiles to ACTIVE."
);
assert(firstSql.includes("ADD COLUMN IF NOT EXISTS"), "Task 207B migration must keep trash columns replay-safe.");
assert(firstSql.includes("CREATE INDEX IF NOT EXISTS"), "Task 207B migration must keep indexes replay-safe.");
assert(firstSql.includes("CREATE TABLE IF NOT EXISTS"), "Task 207B migration must keep captain_work_states table replay-safe.");
assert(firstSql.includes("duplicate_object"), "Task 207B enum helper types must be guarded for replay.");
assert(firstSql.includes('ON CONFLICT ("userId") DO NOTHING'), "Task 207B work-state backfill must be idempotent.");

const testDatabaseUrl = process.env.TASK207B_MIGRATION_TEST_DATABASE_URL;
const confirmApply = process.env.TASK207B_MIGRATION_TEST_CONFIRM === "apply";

if (testDatabaseUrl && confirmApply) {
  console.log("Task 207B migration split static checks passed. Running disposable PostgreSQL migrate deploy...");
  execFileSync("npx.cmd", ["prisma", "migrate", "deploy"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl
    },
    stdio: "inherit"
  });
  console.log("Task 207B disposable PostgreSQL migrate deploy completed.");
} else {
  console.log("Task 207B migration split static checks passed.");
  console.log("Disposable PostgreSQL apply skipped. Set TASK207B_MIGRATION_TEST_DATABASE_URL and TASK207B_MIGRATION_TEST_CONFIRM=apply to run migrate deploy against a pre-207B test database.");
}
