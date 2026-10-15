import { createHash } from "node:crypto";

const DAY = 86_400_000;
export const EXPORT_BUCKET = "karigo-retention-exports-private";
export const EXPORT_PREFIX = "temporary/v1/";
// Approved destination, not evidence of tested delivery or an enabled scheduler.
export const EXPORT_DEADLINE_OPERATIONS = {
  scheduleUtc: "0 * * * *", alertRecipient: "meetup@karigo.com.ng",
  warnAfterDays: 28, disposeAfterDays: 29, maximumDays: 30, missedRunHours: 2
} as const;
export interface ExportObject {
  name: string; generation: string; metageneration: string; timeCreated: string;
  temporaryHold?: boolean; eventBasedHold?: boolean;
  retention?: { retainUntilTime?: string };
  retentionExpirationTime?: string;
}
export interface ExportStorage {
  list(cursor?: string): Promise<{ items: ExportObject[]; nextPageToken?: string }>;
  get(name: string): Promise<ExportObject | null>;
  remove(object: ExportObject): Promise<number>;
}
export class ExportHttpError extends Error {
  constructor(readonly status: number) { super(`EXPORT_STORAGE_HTTP_${status}`); }
}
// Token comes from an approved keyless workload identity. Never log it, HTTP
// bodies, names, cursor values or provider exception messages.
export class GcsExportStorage implements ExportStorage {
  constructor(private readonly token: () => Promise<string>, private readonly fetcher: typeof fetch = fetch,
    private readonly prefix: "temporary/v1/" | "temporary/v1/synthetic-verification/" = EXPORT_PREFIX) {}
  private target(name: string) {
    if (!name.startsWith(this.prefix) || name.endsWith("/")) throw new Error("INVALID_EXPORT_TARGET");
    return encodeURIComponent(name);
  }
  private async request(method: string, path: string) {
    return this.fetcher(`https://storage.googleapis.com/storage/v1/b/${EXPORT_BUCKET}/o${path}`, {
      method, headers: { Authorization: `Bearer ${await this.token()}` }, signal: AbortSignal.timeout(15_000)
    });
  }
  async list(cursor?: string) {
    const query = new URLSearchParams({ prefix: this.prefix, maxResults: "500",
      fields: "items(name,generation,metageneration,timeCreated,temporaryHold,eventBasedHold,retention,retentionExpirationTime),nextPageToken" });
    if (cursor) query.set("pageToken", cursor);
    const r = await this.request("GET", `?${query}`);
    if (!r.ok) throw new ExportHttpError(r.status);
    const body = await r.json() as { items?: ExportObject[]; nextPageToken?: string };
    return { items: body.items ?? [], nextPageToken: body.nextPageToken };
  }
  async get(name: string) {
    const r = await this.request("GET", `/${this.target(name)}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new ExportHttpError(r.status);
    return r.json() as Promise<ExportObject>;
  }
  async remove(object: ExportObject) {
    if (!/^\d+$/.test(object.generation) || !/^\d+$/.test(object.metageneration)) throw new Error("INVALID_EXPORT_PRECONDITION");
    const query = new URLSearchParams({ ifGenerationMatch: object.generation, ifMetagenerationMatch: object.metageneration });
    return (await this.request("DELETE", `/${this.target(object.name)}?${query}`)).status;
  }
}
export interface ExportDeadlineSummary {
  dryRun: boolean; complete: boolean; scanned: number; approaching: number; eligible: number;
  held: number; deleted: number; alreadyAbsent: number; failed: number; overdue: number; invalid: number;
  oldestOverdueHours?: number;
}
export interface ExportDeadlineEvidence {
  audit(fact: { objectHash: string; generation: string; result: "DELETED" | "ALREADY_ABSENT" }): Promise<void>;
  alert(summary: ExportDeadlineSummary): Promise<void>;
}
// No scheduler or Production entry point is enabled by importing this module.
export async function enforceExportDeadlines(storage: ExportStorage, evidence: ExportDeadlineEvidence,
  options: { now: Date; dispose?: boolean; sleep?: (ms: number) => Promise<void>; maxPages?: number }) {
  const now = options.now.getTime();
  if (!Number.isFinite(now)) throw new Error("INVALID_EXPORT_CLOCK");
  const summary: ExportDeadlineSummary = { dryRun: !options.dispose, complete: true, scanned: 0, approaching: 0,
    eligible: 0, held: 0, deleted: 0, alreadyAbsent: 0, failed: 0, overdue: 0, invalid: 0, oldestOverdueHours: 0 };
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  async function retry<T>(action: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await action(); } catch (error) {
        if (attempt >= 2 || !(error instanceof ExportHttpError) || (error.status !== 429 && error.status < 500)) throw error;
        await sleep(250 * 2 ** attempt);
      }
    }
  }
  function age(object: ExportObject) { return now - Date.parse(object.timeCreated); }
  function held(object: ExportObject) {
    const deadlines = [object.retention?.retainUntilTime, object.retentionExpirationTime].filter(Boolean) as string[];
    return object.temporaryHold || object.eventBasedHold || deadlines.some(x => !Number.isFinite(Date.parse(x)) || Date.parse(x) > now);
  }
  function valid(object: ExportObject) {
    return object.name.startsWith(EXPORT_PREFIX) && !object.name.endsWith("/") && /^\d+$/.test(object.generation)
      && /^\d+$/.test(object.metageneration) && Number.isFinite(age(object)) && age(object) >= 0;
  }
  let cursor: string | undefined;
  const seen = new Set<string>();
  try {
    for (let page = 0; ; page++) {
      if (page >= (options.maxPages ?? 1000)) { summary.complete = false; break; }
      const batch = await retry(() => storage.list(cursor));
      for (const listed of batch.items) {
        if (listed.name.endsWith("/")) continue;
        summary.scanned++;
        if (!valid(listed)) { summary.invalid++; continue; }
        if (age(listed) < EXPORT_DEADLINE_OPERATIONS.warnAfterDays * DAY) continue;
        if (age(listed) < EXPORT_DEADLINE_OPERATIONS.disposeAfterDays * DAY) { summary.approaching++; continue; }
        // Fresh hold/metadata check. Delete also uses both preconditions; GCS
        // atomically rejects an object held after this read.
        try {
          const current = await retry(() => storage.get(listed.name));
          if (!current) { summary.alreadyAbsent++; continue; }
          if (!valid(current) || current.name !== listed.name) { summary.invalid++; continue; }
          if (held(current)) { summary.held++; continue; }
          if (age(current) < EXPORT_DEADLINE_OPERATIONS.disposeAfterDays * DAY) continue;
          summary.eligible++;
          let disposed = false;
          if (options.dispose) {
            const status = await retry(async () => {
              const result = await storage.remove(current);
              if (result === 429 || result >= 500) throw new ExportHttpError(result);
              return result;
            });
            if (status === 204 || status === 404) {
              await evidence.audit({ objectHash: createHash("sha256").update(current.name).digest("hex"),
                generation: current.generation, result: status === 204 ? "DELETED" : "ALREADY_ABSENT" });
              if (status === 204) summary.deleted++; else summary.alreadyAbsent++;
              disposed = true;
            } else summary.failed++; // 403/412: do not retry a stale/held generation.
          }
          if (!disposed && age(current) >= EXPORT_DEADLINE_OPERATIONS.maximumDays * DAY) {
            summary.overdue++; summary.oldestOverdueHours = Math.max(summary.oldestOverdueHours ?? 0, age(current) / 3_600_000);
          }
        } catch {
          summary.failed++;
          if (age(listed) >= EXPORT_DEADLINE_OPERATIONS.maximumDays * DAY) {
            summary.overdue++; summary.oldestOverdueHours = Math.max(summary.oldestOverdueHours ?? 0, age(listed) / 3_600_000);
          }
        }
      }
      cursor = batch.nextPageToken;
      if (!cursor) break;
      if (seen.has(cursor)) { summary.complete = false; break; }
      seen.add(cursor);
    }
  } catch { summary.failed++; summary.complete = false; }
  // Delivery failure propagates to the scheduler: do not report healthy when
  // either disposal audit or alert custody is unavailable.
  if (summary.failed || summary.invalid || summary.overdue || summary.approaching || !summary.complete) await evidence.alert(summary);
  return summary;
}
