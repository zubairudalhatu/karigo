/*
 * Counts-only migration planner. It deliberately cannot mutate source or destination.
 * The controlled-window executor must follow the emitted ordered steps and the runbook gate.
 */
const { createHash } = require("crypto");
const { PrismaClient } = require("@prisma/client");

function deterministicKey(row) {
  const suffix = createHash("sha256").update(`${row.id}:${row.vendorId}:${row.documentUrl}`).digest("hex").slice(0, 32);
  return `partner-private/vendors/${row.vendorId}/onboarding-documents/legacy-${row.id}-${suffix}`;
}
function planRow(row) {
  return {
    id: row.id,
    destinationKey: deterministicKey(row),
    status: row.storageKey ? "ALREADY_REFERENCED" : "PLANNED",
    orderedSteps: ["COPY", "VERIFY_DESTINATION", "CREATE_MANIFEST", "SWITCH_REFERENCE", "VERIFY_AUTHORIZED_READ", "REMOVE_PUBLIC_SOURCE", "RECORD_AUDIT"]
  };
}
async function run() {
  if (process.argv.includes("--apply")) throw new Error("Apply is disabled in Task H11.2Q; use the controlled production runbook after provider and snapshot approval.");
  if (!process.argv.includes("--dry-run")) throw new Error("Choose --dry-run. Production mutation is not authorized.");
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.vendorOnboardingDocument.findMany({ select: { id: true, vendorId: true, documentUrl: true, storageKey: true } });
    const states = rows.map(planRow).reduce((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
    console.log(JSON.stringify({ mode: "dry-run", inspected: rows.length, states, executionEnabled: false }));
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { deterministicKey, planRow };
