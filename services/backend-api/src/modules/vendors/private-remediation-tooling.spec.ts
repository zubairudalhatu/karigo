const { classifyOnboarding } = require("../../../scripts/inventory-legacy-partner-files.cjs");
const { LEGACY_MIGRATION_CLOSED, closureState } = require("../../../scripts/prepare-legacy-partner-file-migration.cjs");
const { assertRehearsalUrl } = require("../../../scripts/rehearse-storage-lifecycle-migration.cjs");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

describe("private remediation tooling", () => {
  it("classifies onboarding documents without using filenames or contents", () => {
    expect(classifyOnboarding({ verificationStatus: "APPROVED" })).toBe("APPROVED_ONBOARDING_EVIDENCE");
    expect(classifyOnboarding({ verificationStatus: "APPROVED", evidenceAvailability: "SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED" })).toBe("HISTORICAL_RECORD_SOURCE_UNAVAILABLE");
    expect(classifyOnboarding({ verificationStatus: "PENDING" })).toBe("PRIVATE_ONBOARDING_DOCUMENT");
    expect(classifyOnboarding({ verificationStatus: "UNRECOGNIZED" })).toBe("UNKNOWN");
  });
  it("keeps the legacy migration branch closed with zero eligible objects", () => {
    expect(LEGACY_MIGRATION_CLOSED).toBe(true);
    expect(closureState()).toEqual({
      mode: "closed",
      historicalApprovalRecords: 7,
      recoverableLegacyObjects: 0,
      eligibleForMigration: 0,
      reacquisitionRequired: 7,
      executionEnabled: false
    });
  });
  it("guards exactly the seven historical records without rewriting approval history", () => {
    const sql = readFileSync(join(
      __dirname,
      "../../../prisma/migrations/20261001120000_task209b_partner_evidence_reacquisition/migration.sql"
    ), "utf8");
    for (const safeId of ["b4187a1e25f4", "27086d6f9159", "366884c52ff2", "9d454899b7cf", "d715c26d6661", "dfa6a5b2d7f0", "e878295e490a"]) {
      expect(sql).toContain(`'${safeId}'`);
    }
    expect(sql).toContain("affected_count <> 7");
    expect(sql).toContain("SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED");
    expect(sql).not.toMatch(/SET\s+"verificationStatus"/i);
    expect(sql).not.toMatch(/SET\s+"reviewedAt"/i);
  });
  it("refuses an unmarked database and requires the restored-copy gate", () => {
    expect(() => assertRehearsalUrl("postgresql://localhost/live")).toThrow("not explicitly marked");
    process.env.CONFIRM_TASK209B_RESTORED_SNAPSHOT = "AUTHORIZED_RESTORED_COPY";
    expect(assertRehearsalUrl("postgresql://localhost/karigo_task209b_rehearsal")).toContain("task209b_rehearsal");
    delete process.env.CONFIRM_TASK209B_RESTORED_SNAPSHOT;
  });
});
