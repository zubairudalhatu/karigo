import { createHmac, timingSafeEqual, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { RETENTION_POLICY_VERSION } from "./retention-policy";

export interface DeletionTombstone {
  userId: string; customerId: string; requestReference: string; completedAt: string;
  sharedIdentityRetained: boolean;
}
export interface RestoreManifest {
  policyVersion: string; coveredThrough: string; restoreInstanceId: string; databaseIdentityHash: string;
  tombstones: DeletionTombstone[];
}
const uuid = /^[0-9a-f-]{36}$/i;
export function signRestoreManifest(manifest: RestoreManifest, key: string) {
  if (key.length < 32) throw new Error("A dedicated restore-manifest signing key is required.");
  const payload = JSON.stringify(manifest);
  return { payload, signature: createHmac("sha256", key).update(payload).digest("hex") };
}
export function verifyRestoreManifest(envelope: { payload: string; signature: string }, key: string, expected: {
  instanceId: string; databaseIdentityHash: string; requiredCoverage: Date;
}) {
  if (key.length < 32 || !/^[a-f0-9]{64}$/.test(envelope.signature)) throw new Error("Invalid restore evidence.");
  const signature = createHmac("sha256", key).update(envelope.payload).digest();
  if (!timingSafeEqual(signature, Buffer.from(envelope.signature, "hex"))) throw new Error("Invalid restore evidence.");
  const value = JSON.parse(envelope.payload) as RestoreManifest;
  if (value.policyVersion !== RETENTION_POLICY_VERSION || value.restoreInstanceId !== expected.instanceId
    || value.databaseIdentityHash !== expected.databaseIdentityHash || !Number.isFinite(expected.requiredCoverage.getTime())
    || !Number.isFinite(Date.parse(value.coveredThrough)) || new Date(value.coveredThrough) < expected.requiredCoverage
    || !Array.isArray(value.tombstones) || value.tombstones.length > 10000) throw new Error("Restore evidence does not cover this isolated restore.");
  const seen = new Set<string>();
  for (const item of value.tombstones) {
    if (!uuid.test(item.userId) || !uuid.test(item.customerId) || !/^ADR-[0-9A-F-]{36}$/i.test(item.requestReference)
      || !Number.isFinite(Date.parse(item.completedAt)) || new Date(item.completedAt) > new Date(value.coveredThrough)
      || typeof item.sharedIdentityRetained !== "boolean" || seen.has(item.userId)) throw new Error("Invalid deletion tombstone.");
    seen.add(item.userId);
  }
  return value;
}

export function databaseIdentityHash(url: string) {
  const parsed = new URL(url);
  // Credentials never enter evidence or logs; use exact host/port/database identity.
  return createHash("sha256").update(`${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`).digest("hex");
}

// Operations must boot every restored environment with RESTORE_ISOLATED=true.
// The gate is fail-closed until verified replay succeeds; not an assertion that
// every externally created server is automatically configured this way.
export async function assertRestoreReplayGate(replay: (item: DeletionTombstone) => Promise<void>) {
  if (process.env.RESTORE_ISOLATED !== "true") return;
  const file = process.env.RESTORE_DELETION_MANIFEST_FILE;
  const key = process.env.RESTORE_DELETION_MANIFEST_KEY;
  const instanceId = process.env.RESTORE_INSTANCE_ID;
  if (!file || !key || !instanceId || !process.env.DATABASE_URL || !process.env.RESTORE_REQUIRED_COVERAGE) throw new Error("Restore remains isolated: authenticated deletion replay evidence is required.");
  const envelope = JSON.parse(await readFile(file, "utf8")) as { payload: string; signature: string };
  const manifest = verifyRestoreManifest(envelope, key, { instanceId,
    databaseIdentityHash: databaseIdentityHash(process.env.DATABASE_URL), requiredCoverage: new Date(process.env.RESTORE_REQUIRED_COVERAGE) });
  for (const item of manifest.tombstones) await replay(item);
}
