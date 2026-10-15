import { lstat, mkdir, realpath, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { isHeld, retentionExpiry, RETENTION_POLICY_VERSION } from "./retention-policy";

// Only exports made through this manager are eligible; never scan or erase arbitrary files.
export class TemporaryPiiExports {
  constructor(private readonly prisma: PrismaService, private readonly directory: string) {}
  async create(content: Uint8Array, now = new Date()) {
    if (!this.directory || !Number.isFinite(now.getTime())) throw new Error("A controlled export directory is required.");
    await mkdir(this.directory, { recursive: true });
    const root = await realpath(this.directory);
    const id = randomUUID();
    // Register before writing: a failed write remains eligible for idempotent cleanup.
    const record = await this.prisma.dataRetentionResource.create({ data: { resourceType: "TemporaryExport", resourceId: id, category: "EXPORT",
      triggerAt: now, retainUntil: retentionExpiry("EXPORT", now), policyVersion: RETENTION_POLICY_VERSION } });
    await writeFile(join(root, `${id}.bin`), content, { flag: "wx", mode: 0o600 });
    return { id: record.id, expiresAt: record.retainUntil };
  }
  async cleanup(now = new Date(), apply = false) {
    const root = await realpath(this.directory);
    if (root !== resolve(this.directory)) throw new Error("Export root must not be a symbolic link.");
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('karigo-retention-governance'))::text AS lock`;
      const records = await tx.dataRetentionResource.findMany({ where: { resourceType: "TemporaryExport", category: "EXPORT", disposedAt: null, retainUntil: { lte: now } }, take: 500 });
      const holds = await tx.dataRetentionHold.findMany();
      let eligible = 0, disposed = 0;
      for (const record of records) {
        if (!/^[a-f0-9-]{36}$/i.test(record.resourceId) || isHeld(holds, "DataRetentionResource", record.id, now)) continue;
        const file = join(root, `${record.resourceId}.bin`);
        let exists = true;
        try { if (!(await lstat(file)).isFile() || (await realpath(file)) !== file) throw new Error("Export target is not a regular controlled file."); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") exists = false; else throw error; }
        eligible++;
        if (apply) {
          if (exists) await unlink(file);
          await tx.dataRetentionResource.update({ where: { id: record.id }, data: { disposedAt: now } });
          disposed++;
        }
      }
      return { eligible, disposed, dryRun: !apply };
    }, { timeout: 60_000 });
  }
}
