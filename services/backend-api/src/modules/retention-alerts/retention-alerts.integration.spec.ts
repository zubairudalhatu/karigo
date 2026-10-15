import { PrismaClient } from "@prisma/client";
import { DatabaseAlertStore } from "./alert-store";
import { RetentionAlertEngine } from "./retention-alerts.service";

// This integration test cannot use an ambient or remote DATABASE_URL.
const url = "postgresql://retention_fixture@127.0.0.1:55441/retention_alert_fixture";
const suite = process.env.RETENTION_ALERT_FIXTURE_TEST === "true" ? describe : describe.skip;
suite("PostgreSQL retention alert claims (synthetic local database only)", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const now = new Date("2026-10-15T14:00:00Z");
  beforeEach(async () => { await db.$executeRaw`DELETE FROM "RetentionAlertReport"`; await db.$executeRaw`DELETE FROM "RetentionAlertState"`; });
  afterAll(() => db.$disconnect());
  it("serializes concurrent report and send claims across independent engine instances", async () => {
    const sender = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "synthetic-provider-id" }) });
    const a = new RetentionAlertEngine(new DatabaseAlertStore(db, now), () => "fixture", sender, () => "live");
    const b = new RetentionAlertEngine(new DatabaseAlertStore(db, now), () => "fixture", sender, () => "live");
    const report = { execution: "synthetic-execution-01", startedAt: now.toISOString(), success: true, overdue: 1, oldestOverdueHours: 721, failureCode: "NONE" };
    expect((await Promise.all([a.report(report, now), b.report(report, now)])).sort()).toEqual([false, true]);
    await Promise.all([a.dispatch(now), b.dispatch(now)]);
    expect(sender.mock.calls.filter(c => c[1].method === "POST")).toHaveLength(1);
    const state = await new DatabaseAlertStore(db, now).edit(s => structuredClone(s));
    expect(state.deliveries).toHaveLength(1); expect(state.deliveries[0].providerId).toBe("synthetic-provider-id");
    const rows = await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "RetentionAlertReport"`;
    expect(rows[0].count).toBe(1n);
  });
  it("rolls back receipts and state together on an invalid transaction", async () => {
    const store = new DatabaseAlertStore(db, now);
    await expect(store.report("fixture-rollback", "fixturehash", s => { s.lastReportAt = now.toISOString(); throw new Error("fixture rollback"); })).rejects.toThrow();
    const rows = await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "RetentionAlertReport"`;
    expect(rows[0].count).toBe(0n);
  });
});
