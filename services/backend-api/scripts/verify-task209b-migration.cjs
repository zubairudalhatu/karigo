const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(backendRoot, "..", "..");
const relativeMigration = "services/backend-api/prisma/migrations/20260805183000_task209b_controlled_supply_activation/migration.sql";
const migrationFile = path.join(repositoryRoot, relativeMigration);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(fs.existsSync(migrationFile), "Task 209B migration file is missing.");
const sql = fs.readFileSync(migrationFile, "utf8");
[
  "ControlledSupplyGroupStatus",
  "ControlledSupplyMemberType",
  "LaunchChecklistItemStatus",
  "LaunchDrillStepStatus",
  "controlled_supply_groups",
  "controlled_supply_members",
  "controlled_operations_customers",
  "launch_operations_checklist_items",
  "launch_drill_steps",
  "launch_drill_events"
].forEach((identifier) => assert(sql.includes(identifier), `Task 209B migration is missing ${identifier}.`));

assert(!/\b(DROP|TRUNCATE|DELETE\s+FROM|UPDATE\s+[^\s]+\s+SET)\b/i.test(sql), "Task 209B migration must remain additive and contain no destructive/backfill statements.");
const alteredTables = [...sql.matchAll(/ALTER TABLE\s+"([^"]+)"/gi)].map((match) => match[1]);
const newTables = new Set(["controlled_supply_members", "launch_drill_steps", "launch_drill_events"]);
assert(alteredTables.every((table) => table === "launch_drills" || newTables.has(table)), "Task 209B may only add columns to launch_drills or constraints to its new tables.");
assert(!/ALTER TABLE\s+"launch_drills"\s+(?!ADD COLUMN)/i.test(sql), "Existing launch_drills changes must be ADD COLUMN only.");

const changedMigrationHistory = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "services/backend-api/prisma/migrations"], {
  cwd: repositoryRoot,
  encoding: "utf8"
}).trim().split(/\r?\n/).filter(Boolean).filter((file) => file !== relativeMigration);
assert(changedMigrationHistory.length === 0, `Existing migration history was modified: ${changedMigrationHistory.join(", ")}`);

const testDatabaseUrl = process.env.TASK209B_MIGRATION_TEST_DATABASE_URL;
const confirmApply = process.env.TASK209B_MIGRATION_TEST_CONFIRM === "apply";
if (testDatabaseUrl && confirmApply) {
  console.log("Task 209B additive checks passed. Running disposable PostgreSQL migrate deploy...");
  execFileSync("npx.cmd", ["prisma", "migrate", "deploy"], {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit"
  });
  console.log("Task 209B disposable PostgreSQL migration replay completed.");
} else {
  console.log("Task 209B additive migration and history-preservation checks passed.");
  console.log("Disposable database apply was not configured; Prisma validation remains required.");
}
