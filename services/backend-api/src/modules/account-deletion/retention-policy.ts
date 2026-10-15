export const RETENTION_POLICY_VERSION = "KGO-RETENTION-2026-10-15";
export const DAY_MS = 86_400_000;

function validDate(date: Date) {
  if (!Number.isFinite(date.getTime())) throw new Error("A verified retention trigger is required.");
}

// Calendar months clamp at month end; adding milliseconds would mishandle leap years.
export function addMonths(date: Date, months: number) {
  validDate(date);
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}

export function financialExpiry(transactionAt: Date, yearEnd: { month: number; day: number }) {
  validDate(transactionAt);
  if (!Number.isInteger(yearEnd.month) || !Number.isInteger(yearEnd.day) || yearEnd.month < 1 || yearEnd.month > 12
    || yearEnd.day < 1 || yearEnd.day > new Date(Date.UTC(2001, yearEnd.month, 0)).getUTCDate()) {
    throw new Error("An approved recurring financial year-end is required.");
  }
  let year = transactionAt.getUTCFullYear();
  let endExclusive = new Date(Date.UTC(year, yearEnd.month - 1, yearEnd.day + 1));
  if (transactionAt >= endExclusive) endExclusive = new Date(Date.UTC(++year, yearEnd.month - 1, yearEnd.day + 1));
  return addMonths(endExclusive, 84);
}

export type RetentionCategory = "FINANCIAL" | "CASE" | "SECURITY" | "SUPPORT" | "EXPORT" | "DELETION_AUDIT";
export function retentionExpiry(category: RetentionCategory, trigger: Date, yearEnd?: { month: number; day: number }) {
  validDate(trigger);
  switch (category) {
    case "FINANCIAL":
      if (!yearEnd) throw new Error("Financial year-end has not been approved/configured.");
      return financialExpiry(trigger, yearEnd);
    case "CASE": case "DELETION_AUDIT": return addMonths(trigger, 84);
    case "SECURITY": case "SUPPORT": return addMonths(trigger, 24);
    case "EXPORT": return new Date(trigger.getTime() + 30 * DAY_MS);
    default: throw new Error("Unsupported retention category.");
  }
}

export function receiptExpired(request: { status: string; completedAt: Date | null }, now: Date) {
  validDate(now);
  // An incomplete request never expires just because its 30-day deadline passed.
  return request.status === "COMPLETED" && request.completedAt !== null
    && now.getTime() >= request.completedAt.getTime() + 90 * DAY_MS;
}

export interface ScopedHold {
  resourceType: string; resourceId: string; kind: string; startedAt: Date;
  expiresAt: Date | null; nextReviewAt: Date; releasedAt: Date | null;
}
export function holdActive(hold: ScopedHold, now: Date) {
  return hold.startedAt <= now && (!hold.releasedAt || hold.releasedAt > now)
    && (hold.kind !== "INTERNAL" || hold.expiresAt === null || hold.expiresAt > now);
}
export function isHeld(holds: ScopedHold[], resourceType: string, resourceId: string, now: Date) {
  return holds.some(h => h.resourceType === resourceType && h.resourceId === resourceId && holdActive(h, now));
}
