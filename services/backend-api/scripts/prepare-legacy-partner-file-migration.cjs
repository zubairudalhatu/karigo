/*
 * The Task 209B legacy Partner file-migration branch is closed.
 * All seven historical source objects are unavailable; fresh evidence must use
 * the authenticated private-storage upload and replacement-review workflow.
 */
const LEGACY_MIGRATION_CLOSED = true;

function closureState() {
  return {
    mode: "closed",
    historicalApprovalRecords: 7,
    recoverableLegacyObjects: 0,
    eligibleForMigration: 0,
    reacquisitionRequired: 7,
    executionEnabled: false
  };
}

function run() {
  if (process.argv.includes("--apply")) {
    throw new Error("Legacy Partner file migration is closed; no source object is eligible for migration.");
  }
  console.log(JSON.stringify(closureState()));
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { LEGACY_MIGRATION_CLOSED, closureState };
