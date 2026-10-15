import { randomUUID } from "node:crypto";
import { assertRestoreReplayGate, databaseIdentityHash, signRestoreManifest, verifyRestoreManifest, RestoreManifest } from "./restore-deletion-replay";
import { RETENTION_POLICY_VERSION } from "./retention-policy";

describe("Isolated restore deletion replay trust boundary", () => {
  const key = "synthetic-fixture-only-signing-value-not-a-real-key";
  const target = databaseIdentityHash("postgresql://fixture:never-output@127.0.0.1:55439/karigo_retention_qa_20261015");
  const manifest: RestoreManifest = { policyVersion: RETENTION_POLICY_VERSION, coveredThrough: "2026-10-15T10:00:00Z", restoreInstanceId: randomUUID(), databaseIdentityHash: target,
    tombstones: [{ userId: randomUUID(), customerId: randomUUID(), requestReference: `ADR-${randomUUID()}`, completedAt: "2026-10-15T09:00:00Z", sharedIdentityRetained: false }] };
  const expected = { instanceId: manifest.restoreInstanceId, databaseIdentityHash: target, requiredCoverage: new Date(manifest.coveredThrough) };
  it("authenticates the authoritative minimal journal and exact restore/database identity", () => {
    const signed = signRestoreManifest(manifest, key);
    expect(verifyRestoreManifest(signed, key, expected)).toEqual(manifest);
    expect(signed.payload).not.toContain("never-output"); expect(signed.payload).not.toContain("phone");
    expect(() => verifyRestoreManifest({ ...signed, payload: signed.payload.replace('false', 'true') }, key, expected)).toThrow();
    expect(() => verifyRestoreManifest(signed, key, { ...expected, instanceId: randomUUID() })).toThrow();
    expect(() => verifyRestoreManifest(signed, key, { ...expected, databaseIdentityHash: "different-database" })).toThrow();
    expect(() => verifyRestoreManifest(signed, key, { ...expected, requiredCoverage: new Date("2026-10-16") })).toThrow();
  });
  it("refuses malformed or duplicate tombstones", () => {
    const bad = { ...manifest, tombstones: [manifest.tombstones[0], manifest.tombstones[0]] };
    expect(() => verifyRestoreManifest(signRestoreManifest(bad, key), key, expected)).toThrow();
  });
  it("blocks restored boot without evidence, while ordinary boot is unchanged", async () => {
    const old = process.env.RESTORE_ISOLATED;
    try {
      delete process.env.RESTORE_ISOLATED; const replay = jest.fn(); await assertRestoreReplayGate(replay); expect(replay).not.toHaveBeenCalled();
      process.env.RESTORE_ISOLATED = "true"; await expect(assertRestoreReplayGate(replay)).rejects.toThrow("Restore remains isolated");
    } finally { if (old === undefined) delete process.env.RESTORE_ISOLATED; else process.env.RESTORE_ISOLATED = old; }
  });
});
