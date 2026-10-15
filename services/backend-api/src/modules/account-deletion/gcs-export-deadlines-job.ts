import { randomUUID } from "node:crypto";
import { enforceExportDeadlines, EXPORT_DEADLINE_OPERATIONS, GcsExportStorage } from "./gcs-export-deadlines";

const project = "mystical-method-475123-s9";
export async function metadataToken(fetcher: typeof fetch = fetch) {
  const r = await fetcher("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
    headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error("WORKLOAD_IDENTITY_UNAVAILABLE");
  const data = await r.json() as { access_token?: string };
  if (!data.access_token) throw new Error("WORKLOAD_IDENTITY_UNAVAILABLE");
  return data.access_token;
}
export async function runSyntheticExportJob(options: {
  token: () => Promise<string>; fetcher?: typeof fetch; now?: Date;
  log: (severity: "INFO" | "WARNING" | "ERROR", event: object) => Promise<void>;
}) {
  const runId = randomUUID();
  // Deliberately no production-prefix switch. A later approved release must
  // verify monitoring/audit delivery before adding real-export processing.
  const store = new GcsExportStorage(options.token, options.fetcher ?? fetch, "temporary/v1/synthetic-verification/");
  const result = await enforceExportDeadlines(store, {
    audit: fact => options.log("INFO", { kind: "export_disposal", runId, ...fact }),
    alert: summary => options.log(summary.failed || summary.overdue || summary.invalid || !summary.complete ? "ERROR" : "WARNING",
      { kind: "export_deadline_alert", runId, destination: EXPORT_DEADLINE_OPERATIONS.alertRecipient, ...summary })
  }, { now: options.now ?? new Date(), dispose: true });
  await options.log(result.failed || result.invalid || result.overdue || !result.complete ? "ERROR" : "INFO",
    { kind: "export_deadline_heartbeat", runId, syntheticOnly: true, ...result });
  return result;
}
export async function cloudLog(severity: "INFO" | "WARNING" | "ERROR", event: object) {
  const r = await fetch("https://logging.googleapis.com/v2/entries:write", { method: "POST",
    headers: { Authorization: `Bearer ${await metadataToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ logName: `projects/${project}/logs/karigo-retention-exports`, resource: { type: "global", labels: { project_id: project } },
      entries: [{ severity, timestamp: new Date().toISOString(), labels: { component: "karigo-export-deadlines", scope: "synthetic" }, jsonPayload: event }] }),
    signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error("DURABLE_EXPORT_AUDIT_UNAVAILABLE");
}
export async function reportToBackend(report: object, endpoint: string, fetcher: typeof fetch = fetch) {
  const target = new URL(endpoint);
  if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash
    || target.pathname !== "/api/v1/internal/retention-alerts/report") throw new Error("INVALID_REPORT_TARGET");
  const identity = await fetcher(`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?${new URLSearchParams({ audience: endpoint, format: "full" })}`,
    { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!identity.ok) throw new Error("REPORT_IDENTITY_UNAVAILABLE");
  const token = await identity.text();
  const response = await fetcher(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(report), signal: AbortSignal.timeout(15_000), redirect: "error" });
  if (!response.ok) throw new Error("REPORT_NOT_ACKNOWLEDGED");
}
export async function executeAndReport(endpoint: string, run = () => runSyntheticExportJob({ token: metadataToken, log: cloudLog }),
  report = reportToBackend, now = new Date()) {
  const execution = process.env.CLOUD_RUN_EXECUTION ?? randomUUID();
  let aggregate = { execution, startedAt: now.toISOString(), success: false, overdue: 0, oldestOverdueHours: 0, failureCode: "CONTROLLER_FAILED" };
  try {
    const r = await run();
    const success = !r.failed && !r.invalid && r.complete;
    aggregate = { execution, startedAt: now.toISOString(), success, overdue: r.overdue, oldestOverdueHours: r.oldestOverdueHours ?? 0,
      failureCode: success ? "NONE" : !r.complete ? "SCAN_INCOMPLETE" : "DISPOSAL_FAILED" };
  } catch { /* Only the fixed failure code is reported, never provider errors. */ }
  await report(aggregate, endpoint);
  return aggregate;
}
if (require.main === module) {
  void executeAndReport(process.env.RETENTION_REPORT_ENDPOINT ?? "").then(result => {
    if (!result.success || result.overdue) process.exitCode = 1;
  }).catch(() => { console.error(JSON.stringify({ severity: "ERROR", kind: "export_job_failed", syntheticOnly: true })); process.exitCode = 1; });
}
