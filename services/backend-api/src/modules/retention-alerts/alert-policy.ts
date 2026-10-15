import { randomUUID } from "node:crypto";

export const DAY = 86_400_000;
export const TYPES = ["OVERDUE_EXPORT", "MISSED_RUN", "CONTROLLER_FAILURE"] as const;
export type AlertType = typeof TYPES[number];
export const RECIPIENT = "meetup@karigo.com.ng";
export const SENDER = "no-reply@karigo.com.ng";
export const CODES = ["NONE", "EXPORT_OVERDUE", "HEARTBEAT_STALE", "SCAN_INCOMPLETE", "DISPOSAL_FAILED", "CONTROLLER_FAILED"] as const;
export type FailureCode = typeof CODES[number];
export type Report = { execution: string; startedAt: string; success: boolean; overdue: number; oldestOverdueHours: number; failureCode: FailureCode };
export function parseReport(input: unknown, now = new Date()): Report {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_REPORT");
  const r = input as Record<string, unknown>;
  const keys = ["execution", "startedAt", "success", "overdue", "oldestOverdueHours", "failureCode"];
  if (Object.keys(r).length !== keys.length || Object.keys(r).some(k => !keys.includes(k))
    || typeof r.execution !== "string" || !/^[a-zA-Z0-9-]{8,100}$/.test(r.execution)
    || typeof r.startedAt !== "string" || !Number.isFinite(Date.parse(r.startedAt))
    || Date.parse(r.startedAt) > now.getTime() + 30_000 || Date.parse(r.startedAt) < now.getTime() - 2 * 3_600_000
    || typeof r.success !== "boolean" || !Number.isSafeInteger(r.overdue) || Number(r.overdue) < 0 || Number(r.overdue) > 1_000_000
    || typeof r.oldestOverdueHours !== "number" || !Number.isFinite(r.oldestOverdueHours) || r.oldestOverdueHours < 0 || r.oldestOverdueHours > 1_000_000
    || !CODES.includes(r.failureCode as FailureCode)
    || (r.success && r.failureCode !== "NONE") || (!r.success && r.failureCode === "NONE")) throw new Error("INVALID_REPORT");
  return r as Report;
}
export type AlertPayload = { from: string; to: string[]; subject: string; text: string };
export function freezeAlert(type: AlertType, now: Date, count: number, age: number | null, lastSuccess: Date | null,
  code: FailureCode, synthetic = false, id: string = randomUUID()): { id: string; payload: AlertPayload } {
  const action = type === "OVERDUE_EXPORT" ? "Inspect deadline controller and approved holds; dispose only through the governed export runbook."
    : type === "MISSED_RUN" ? "Inspect scheduler and last controller execution; do not run broad retention cleanup."
    : "Inspect controller health using sanitized operational evidence; do not run broad retention cleanup.";
  return { id, payload: { from: SENDER, to: [RECIPIENT],
    subject: `${synthetic ? "SYNTHETIC TEST — NO CUSTOMER DATA" : "[KariGO Retention][PRODUCTION]"} ${type}`,
    text: [`Alert type: ${type}`, `Incident: ${id}`, `Detected UTC: ${now.toISOString()}`,
      `Detected WAT: ${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "short", timeStyle: "long" }).format(now)}`,
      `Aggregate count: ${count}`, age === null ? `Last successful run UTC: ${lastSuccess?.toISOString() ?? "NONE_RECORDED"}` : `Oldest overdue age (hours): ${age}`,
      `Failure code: ${code}`, `Action: ${action}`, "Runbook: KGO-EXPORT-ALERTS-v1"].join("\n") } };
}
export function retryDecision(attempts: number, firstAttempt: Date, now: Date, synthetic: boolean) {
  // Stop well inside Resend's 24-hour idempotency lifetime. Unknown outcomes require operator reconciliation.
  return !synthetic && attempts < 3 && now.getTime() - firstAttempt.getTime() < 23 * 3_600_000;
}
