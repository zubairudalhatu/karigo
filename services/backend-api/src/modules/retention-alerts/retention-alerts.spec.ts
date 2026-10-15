import { generateKeyPairSync, sign } from "node:crypto";
import { RetentionAlertEngine } from "./retention-alerts.service";
import { AlertState, AlertStore } from "./alert-store";
import { DAY, freezeAlert, parseReport, retryDecision } from "./alert-policy";
import { GoogleWorkloadIdentity } from "./workload-identity";

const now = new Date("2026-10-15T14:00:00Z");
class MemoryStore implements AlertStore {
  state: AlertState = { startedAt: now.toISOString(), lastSuccessfulAt: null, lastReportAt: null, lastExecutionStartedAt: null, incidents: [], deliveries: [] };
  private queue: Promise<unknown> = Promise.resolve();
  private receipts = new Map<string, string>();
  edit<T>(fn: (s: AlertState) => T | Promise<T>): Promise<T> {
    const next = this.queue.then(() => fn(this.state)); this.queue = next.catch(() => undefined); return next;
  }
  report(id: string, hash: string, fn: (s: AlertState) => void) {
    return this.edit(s => { if (this.receipts.has(id)) { if (this.receipts.get(id) !== hash) throw new Error("REPORT_CONFLICT"); return false; }
      this.receipts.set(id, hash); fn(s); return true; });
  }
}
const report = (changes = {}) => ({ execution: "synthetic-execution-1", startedAt: now.toISOString(), success: true, overdue: 1, oldestOverdueHours: 721, failureCode: "NONE", ...changes });
const response = (body: object, status = 200) => ({ ok: status < 300, status, json: async () => body }) as Response;
describe("Retention primary alert safety", () => {
  it("persists only the normalized aggregate result and distinguishes fresh and missed heartbeats", async () => {
    const s = new MemoryStore(); const e = new RetentionAlertEngine(s, () => undefined);
    const input = report({ overdue: 0, oldestOverdueHours: 0 });
    await e.report(input, now);
    expect(s.state.lastResult).toEqual(input);
    expect(s.state.lastReportAt).toBe(now.toISOString());
    await e.watchdog(new Date(now.getTime() + 60 * 60_000));
    expect(s.state.incidents.some(i => i.type === "MISSED_RUN")).toBe(false);
    await e.watchdog(new Date(now.getTime() + 91 * 60_000));
    expect(s.state.incidents.some(i => i.type === "MISSED_RUN" && !i.resolvedAt)).toBe(true);
  });
  it("rejects unknown/private fields and unbounded input before persistence", () => {
    expect(() => parseReport(report({ customerName: "must-not-accept" }), now)).toThrow();
    expect(() => parseReport(report({ overdue: -1 }), now)).toThrow();
    expect(() => parseReport(report({ failureCode: "raw provider exception" }), now)).toThrow();
    expect(() => parseReport(report({ startedAt: new Date(now.getTime() - 3 * 3_600_000).toISOString() }), now)).toThrow();
  });
  it("freezes an allowlisted body with WAT/UTC and no arbitrary fields", () => {
    const p = freezeAlert("OVERDUE_EXPORT", now, 2, 721, null, "EXPORT_OVERDUE").payload;
    expect(p.from).toBe("no-reply@karigo.com.ng"); expect(p.to).toEqual(["meetup@karigo.com.ng"]);
    expect(p.text).toContain("15:00:00"); expect(p.text).toContain(now.toISOString());
    expect(p.text).not.toMatch(/customer|token|secret|temporary\/|bucket/i);
  });
  it("deduplicates concurrent reports and atomic send claims", async () => {
    const s = new MemoryStore(); const f = jest.fn().mockResolvedValue(response({ id: "provider-id" }));
    const e = new RetentionAlertEngine(s, () => "fixture-only", f, () => "live");
    expect(await Promise.all([e.report(report(), now), e.report(report(), now)])).toEqual([true, false]);
    await Promise.all([e.dispatch(now), e.dispatch(now)]);
    expect(f.mock.calls.filter(c => c[1]?.method === "POST")).toHaveLength(1);
    expect(s.state.deliveries).toHaveLength(1); expect(s.state.deliveries[0].providerId).toBe("provider-id");
  });
  it("acceptance is not delivery; marks delivered only after matching Resend evidence", async () => {
    const s = new MemoryStore(); const f = jest.fn().mockResolvedValue(response({ id: "provider-id" }));
    const e = new RetentionAlertEngine(s, () => "fixture-only", f, () => "live");
    await e.report(report(), now); await e.dispatch(now); expect(s.state.deliveries[0].state).toBe("ACCEPTED");
    const p = s.state.deliveries[0].payload;
    f.mockResolvedValue(response({ id: "provider-id", ...p, last_event: "delivered" }));
    await e.verifyDeliveries(new Date(now.getTime() + 60_000)); expect(s.state.deliveries[0].state).toBe("DELIVERED");
    await e.dispatch(now); expect(f.mock.calls.filter(c => c[1]?.method === "POST")).toHaveLength(1);
  });
  it("reuses the frozen payload and key for at most three transient attempts", async () => {
    const s = new MemoryStore(); const f = jest.fn().mockRejectedValue(new Error("must-not-leak"));
    const e = new RetentionAlertEngine(s, () => "fixture-only", f, () => "live");
    await e.report(report(), now);
    for (let n = 0; n < 6; n++) await e.dispatch(new Date(now.getTime() + n * 5 * 60_000));
    expect(f).toHaveBeenCalledTimes(3); expect(s.state.deliveries[0].state).toBe("REVIEW");
    expect(new Set(f.mock.calls.map(c => c[1].body)).size).toBe(1);
    expect(new Set(f.mock.calls.map(c => c[1].headers["Idempotency-Key"])).size).toBe(1);
    expect(JSON.stringify(s.state)).not.toContain("must-not-leak");
  });
  it("never retries after the idempotency safety horizon", async () => {
    const s = new MemoryStore(); const f = jest.fn().mockRejectedValue(new Error());
    const e = new RetentionAlertEngine(s, () => "fixture-only", f, () => "live");
    await e.report(report(), now); await e.dispatch(now); await e.dispatch(new Date(now.getTime() + DAY));
    expect(f).toHaveBeenCalledTimes(1); expect(s.state.deliveries[0].state).toBe("REVIEW");
    expect(retryDecision(1, now, new Date(now.getTime() + 23 * 3_600_000), false)).toBe(false);
  });
  it("recovers expired claims without duplicate unbounded sends", async () => {
    const s = new MemoryStore(); const e = new RetentionAlertEngine(s, () => "fixture-only", jest.fn(), () => "live");
    await e.report(report(), now); const d = s.state.deliveries[0];
    Object.assign(d, { state: "CLAIMED", firstAttemptAt: now.toISOString(), attempts: 1, leaseUntil: now.toISOString() });
    await e.dispatch(new Date(now.getTime() + DAY)); expect(d.state).toBe("REVIEW");
  });
  it("opens a missed-run incident even if controller never reports", async () => {
    const s = new MemoryStore(); const e = new RetentionAlertEngine(s, () => undefined);
    await e.watchdog(new Date(now.getTime() + 91 * 60_000));
    expect(s.state.incidents[0].type).toBe("MISSED_RUN");
    await e.watchdog(new Date(now.getTime() + 92 * 60_000)); expect(s.state.deliveries).toHaveLength(1);
  });
  it("bounds reminders across repeated errors and reopening by type", async () => {
    const s = new MemoryStore(); const e = new RetentionAlertEngine(s, () => undefined);
    await e.report(report(), now); s.state.deliveries[0].state = "DELIVERED";
    await e.report(report({ execution: "synthetic-execution-2", startedAt: new Date(now.getTime() + 60_000).toISOString(), overdue: 0 }), new Date(now.getTime() + 60_000));
    await e.report(report({ execution: "synthetic-execution-3", startedAt: new Date(now.getTime() + 120_000).toISOString() }), new Date(now.getTime() + 120_000));
    expect(s.state.deliveries).toHaveLength(1);
    await e.watchdog(new Date(now.getTime() + DAY + 1));
    expect(s.state.deliveries.filter(d => d.type === "OVERDUE_EXPORT")).toHaveLength(2);
  });
  it("permits one synthetic only, no automatic retry, and no live email in synthetic mode", async () => {
    const s = new MemoryStore(); const f = jest.fn().mockRejectedValue(new Error());
    const e = new RetentionAlertEngine(s, () => "fixture-only", f, () => "synthetic-only");
    await e.report(report(), now); await e.synthetic(now); await expect(e.synthetic(now)).rejects.toThrow("SYNTHETIC_ALREADY_PREPARED");
    await e.dispatch(now); await e.dispatch(new Date(now.getTime() + DAY));
    expect(f).toHaveBeenCalledTimes(1); expect(f.mock.calls[0][1].body).toContain("SYNTHETIC TEST — NO CUSTOMER DATA");
  });
  it("does not send while disabled or missing the existing credential", async () => {
    const s = new MemoryStore(); const f = jest.fn(); const e = new RetentionAlertEngine(s, () => undefined, f, () => "live");
    await e.report(report(), now); await e.dispatch(now); expect(f).not.toHaveBeenCalled();
  });
  it("does not retry definitive email authentication failure", async () => {
    const s = new MemoryStore(); const f = jest.fn().mockResolvedValue(response({}, 401));
    const e = new RetentionAlertEngine(s, () => "fixture", f, () => "live");
    await e.report(report(), now); await e.dispatch(now); await e.dispatch(new Date(now.getTime() + 60_000));
    expect(f).toHaveBeenCalledTimes(1); expect(s.state.deliveries[0].state).toBe("REJECTED");
  });
  it("does not mistake delivery to another mailbox for this alert", async () => {
    const s = new MemoryStore(); const f = jest.fn().mockResolvedValue(response({ id: "provider-id" }));
    const e = new RetentionAlertEngine(s, () => "fixture", f, () => "live");
    await e.report(report(), now); await e.dispatch(now);
    const p = s.state.deliveries[0].payload;
    f.mockResolvedValue(response({ id: "provider-id", ...p, to: ["other@example.test"], last_event: "delivered" }));
    await e.verifyDeliveries(new Date(now.getTime() + 60_000)); expect(s.state.deliveries[0].state).toBe("ACCEPTED");
    await e.verifyDeliveries(new Date(now.getTime() + DAY)); expect(s.state.deliveries[0].state).toBe("REVIEW");
    expect(f.mock.calls.filter(c => c[1]?.method === "POST")).toHaveLength(1);
  });
  it("rejects conflicting execution replays and ignores older run completions", async () => {
    const s = new MemoryStore(); const e = new RetentionAlertEngine(s, () => undefined);
    await e.report(report(), now); await expect(e.report(report({ overdue: 2 }), now)).rejects.toThrow("REPORT_CONFLICT");
    await e.report(report({ execution: "synthetic-execution-2", startedAt: new Date(now.getTime() - 1000).toISOString(), success: false, failureCode: "CONTROLLER_FAILED" }), now);
    expect(s.state.incidents.filter(i => i.type === "CONTROLLER_FAILURE")).toHaveLength(0);
  });
});

