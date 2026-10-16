import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaService } from "../../prisma/prisma.service";

export const READINESS_MIGRATIONS = Symbol("READINESS_MIGRATIONS");
export type ReadinessManifest = ReadonlyMap<string, string>;
type MigrationRow = { migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null };
export const READINESS_TIMEOUT_MS = 2000;

// Read shipped SQL once. A missing/empty manifest fails readiness, not liveness.
export function readinessManifest(): ReadinessManifest | null {
  try {
    const directory = [resolve(process.cwd(), "prisma/migrations"),
      resolve(process.cwd(), "services/backend-api/prisma/migrations")]
      .find(path => existsSync(path));
    if (!directory) return null;
    const entries = readdirSync(directory, { withFileTypes: true }).filter(e => e.isDirectory());
    if (!entries.length) return null;
    return new Map(entries.map(entry => [entry.name, createHash("sha256")
      .update(readFileSync(resolve(directory, entry.name, "migration.sql"))).digest("hex")]));
  } catch { return null; }
}

@Injectable()
export class ReadinessService {
  private pending?: Promise<boolean>;
  constructor(private readonly db: PrismaService,
    @Inject(READINESS_MIGRATIONS) private readonly expected: ReadinessManifest | null) {}

  async ready(): Promise<boolean> {
    if (!this.expected?.size) return false;
    // Coalesce simultaneous probes. A timed-out transport does not spawn more
    // background queries until the original bounded transaction settles.
    if (!this.pending) {
      const probe = this.checkDatabase().then(() => true, () => false);
      this.pending = probe;
      void probe.finally(() => { if (this.pending === probe) this.pending = undefined; });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([this.pending, new Promise<boolean>(resolve => {
        timer = setTimeout(() => resolve(false), READINESS_TIMEOUT_MS);
      })]);
    } finally { clearTimeout(timer); }
  }

  private async checkDatabase(): Promise<void> {
    await this.db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '750ms'`;
      await tx.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
      const rows = await tx.$queryRaw<MigrationRow[]>`
        SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations`;
      const completed = new Map<string, string>();
      for (const row of rows) {
        if (row.rolled_back_at) continue;
        if (!row.finished_at || completed.has(row.migration_name)) throw new Error("NOT_READY");
        completed.set(row.migration_name, row.checksum);
      }
      if (completed.size !== this.expected!.size || [...this.expected!]
        .some(([name, checksum]) => completed.get(name) !== checksum)) throw new Error("NOT_READY");
      // Parse/probe critical column shapes without scanning or returning any
      // Customer rows. Missing relations/columns fail even if a ledger was edited.
      await tx.$queryRaw`
        SELECT u.id, u."phoneNumber", u.role, u."adminRole", u."accountStatus",
          i."userId", i."emailKey", i."credentialVersion",
          c."tokenHash", c."expiresAt", a.event, a.facts, s.payload, s.revision
        FROM users u, admin_email_identities i, admin_email_challenges c,
          governance_security_events a, governance_control_state s
        LIMIT 0`;
    }, { maxWait: 500, timeout: 1500 });
  }
}
