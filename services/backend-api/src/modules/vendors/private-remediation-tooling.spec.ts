const { classifyOnboarding } = require("../../../scripts/inventory-legacy-partner-files.cjs");
const { deterministicKey, planRow } = require("../../../scripts/prepare-legacy-partner-file-migration.cjs");
const { assertRehearsalUrl } = require("../../../scripts/rehearse-storage-lifecycle-migration.cjs");

describe("private remediation tooling", () => {
  const migrationSecret = "test-only-partner-private-key-secret-2026";
  it("classifies onboarding documents without using filenames or contents", () => {
    expect(classifyOnboarding({ verificationStatus: "APPROVED" })).toBe("APPROVED_ONBOARDING_EVIDENCE");
    expect(classifyOnboarding({ verificationStatus: "PENDING" })).toBe("PRIVATE_ONBOARDING_DOCUMENT");
    expect(classifyOnboarding({ verificationStatus: "UNRECOGNIZED" })).toBe("UNKNOWN");
  });
  it("produces deterministic, vendor-scoped, resumable plans", () => {
    const row = { id: "doc-1", vendorId: "vendor-1", documentUrl: "https://legacy.example/object", storageKey: null };
    const destinationKey = deterministicKey(row, migrationSecret);
    expect(destinationKey).toBe(deterministicKey(row, migrationSecret));
    expect(destinationKey).toMatch(/^partner-private\/[a-f0-9]{32}\/[a-f0-9]{32}$/);
    expect(destinationKey).not.toContain(row.vendorId);
    expect(destinationKey).not.toContain(row.id);
    expect(planRow(row, migrationSecret)).toMatchObject({
      status: "PLANNED",
      requiredManifestFields: expect.arrayContaining(["storageKey", "storageProvider", "storageBucket", "mimeType", "sizeBytes", "retentionReason"]),
      orderedSteps: ["COPY", "VERIFY_DESTINATION", "CREATE_MANIFEST", "SWITCH_REFERENCE", "VERIFY_AUTHORIZED_READ", "REMOVE_PUBLIC_SOURCE", "RECORD_AUDIT"]
    });
    expect(planRow({ ...row, storageKey: "existing" }, migrationSecret).status).toBe("ALREADY_REFERENCED");
  });
  it("refuses an unmarked database and requires the restored-copy gate", () => {
    expect(() => assertRehearsalUrl("postgresql://localhost/live")).toThrow("not explicitly marked");
    process.env.CONFIRM_TASK209B_RESTORED_SNAPSHOT = "AUTHORIZED_RESTORED_COPY";
    expect(assertRehearsalUrl("postgresql://localhost/karigo_task209b_rehearsal")).toContain("task209b_rehearsal");
    delete process.env.CONFIRM_TASK209B_RESTORED_SNAPSHOT;
  });
});
