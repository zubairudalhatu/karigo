import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { configureApp } from "../../app.setup";
import { PrismaModule } from "../../prisma/prisma.module";
import { PrismaService } from "../../prisma/prisma.service";
import { HealthModule } from "./health.module";
import { READINESS_MIGRATIONS, READINESS_TIMEOUT_MS, ReadinessService, readinessManifest } from "./readiness.service";

describe("Readiness HTTP", () => {
  let app: INestApplication;
  const checksum = "a".repeat(64);
  const row = { migration_name: "fixture", checksum, finished_at: new Date(), rolled_back_at: null };
  const tx = { $executeRaw: jest.fn(), $queryRaw: jest.fn() };
  const db = { $transaction: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PrismaModule, HealthModule] })
      .overrideProvider(PrismaService).useValue(db)
      .overrideProvider(READINESS_MIGRATIONS).useValue(new Map([["fixture", checksum]]))
      .compile();
    app = module.createNestApplication();
    configureApp(app, new ConfigService(), { enableShutdownHooks: false });
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    tx.$executeRaw.mockResolvedValue(0);
    tx.$queryRaw.mockResolvedValueOnce([row]).mockResolvedValue([]);
    db.$transaction.mockImplementation(async fn => fn(tx));
  });
  afterAll(async () => { await app.close(); });

  it("returns 200 after bounded read-only migration and schema checks", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(200);
    expect(response.body).toEqual({ success: true, message: "Request successful", data: { status: "ready" } });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 500, timeout: 1500 });
    expect(tx.$executeRaw.mock.calls[0][0].join("")).toBe("SET TRANSACTION READ ONLY");
    expect(tx.$queryRaw.mock.calls[1][0].join("")).toContain("LIMIT 0");
  });

  it("returns sanitized 503 when the database is unavailable", async () => {
    db.$transaction.mockRejectedValue(new Error("private connection detail and Customer fixture"));
    const response = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(503);
    expect(response.body).toEqual({ success: false, message: "Service not ready", error_code: "NOT_READY", details: {} });
    expect(JSON.stringify(response.body)).not.toMatch(/private|connection|Customer|stack/);
  });

  it.each([
    ["missing migration", []],
    ["checksum drift", [{ ...row, checksum: "different" }]],
    ["unfinished migration", [{ ...row, finished_at: null }]],
    ["duplicate completed migration", [row, row]]
  ])("fails closed for %s", async (_name, rows) => {
    tx.$queryRaw.mockReset().mockResolvedValue(rows);
    await request(app.getHttpServer()).get("/api/v1/health/ready").expect(503);
  });

  it("fails closed when a required schema relation/column is missing", async () => {
    tx.$queryRaw.mockReset().mockResolvedValueOnce([row]).mockRejectedValueOnce(new Error("schema detail"));
    await request(app.getHttpServer()).get("/api/v1/health/ready").expect(503);
  });

  it("keeps existing liveness behavior independent of database readiness", async () => {
    db.$transaction.mockRejectedValue(new Error("offline"));
    const response = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    expect(response.body.message).toBe("KariGO API is healthy");
    expect(response.body.data).toEqual({ service: "backend-api", status: "ok", timestamp: expect.any(String) });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("Readiness bounds and manifest", () => {
  it("loads the shipped migration checksums", () => {
    const manifest = readinessManifest();
    expect(manifest?.size).toBeGreaterThan(0);
    for (const checksum of manifest!.values()) expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed without the migration manifest", async () => {
    const db = { $transaction: jest.fn() };
    expect(await new ReadinessService(db as unknown as PrismaService, null).ready()).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("bounds responses and coalesces probes while a transport is stalled", async () => {
    jest.useFakeTimers();
    try {
      let settle!: (value: unknown) => void;
      const db = { $transaction: jest.fn(() => new Promise(resolve => { settle = resolve; })) };
      const service = new ReadinessService(db as unknown as PrismaService, new Map([["fixture", "checksum"]]));
      const first = service.ready();
      const second = service.ready();
      await jest.advanceTimersByTimeAsync(READINESS_TIMEOUT_MS);
      expect(await first).toBe(false);
      expect(await second).toBe(false);
      expect(db.$transaction).toHaveBeenCalledTimes(1);
      const third = service.ready();
      settle(undefined);
      expect(await third).toBe(true);
    } finally { jest.useRealTimers(); }
  });
});
