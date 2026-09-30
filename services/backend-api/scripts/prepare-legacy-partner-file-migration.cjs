/*
 * Counts-only migration planner. It deliberately cannot mutate source or destination.
 * The controlled-window executor must follow the emitted ordered steps and the runbook gate.
 */
const { createHmac } = require("crypto");
const { PrismaClient } = require("@prisma/client");

function migrationKeySecret(value = process.env.PARTNER_PRIVATE_STORAGE_KEY_SECRET) {
  if (!value || value.trim().length < 32) {
    throw new Error("PARTNER_PRIVATE_STORAGE_KEY_SECRET must be at least 32 characters for opaque migration keys.");
  }
  return value.trim();
}
function opaqueDigest(secret, scope, value) {
  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex").slice(0, 32);
}
function deterministicKey(row, secretValue) {
  const secret = migrationKeySecret(secretValue);
  const subject = opaqueDigest(secret, "vendor", row.vendorId);
  const object = opaqueDigest(secret, "legacy-document", `${row.id}:${row.documentUrl}`);
  return `partner-private/${subject}/${object}`;
}
function planRow(row, secretValue) {
  return {
    id: row.id,
    destinationKey: deterministicKey(row, secretValue),
    status: row.storageKey ? "ALREADY_REFERENCED" : "PLANNED",
    requiredManifestFields: [
      "vendorId", "onboardingDocumentId", "documentType", "originalFileName", "mimeType", "sizeBytes",
      "storageKey", "storageProvider", "storageBucket", "externalDeletionState", "retentionReason"
    ],
    orderedSteps: ["COPY", "VERIFY_DESTINATION", "CREATE_MANIFEST", "SWITCH_REFERENCE", "VERIFY_AUTHORIZED_READ", "REMOVE_PUBLIC_SOURCE", "RECORD_AUDIT"]
  };
}
async function run() {
  if (process.argv.includes("--apply")) throw new Error("Apply is disabled in Task H11.2Q; use the controlled production runbook after provider and snapshot approval.");
  if (!process.argv.includes("--dry-run")) throw new Error("Choose --dry-run. Production mutation is not authorized.");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.vendorOnboardingDocument.findMany({ select: { id: true, vendorId: true, documentUrl: true, storageKey: true } });
    const secret = migrationKeySecret();
    const states = rows.map((row) => planRow(row, secret)).reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
    console.log(JSON.stringify({ mode: "dry-run", inspected: rows.length, states, executionEnabled: false }));
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { deterministicKey, planRow };