describe("Keyless workload identity", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "fixture" };
  const claims = { iss: "https://accounts.google.com", aud: "https://backend.test/report", email: "fixture@example.test", email_verified: true,
    sub: "12345", iat: now.getTime() / 1000, exp: now.getTime() / 1000 + 3600 };
  function token(changes = {}, wrongSignature = false) {
    const body = [Buffer.from(JSON.stringify({ alg: "RS256", kid: "fixture" })).toString("base64url"), Buffer.from(JSON.stringify({ ...claims, ...changes })).toString("base64url")].join(".");
    return `${body}.${wrongSignature ? Buffer.from("invalid").toString("base64url") : sign("RSA-SHA256", Buffer.from(body), privateKey).toString("base64url")}`;
  }
  it("accepts signed audience/email/subject-pinned tokens", async () => {
    const id = new GoogleWorkloadIdentity(jest.fn().mockResolvedValue(response({ keys: [jwk] })));
    expect(await id.authenticate(token(), claims.aud, claims.email, claims.sub, now.getTime())).toBe(true);
  });
  it.each([{ aud: "wrong" }, { email: "other@example.test" }, { sub: "999" }, { email_verified: false }, { exp: 0 }, { iss: "https://attacker.test" }])("rejects wrong claims %j", async changes => {
    const id = new GoogleWorkloadIdentity(jest.fn().mockResolvedValue(response({ keys: [jwk] })));
    await expect(id.authenticate(token(changes), claims.aud, claims.email, claims.sub, now.getTime())).rejects.toThrow("WORKLOAD_AUTH_FAILED");
  });
  it("rejects invalid signature and JWKS failures without leaking the token", async () => {
    const id = new GoogleWorkloadIdentity(jest.fn().mockResolvedValue(response({ keys: [jwk] })));
    await expect(id.authenticate(token({}, true), claims.aud, claims.email, claims.sub, now.getTime())).rejects.toThrow("WORKLOAD_AUTH_FAILED");
  });
});
