/* Runs Prisma migration only against an explicitly named restored/rehearsal database. */
const { spawnSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

function assertRehearsalUrl(raw) {
  if (!raw) throw new Error("TASK209B_REHEARSAL_DATABASE_URL is required.");
  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "").toLowerCase();
  if (!/(restore|snapshot|rehearsal|task209b)/.test(database)) throw new Error("Refusing database whose name is not explicitly marked restore/snapshot/rehearsal/task209b.");
  if (process.env.CONFIRM_TASK209B_RESTORED_SNAPSHOT !== "AUTHORIZED_RESTORED_COPY") throw new Error("Restored-copy confirmation is required.");
  return raw;
}
async function counts(prisma) {
  const [users, vendors, documents, privateUploads, payments, webhooks] = await Promise.all([
    prisma.user.count(), prisma.vendor.count(), prisma.vendorOnboardingDocument.count(), prisma.vendorPrivateUpload.count(), prisma.payment.count(), prisma.paymentWebhookLog.count()
  ]);
  return { users, vendors, documents, privateUploads, payments, webhooks };
}
async function run() {
  const databaseUrl = assertRehearsalUrl(process.env.TASK209B_REHEARSAL_DATABASE_URL);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const started = Date.now();
  try {
    const before = await counts(prisma);
    await prisma.$disconnect();
    const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["exec", "prisma", "migrate", "deploy"], {
      cwd: require("path").resolve(__dirname, ".."), env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8"
    });
    if (result.status !== 0) throw new Error(`Migration rehearsal failed with exit code ${result.status}.`);
    const afterClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const after = await counts(afterClient);
    await afterClient.$disconnect();
    console.log(JSON.stringify({ before, after, unchangedCoreCounts: ["users", "vendors", "documents", "payments", "webhooks"].every((key) => before[key] === after[key]), runtimeMs: Date.now() - started }));
  } finally { await prisma.$disconnect().catch(() => undefined); }
}
if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { assertRehearsalUrl };
