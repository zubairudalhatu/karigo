import { lstat, mkdir, realpath, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { holdActive, isHeld, retentionExpiry, RETENTION_POLICY_VERSION } from "./retention-policy";

// Only exports made through this manager are eligible; never scan or erase arbitrary files.
export class TemporaryPiiExports {
  constructor(private readonly prisma: PrismaService, private readonly directory: string) {}
  private binding(root: string) { return `EXPORT-ROOT-SHA256:${createHash("sha256").update(root).digest("hex")}`; }

  // Registry-wide inventory works even when storage is not configured. Zero
  // registered objects is not proof that operator downloads/archives do not exist.
  static async inventory(prisma: PrismaService, now = new Date(), directoryConfigured = false) {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('karigo-retention-governance'))::text AS lock`;
      const where = { resourceType: "TemporaryExport", category: "EXPORT", disposedAt: null };
      const due = { ...where, retainUntil: { lte: now } };
      const holds = await tx.dataRetentionHold.findMany();
      const heldIds = holds.filter(h => h.resourceType === "DataRetentionResource" && holdActive(h, now)).map(h => h.resourceId);
      const [registered, dueCount, held, eligible] = await Promise.all([
        tx.dataRetentionResource.count({ where }), tx.dataRetentionResource.count({ where: due }),
        tx.dataRetentionResource.count({ where: { ...due, id: { in: heldIds } } }),
        tx.dataRetentionResource.count({ where: { ...due, id: { notIn: heldIds } } })
      ]);
      return { dryRun: true, complete: true, directoryConfigured, registered, due: dueCount, eligible, held,
        status: directoryConfigured ? "REGISTERED_EXPORT_INVENTORY" : "MANAGED_EXPORT_DIRECTORY_NOT_CONFIGURED",
        unmanagedDownloadsVerified: false };
    }, { timeout: 60_000 });
  }

  async create(content: Uint8Array, now = new Date()) {
    if (!isAbsolute(this.directory) || !Number.isFinite(now.getTime())) throw new Error("An absolute controlled export directory is required.");
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const root = await realpath(this.directory);
    if (root !== resolve(this.directory)) throw new Error("Export root must not be a symbolic link.");
    const id = randomUUID();
    // Register before writing: a failed write remains eligible for idempotent cleanup.
    const record = await this.prisma.dataRetentionResource.create({ data: { resourceType: "TemporaryExport", resourceId: id, category: "EXPORT",
      triggerAt: now, retainUntil: retentionExpiry("EXPORT", now), policyVersion: RETENTION_POLICY_VERSION,
      evidenceReference: this.binding(root) } });
    await writeFile(join(root, `${id}.bin`), content, { flag: "wx", mode: 0o600 });
    return { id: record.id, expiresAt: record.retainUntil };
  }
  async cleanup(now = new Date(), apply = false) {
    const root = await realpath(this.directory);
    if (root !== resolve(this.directory)) throw new Error("Export root must not be a symbolic link.");
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('karigo-retention-governance'))::text AS lock`;
      const records = await tx.dataRetentionResource.findMany({ where: { resourceType: "TemporaryExport", category: "EXPORT", disposedAt: null, retainUntil: { lte: now } }, orderBy: { id: "asc" }, take: 501 });
      const holds = await tx.dataRetentionHold.findMany();
      let eligible = 0, disposed = 0, held = 0, reviewRequired = 0;
      for (const record of records.slice(0, 500)) {
        if (isHeld(holds, "DataRetentionResource", record.id, now)) { held++; continue; }
        if (!/^[a-f0-9-]{36}$/i.test(record.resourceId) || record.evidenceReference !== this.binding(root)) { reviewRequired++; continue; }
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
      // disposedAt on the durable registry is the idempotent, non-PII audit.
      // Filesystem unlink removes the object; it does not certify physical-media
      // overwriting or independent backup disposal.
      return { eligible, disposed, held, reviewRequired, dryRun: !apply, complete: records.length <= 500 };
    }, { timeout: 60_000 });
  }
}
