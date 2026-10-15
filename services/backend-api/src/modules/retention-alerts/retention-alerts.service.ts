import { Injectable, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertState, AlertStore, DatabaseAlertStore, Delivery, activeIncident, resolve } from "./alert-store";
import { AlertType, DAY, FailureCode, freezeAlert, parseReport, retryDecision, SENDER, RECIPIENT } from "./alert-policy";

export class RetentionAlertEngine {
  constructor(private readonly store: AlertStore, private readonly key: () => string | undefined,
    private readonly fetcher: typeof fetch = fetch, private readonly mode: () => string = () => "off") {}

  private signal(s: AlertState, type: AlertType, now: Date, count: number, age: number | null, code: FailureCode) {
    const i = activeIncident(s, type, now);
    Object.assign(i, { count, age, code, observedAt: now.toISOString() });
    const previous = s.deliveries.filter(d => d.type === type && !d.synthetic).at(-1);
    // Across incident reopenings too: no more than one opening/reminder per type per rolling 24 hours.
    if (previous && now.getTime() - Date.parse(previous.createdAt) < DAY) return;
    // An unresolved ambiguous send must be reconciled before creating another notification for this type.
    if (s.deliveries.some(d => d.type === type && !d.synthetic && ["READY", "CLAIMED", "REVIEW", "ACCEPTED"].includes(d.state))) return;
    const frozen = freezeAlert(type, now, count, age, s.lastSuccessfulAt ? new Date(s.lastSuccessfulAt) : null, code, false, i.id);
    s.deliveries.push({ id: randomUUID(), incidentId: i.id, type, synthetic: false,
      key: `retention-v1/${i.id}/${now.getTime()}`, payload: frozen.payload, createdAt: now.toISOString(), state: "READY", attempts: 0 });
  }
  async report(input: unknown, now = new Date()) {
    const report = parseReport(input, now);
    const hash = createHash("sha256").update(JSON.stringify(report)).digest("hex");
    return this.store.report(report.execution, hash, s => {
      if (s.lastExecutionStartedAt && Date.parse(report.startedAt) <= Date.parse(s.lastExecutionStartedAt)) return;
      s.lastExecutionStartedAt = report.startedAt; s.lastReportAt = now.toISOString();
      if (report.success) {
        s.lastSuccessfulAt = now.toISOString(); resolve(s, "CONTROLLER_FAILURE", now); resolve(s, "MISSED_RUN", now);
      } else this.signal(s, "CONTROLLER_FAILURE", now, 1, null, report.failureCode);
      if (report.overdue) this.signal(s, "OVERDUE_EXPORT", now, report.overdue, report.oldestOverdueHours, "EXPORT_OVERDUE");
      else resolve(s, "OVERDUE_EXPORT", now);
    });
  }
  async watchdog(now = new Date()) {
    await this.store.edit(s => {
      const last = s.lastSuccessfulAt ?? s.startedAt;
      if (now.getTime() - Date.parse(last) > 90 * 60_000) this.signal(s, "MISSED_RUN", now, 1, null, "HEARTBEAT_STALE");
      // Remind only for still-open incidents; payload never includes arbitrary report content.
      for (const i of s.incidents.filter(x => !x.resolvedAt && !x.synthetic && x.type !== "MISSED_RUN")) {
        this.signal(s, i.type, now, i.count ?? 1,
          i.age == null ? null : i.age + (now.getTime() - Date.parse(i.observedAt ?? i.openedAt)) / 3_600_000,
          i.code ?? "CONTROLLER_FAILED");
      }
    });
  }
  async synthetic(now = new Date()) {
    if (this.mode() !== "synthetic-only") throw new Error("SYNTHETIC_GATE_CLOSED");
    return this.store.edit(s => {
      if (s.deliveries.some(d => d.synthetic)) throw new Error("SYNTHETIC_ALREADY_PREPARED");
      const frozen = freezeAlert("CONTROLLER_FAILURE", now, 0, null, null, "CONTROLLER_FAILED", true);
      s.incidents.push({ id: frozen.id, type: "CONTROLLER_FAILURE", openedAt: now.toISOString(), resolvedAt: null, synthetic: true, notificationState: "READY" });
      s.deliveries.push({ id: frozen.id, incidentId: frozen.id, type: "CONTROLLER_FAILURE", synthetic: true,
        key: `retention-synthetic-v1/${frozen.id}`, payload: frozen.payload, createdAt: now.toISOString(), state: "READY", attempts: 0 });
      return frozen.id;
    });
  }
  async dispatch(now = new Date()) {
    if (!["live", "synthetic-only"].includes(this.mode()) || !this.key()) return;
    const claimed = await this.store.edit(s => {
      for (const d of s.deliveries) {
        if (d.state === "CLAIMED" && Date.parse(d.leaseUntil!) <= now.getTime()) {
          d.state = retryDecision(d.attempts, new Date(d.firstAttemptAt!), now, d.synthetic) ? "READY" : "REVIEW";
        }
        if (d.state !== "READY" || (this.mode() === "synthetic-only" && !d.synthetic) || (this.mode() === "live" && d.synthetic)
          || (d.nextAttemptAt && Date.parse(d.nextAttemptAt) > now.getTime())) continue;
        if (d.firstAttemptAt && !retryDecision(d.attempts, new Date(d.firstAttemptAt), now, d.synthetic)) { d.state = "REVIEW"; continue; }
        d.state = "CLAIMED"; d.claim = randomUUID(); d.leaseUntil = new Date(now.getTime() + 60_000).toISOString();
        d.firstAttemptAt ??= now.toISOString(); d.attempts++;
        return structuredClone(d);
      }
      return null;
    });
    if (claimed) await this.send(claimed, now);
    await this.verifyDeliveries(now);
  }
  private async send(d: Delivery, now: Date) {
    let outcome: "ACCEPTED" | "REJECTED" | "READY" | "REVIEW" = "REVIEW";
    let providerId: string | undefined;
    try {
      const r = await this.fetcher("https://api.resend.com/emails", { method: "POST", redirect: "error",
        headers: { Authorization: `Bearer ${this.key()}`, "Content-Type": "application/json", "Idempotency-Key": d.key },
        body: JSON.stringify(d.payload), signal: AbortSignal.timeout(10_000) });
      const b = await r.json().catch(() => ({})) as { id?: unknown };
      if (r.ok && typeof b.id === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(b.id)) { outcome = "ACCEPTED"; providerId = b.id; }
      else if (r.status >= 400 && r.status < 500 && ![408, 409, 429].includes(r.status)) outcome = "REJECTED";
      else outcome = retryDecision(d.attempts, new Date(d.firstAttemptAt!), now, d.synthetic) ? "READY" : "REVIEW";
    } catch { outcome = retryDecision(d.attempts, new Date(d.firstAttemptAt!), now, d.synthetic) ? "READY" : "REVIEW"; }
    await this.store.edit(s => {
      const current = s.deliveries.find(x => x.id === d.id);
      if (!current || current.claim !== d.claim || current.state !== "CLAIMED") return;
      current.state = outcome; current.providerId = providerId;
      const incident = s.incidents.find(i => i.id === d.incidentId);
      if (incident) incident.notificationState = outcome;
      current.nextAttemptAt = new Date(now.getTime() + d.attempts * 60_000).toISOString();
      if (outcome === "REJECTED") current.failureCode = "EMAIL_REJECTED";
      if (outcome === "REVIEW") current.failureCode = "EMAIL_RECONCILIATION_REQUIRED";
    });
  }
  async verifyDeliveries(now = new Date()) {
    const pending = await this.store.edit(s => {
      const selected: Delivery[] = [];
      for (const d of s.deliveries) {
        if (d.state !== "ACCEPTED") continue;
        if ((d.verificationAttempts ?? 0) >= 48 || now.getTime() - Date.parse(d.firstAttemptAt!) >= DAY) {
          d.state = "REVIEW"; d.failureCode = "EMAIL_DELIVERY_REVIEW_REQUIRED"; continue;
        }
        if (selected.length >= 10 || (d.nextVerifyAt && Date.parse(d.nextVerifyAt) > now.getTime())) continue;
        d.verificationAttempts = (d.verificationAttempts ?? 0) + 1;
        d.nextVerifyAt = new Date(now.getTime() + (d.verificationAttempts <= 10 ? 60_000 : 30 * 60_000)).toISOString();
        selected.push(structuredClone(d));
      }
      return selected;
    });
    for (const d of pending) {
      try {
        const r = await this.fetcher(`https://api.resend.com/emails/${encodeURIComponent(d.providerId!)}`, {
          headers: { Authorization: `Bearer ${this.key()}` }, redirect: "error", signal: AbortSignal.timeout(10_000) });
        if (!r.ok) continue;
        const b = await r.json() as { id?: string; from?: string; to?: string[]; subject?: string; last_event?: string };
        if (b.id !== d.providerId || b.from !== SENDER || b.to?.length !== 1 || b.to[0] !== RECIPIENT || b.subject !== d.payload.subject) continue;
        await this.store.edit(s => {
          const current = s.deliveries.find(x => x.id === d.id);
          if (!current || current.state !== "ACCEPTED") return;
          const incident = s.incidents.find(i => i.id === d.incidentId);
          if (b.last_event === "delivered") {
            current.state = "DELIVERED"; current.deliveredAt = now.toISOString();
            if (incident) incident.notificationState = "DELIVERED";
          }
          if (["bounced", "failed", "suppressed", "complained"].includes(b.last_event ?? "")) {
            current.state = "REJECTED"; current.failureCode = "EMAIL_DELIVERY_FAILED";
            if (incident) incident.notificationState = "REJECTED";
          }
        });
      } catch { /* Read-only reconciliation may repeat; never resend an accepted email. */ }
    }
  }
}

@Injectable()
export class RetentionAlertsService implements OnModuleInit, OnModuleDestroy {
  readonly engine: RetentionAlertEngine;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(db: PrismaService, private readonly config: ConfigService) {
    this.engine = new RetentionAlertEngine(new DatabaseAlertStore(db, new Date()), () => this.config.get<string>("RESEND_API_KEY"), fetch,
      () => this.config.get<string>("RETENTION_ALERT_EMAIL_MODE", "off"));
  }
  onModuleInit() {
    if (this.config.get<string>("RETENTION_ALERTS_ENABLED") !== "true") return;
    // Separate backend watchdog; does not depend on Cloud Scheduler, LogMatch, or the retention worker.
    this.timer = setInterval(() => { void this.tick(); }, 60_000); this.timer.unref();
    void this.tick();
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try { await this.engine.watchdog(); await this.engine.dispatch(); }
    catch { console.error("RETENTION_ALERT_CONTROL_UNAVAILABLE"); }
    finally { this.running = false; }
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
