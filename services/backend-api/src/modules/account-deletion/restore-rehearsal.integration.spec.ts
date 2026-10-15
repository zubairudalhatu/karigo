import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CustomerErasureService } from "./customer-erasure.service";
import { DataRetentionService } from "./data-retention.service";
import { assertRestoreReplayGate, databaseIdentityHash, signRestoreManifest } from "./restore-deletion-replay";
import { RETENTION_POLICY_VERSION } from "./retention-policy";
import { PrismaService } from "../../prisma/prisma.service";

// Opt-in real pg_dump/pg_restore rehearsal. Never accepts a remote or Production target.
const url = process.env.KARIGO_RESTORE_TEST_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (target.hostname !== "127.0.0.1" || target.port !== "55439" || target.pathname !== "/karigo_retention_qa_20261015") throw new Error("Restore rehearsal requires the dedicated local synthetic database.");
}
const suite = url ? describe : describe.skip;
jest.setTimeout(120_000);
suite("Physical synthetic backup -> isolated restore -> authenticated deletion replay", () => {
  it("replays single/mixed-role deletion, scoped hold, expired receipt, financial facts and processor marker before operational use", async () => {
    const source = new PrismaClient({ datasourceUrl: url });
    const cloneName = `karigo_restore_qa_${randomUUID().replace(/-/g, "")}`;
    if (!/^karigo_restore_qa_[a-f0-9]{32}$/.test(cloneName)) throw new Error("Invalid local clone name.");
    const cloneUrl = new URL(url!); cloneUrl.pathname = `/${cloneName}`;
    const clone = new PrismaClient({ datasourceUrl: cloneUrl.toString() });
    const folder = await mkdtemp(join(tmpdir(), "karigo-synthetic-restore-"));
    const dump = join(folder, "synthetic.dump"), journal = join(folder, "synthetic-journal.json");
    const bin = process.env.KARIGO_TEST_PG_BIN ?? "";
    const pg = (name: string, args: string[]) => execFileSync(join(bin, process.platform === "win32" ? `${name}.exe` : name), args,
      { stdio: "pipe", timeout: 60_000, env: { ...process.env, PGHOST: "127.0.0.1", PGPORT: "55439", PGUSER: "postgres", PGPASSWORD: "", PGSSLMODE: "disable" } });
    const notice = { send: jest.fn(), assertConfigured: jest.fn(), verifyExisting: jest.fn() };
    const prior = { ...process.env };
    let cloneCreated = false;
    try {
      const admin = await source.user.create({ data: { role: "ADMIN", adminRole: "SUPER_ADMIN", fullName: "Synthetic restore operator", phoneNumber: `fixture:${randomUUID()}`, passwordHash: "fixture", accountStatus: "ACTIVE" } });
      process.env.RETENTION_LEGAL_AUTHORIZER_IDS = admin.id;
      const make = async (mixed: boolean) => {
        const tag = randomUUID();
        const user = await source.user.create({ data: { role: mixed ? "RIDER" : "CUSTOMER", fullName: "Synthetic old identity", phoneNumber: `fixture:${tag}`, email: `${tag}@example.invalid`, passwordHash: "fixture",
          accountStatus: "ACTIVE", customerProfile: { create: { referralCode: tag } }, ...(mixed ? { rider: { create: { riderCode: tag, phoneNumber: "fixture-only" } } } : {}) }, include: { customerProfile: true } });
        const customerId = user.customerProfile!.id;
        const wallet = await source.customerWallet.create({ data: { customerId } });
        const ledger = await source.customerWalletLedgerEntry.create({ data: { walletId: wallet.id, customerId, entryType: "SERVICE_PAYMENT", direction: "DEBIT", amount: 1000, balanceBefore: 1000, balanceAfter: 0, reference: `fixture:${tag}` } });
        const provider = await source.utilityProvider.create({ data: { type: "ELECTRICITY", name: "Synthetic", code: `fixture:${tag}` } });
        const utility = await source.utilityTransaction.create({ data: { customerId, providerId: provider.id, reference: `fixture:${tag}`, serviceType: "ELECTRICITY", amountKobo: 100000, totalKobo: 100000,
          recipient: "fixture-meter", mockToken: "fixture-token", status: "SUCCESSFUL", providerReference: `fixture-provider:${tag}` } });
        await source.address.create({ data: { userId: user.id, label: "Synthetic", addressLine: "Synthetic", city: "Abuja", state: "FCT" } });
        const completedAt = new Date(Date.now() - 100 * 86_400_000);
        const requestReference = `ADR-${randomUUID().toUpperCase()}`;
        await source.accountDeletionRequest.create({ data: { userId: user.id, accountType: "CUSTOMER", requestReference, status: "PROCESSING", erasureVersion: 1,
          sharedIdentityRetained: mixed, externalCleanupEvidence: "SYNTHETIC-PROCESSOR-UNLINK", noticeSentAt: completedAt, receiptTokenHash: randomUUID() } });
        if (mixed) await new DataRetentionService(source as unknown as PrismaService).createHold({ actorId: admin.id, authorityReference: "SYNTHETIC-RESTORE-HOLD", resourceType: "UtilityTransaction", resourceId: utility.id, kind: "COURT", reasonCode: "SYNTHETIC-CASE" });
        return { user, wallet, ledger, utility, tombstone: { userId: user.id, customerId, requestReference, completedAt: completedAt.toISOString(), sharedIdentityRetained: mixed } };
      };
      const fixtures = [await make(false), await make(true)];
      // Snapshot contains the pre-cleanup identities. Journal remains outside that snapshot.
      pg("pg_dump", ["-w", "-Fc", "--no-owner", "--no-acl", "-f", dump, "karigo_retention_qa_20261015"]);
      process.env.RESTORE_ISOLATED = "true";
      const sourceErasure = new CustomerErasureService(source as unknown as PrismaService, notice as never);
      for (const fixture of fixtures) await sourceErasure.replayTombstone(fixture.tombstone);
      pg("createdb", ["-w", cloneName]); cloneCreated = true;
      pg("pg_restore", ["-w", "--no-owner", "--no-acl", "-d", cloneName, dump]);
      for (const fixture of fixtures) expect((await clone.user.findUniqueOrThrow({ where: { id: fixture.user.id } })).email).toBe(fixture.user.email);
      const key = "synthetic-rehearsal-only-not-an-operational-signing-key";
      const instanceId = randomUUID(), coverage = new Date().toISOString();
      await writeFile(journal, JSON.stringify(signRestoreManifest({ policyVersion: RETENTION_POLICY_VERSION, restoreInstanceId: instanceId,
        databaseIdentityHash: databaseIdentityHash(cloneUrl.toString()), coveredThrough: coverage, tombstones: fixtures.map(f => f.tombstone) }, key)), { mode: 0o600 });
      process.env.DATABASE_URL = cloneUrl.toString(); process.env.RESTORE_INSTANCE_ID = instanceId; process.env.RESTORE_REQUIRED_COVERAGE = coverage;
      delete process.env.RESTORE_DELETION_MANIFEST_FILE; delete process.env.RESTORE_DELETION_MANIFEST_KEY;
      const erasure = new CustomerErasureService(clone as unknown as PrismaService, notice as never);
      await expect(assertRestoreReplayGate(item => erasure.replayTombstone(item))).rejects.toThrow("Restore remains isolated");
      process.env.RESTORE_DELETION_MANIFEST_FILE = journal; process.env.RESTORE_DELETION_MANIFEST_KEY = key;
      await assertRestoreReplayGate(item => erasure.replayTombstone(item));
      await assertRestoreReplayGate(item => erasure.replayTombstone(item));
      for (const f of fixtures) {
        const restored = await clone.user.findUniqueOrThrow({ where: { id: f.user.id } });
        expect(restored.customerAccessDeletedAt).not.toBeNull();
        if (!f.tombstone.sharedIdentityRetained) { expect(restored.email).toBeNull(); expect(restored.passwordHash).toBe(""); }
        else { expect(restored.email).toBe(f.user.email); expect(restored.accountStatus).toBe("ACTIVE"); }
        expect(await clone.address.count({ where: { userId: f.user.id } })).toBe(0);
        const request = await clone.accountDeletionRequest.findUniqueOrThrow({ where: { requestReference: f.tombstone.requestReference } });
        expect(request.status).toBe("COMPLETED"); expect(request.receiptTokenHash).toBeNull(); expect(request.externalCleanupEvidence).toBe("SYNTHETIC-PROCESSOR-UNLINK");
        expect((await clone.customerWalletLedgerEntry.findUniqueOrThrow({ where: { id: f.ledger.id } })).amount.toString()).toBe("1000");
        expect((await clone.customerWallet.findUniqueOrThrow({ where: { id: f.wallet.id } })).availableBalance.toString()).toBe("0");
        const utility = await clone.utilityTransaction.findUniqueOrThrow({ where: { id: f.utility.id } });
        expect(utility.mockToken).toBe(f.tombstone.sharedIdentityRetained ? "fixture-token" : null);
        expect(utility.providerReference).toBe(f.utility.providerReference);
      }
      expect(notice.send).not.toHaveBeenCalled();
    } finally {
      await source.$disconnect(); await clone.$disconnect();
      if (cloneCreated) pg("dropdb", ["-w", cloneName]);
      await unlink(dump).catch(() => undefined); await unlink(journal).catch(() => undefined); await rmdir(folder).catch(() => undefined);
      for (const name of ["DATABASE_URL", "RESTORE_ISOLATED", "RETENTION_LEGAL_AUTHORIZER_IDS", "RESTORE_INSTANCE_ID", "RESTORE_REQUIRED_COVERAGE", "RESTORE_DELETION_MANIFEST_FILE", "RESTORE_DELETION_MANIFEST_KEY"]) {
        if (prior[name] === undefined) delete process.env[name]; else process.env[name] = prior[name];
      }
    }
  });
});
