import { readFile, writeFile } from "node:fs/promises";
import { PrismaService } from "../../prisma/prisma.service";
import { DataRetentionService } from "./data-retention.service";
import { TemporaryPiiExports } from "./temporary-pii-exports";
import { databaseIdentityHash } from "./restore-deletion-replay";
import { FINANCIAL_ACCOUNTING_TIME_ZONE, RETENTION_POLICY_VERSION } from "./retention-policy";

async function main() {
  const fixtureApply = process.argv.includes("--apply-fixtures");
  const apply = fixtureApply || process.argv.includes("--apply");
  const target = new URL(process.env.DATABASE_URL ?? "invalid:");
  // This task cannot mutate Production. Future Production scheduling/activation
  // needs a separately approved rollout; no bypass flag exists in this command.
  if (fixtureApply && (target.hostname !== "127.0.0.1" || target.port !== "55439" || target.pathname !== "/karigo_retention_qa_20261015")) throw new Error("Fixture-only retention apply refused.");
  if (apply && !fixtureApply && (process.env.CONFIRM_RETENTION_APPLY !== RETENTION_POLICY_VERSION
    || process.env.RETENTION_EXPECTED_DATABASE_IDENTITY !== databaseIdentityHash(process.env.DATABASE_URL!))) {
    throw new Error("Applying retention requires explicit policy approval and exact database identity confirmation.");
  }
  const db = new PrismaService();
  try {
    await db.onModuleInit();
    const retention = new DataRetentionService(db);
    const now = new Date();
    const receipts = await retention.expireReceiptCapabilities(now, apply);
    const sponsoredEvents = await retention.sponsoredEventRetention(now, apply);
    if (!apply) {
      const run = await retention.completeDryRun(now);
      const exports = await TemporaryPiiExports.inventory(db, now, Boolean(process.env.RETENTION_EXPORT_DIRECTORY));
      console.log(JSON.stringify({ policyVersion: RETENTION_POLICY_VERSION, financialAccountingTimeZone: FINANCIAL_ACCOUNTING_TIME_ZONE,
        asOf: now.toISOString(), dryRun: true, complete: run.complete, receipts, sponsoredEvents,
        sources: run.sources, pages: run.pages, overdueHoldReviews: run.overdueHoldReviews,
        sourcesRequiringContinuation: run.sourcesRequiringContinuation, exports }));
      return;
    }
    const cursorPath = process.env.RETENTION_CURSOR_FILE;
    const cursors = cursorPath ? JSON.parse(await readFile(cursorPath, "utf8").catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return "{}"; throw error; })) as Record<string, string> : {};
    const run = await retention.run(now, apply, 100, cursors);
    if (cursorPath) await writeFile(cursorPath, JSON.stringify(run.nextCursors), { mode: 0o600 });
    const counts: Record<string, number> = {};
    for (const decision of run.decisions) counts[`${decision.model}:${decision.outcome}`] = (counts[`${decision.model}:${decision.outcome}`] ?? 0) + 1;
    const exports = process.env.RETENTION_EXPORT_DIRECTORY ? await new TemporaryPiiExports(db, process.env.RETENTION_EXPORT_DIRECTORY).cleanup(now, apply) : { status: "MANAGED_EXPORT_DIRECTORY_NOT_CONFIGURED" };
    console.log(JSON.stringify({ policyVersion: run.policyVersion, financialAccountingTimeZone: FINANCIAL_ACCOUNTING_TIME_ZONE, dryRun: !apply, receipts, sponsoredEvents, counts, overdueHoldReviews: run.overdueHoldReviews.length,
      sourcesRequiringContinuation: Object.keys(run.nextCursors), exports }));
  } finally { await db.onModuleDestroy(); }
}
void main().catch(() => { console.error("Retention job did not complete; inspect approved local evidence. No credentials or provider payloads are logged."); process.exitCode = 1; });
