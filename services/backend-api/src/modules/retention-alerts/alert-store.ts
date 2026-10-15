import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AlertPayload, AlertType, FailureCode } from "./alert-policy";

export type Incident = { id: string; type: AlertType; openedAt: string; resolvedAt: string | null;
  count?: number; age?: number | null; code?: FailureCode; observedAt?: string; synthetic?: boolean; notificationState?: string };
export type Delivery = { id: string; incidentId: string; type: AlertType; synthetic: boolean; key: string; payload: AlertPayload;
  createdAt: string; state: "READY" | "CLAIMED" | "ACCEPTED" | "DELIVERED" | "REVIEW" | "REJECTED" | "CANCELLED";
  attempts: number; firstAttemptAt?: string; nextAttemptAt?: string; leaseUntil?: string; claim?: string;
  providerId?: string; deliveredAt?: string; failureCode?: string; verificationAttempts?: number; nextVerifyAt?: string };
export type AlertState = { startedAt: string; lastReportAt: string | null; lastSuccessfulAt: string | null;
  lastExecutionStartedAt: string | null; incidents: Incident[]; deliveries: Delivery[] };
export interface AlertStore {
  edit<T>(fn: (s: AlertState) => T | Promise<T>): Promise<T>;
  report(execution: string, hash: string, fn: (s: AlertState) => void): Promise<boolean>;
}
export class DatabaseAlertStore implements AlertStore {
  constructor(private readonly db: PrismaClient, private readonly start: Date) {}
  private async locked<T>(tx: Prisma.TransactionClient, fn: (s: AlertState) => T | Promise<T>) {
    const initial: AlertState = { startedAt: this.start.toISOString(), lastReportAt: null, lastSuccessfulAt: null,
      lastExecutionStartedAt: null, incidents: [], deliveries: [] };
    await tx.$executeRaw`INSERT INTO "RetentionAlertState" ("id", "state", "updatedAt") VALUES ('export-primary-v1', ${JSON.stringify(initial)}::jsonb, NOW()) ON CONFLICT DO NOTHING`;
    const rows = await tx.$queryRaw<{ state: AlertState }[]>`SELECT "state" FROM "RetentionAlertState" WHERE "id"='export-primary-v1' FOR UPDATE`;
    const state = rows[0].state;
    const result = await fn(state);
    await tx.$executeRaw`UPDATE "RetentionAlertState" SET "state"=${JSON.stringify(state)}::jsonb, "updatedAt"=NOW() WHERE "id"='export-primary-v1'`;
    return result;
  }
  edit<T>(fn: (s: AlertState) => T | Promise<T>) {
    return this.db.$transaction(tx => this.locked(tx, fn));
  }
  report(execution: string, hash: string, fn: (s: AlertState) => void) {
    return this.db.$transaction(tx => this.locked(tx, async s => {
      const rows = await tx.$queryRaw<{ hash: string }[]>`SELECT "hash" FROM "RetentionAlertReport" WHERE "id"=${execution}`;
      if (rows.length) {
        if (rows[0].hash !== hash) throw new Error("REPORT_CONFLICT");
        return false;
      }
      await tx.$executeRaw`INSERT INTO "RetentionAlertReport" ("id", "hash", "createdAt") VALUES (${execution},${hash},NOW())`;
      fn(s);
      // Reports older than the accepted two-hour start-time window cannot be replayed.
      await tx.$executeRaw`DELETE FROM "RetentionAlertReport" WHERE "createdAt" < NOW() - INTERVAL '3 hours'`;
      return true;
    }));
  }
}

export function resolve(s: AlertState, type: AlertType, now: Date) {
  const active = s.incidents.find(i => i.type === type && !i.resolvedAt && !i.synthetic);
  if (!active) return;
  active.resolvedAt = now.toISOString();
  for (const d of s.deliveries) if (d.incidentId === active.id && d.state === "READY" && !d.firstAttemptAt) d.state = "CANCELLED";
}
export function activeIncident(s: AlertState, type: AlertType, now: Date) {
  let i = s.incidents.find(x => x.type === type && !x.resolvedAt && !x.synthetic);
  if (!i) { i = { id: randomUUID(), type, openedAt: now.toISOString(), resolvedAt: null }; s.incidents.push(i); }
  return i;
}
