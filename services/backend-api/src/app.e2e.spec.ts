import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { configureApp } from "./app.setup";
import { PrismaService } from "./prisma/prisma.service";
import { configureSwagger } from "./swagger.setup";

describe("Backend foundation (HTTP)", () => {
  let app: INestApplication | undefined;
  const prismaMock = {
    vendor: {
      findMany: jest.fn().mockResolvedValue([])
    }
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = "TEST_DATABASE_URL_PLACEHOLDER";
    process.env.JWT_SECRET = "test-secret";
    const { AppModule } = await import("./app.module");

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app, app.get(ConfigService), { enableShutdownHooks: false });
    configureSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("serves the health endpoint under the global API prefix", async () => {
    const response = await request(app!.getHttpServer()).get("/api/v1/health").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("KariGO API is healthy");
    expect(response.body.data.status).toBe("ok");
  });

  it("does not expose health without the global API prefix", async () => {
    await request(app!.getHttpServer()).get("/health").expect(404);
  });

  it("serves Swagger documentation outside the API version prefix", async () => {
    const response = await request(app!.getHttpServer()).get("/api/docs").expect(200);
    expect(response.text).toContain("KariGO Backend API");
  });

  it("exposes customer registration with global DTO validation", async () => {
    const response = await request(app!.getHttpServer())
      .post("/api/v1/auth/customer/register")
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error_code).toBe("VALIDATION_ERROR");
  });

  it("protects authenticated identity and customer profile endpoints", async () => {
    await request(app!.getHttpServer()).get("/api/v1/auth/me").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/customers/me").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/addresses").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/wallet").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/wallet/transactions").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/referrals/me").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/referrals/my-referrals").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/orders/my-orders").expect(401);
    await request(app!.getHttpServer()).post("/api/v1/payments/initiate").send({}).expect(401);
    await request(app!.getHttpServer()).get("/api/v1/vendor-dashboard/orders").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/rider/jobs").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/riders/available").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/support/tickets/my-tickets").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/support/tickets").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/dashboard").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/reports/operations").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/wallets").expect(401);
    await request(app!.getHttpServer())
      .post("/api/v1/admin/wallets/00000000-0000-0000-0000-000000000000/adjustments")
      .send({})
      .expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/referrals").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/referrals/reward-rules").expect(401);
    await request(app!.getHttpServer()).post("/api/v1/admin/referrals/reward-rules").send({}).expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/settlements/vendors").expect(401);
    await request(app!.getHttpServer()).post("/api/v1/promos/validate").send({}).expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/promos").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/customers/me/retention-summary").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/reports/promos").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/notifications").expect(401);
    await request(app!.getHttpServer()).get("/api/v1/notifications/device-tokens").expect(401);
    await request(app!.getHttpServer()).post("/api/v1/notifications/device-tokens").send({}).expect(401);
    await request(app!.getHttpServer())
      .delete("/api/v1/notifications/device-tokens/00000000-0000-0000-0000-000000000000")
      .expect(401);
    await request(app!.getHttpServer()).get("/api/v1/admin/notifications").expect(401);
    await request(app!.getHttpServer())
      .post("/api/v1/vendor-dashboard/orders/00000000-0000-0000-0000-000000000000/accept")
      .expect(401);
    await request(app!.getHttpServer())
      .post("/api/v1/admin/payments/00000000-0000-0000-0000-000000000000/approve-refund")
      .expect(401);
  });

  it("exposes the public active-vendor listing", async () => {
    const response = await request(app!.getHttpServer()).get("/api/v1/vendors").expect(200);
    expect(response.body).toEqual({
      success: true,
      message: "Active vendors retrieved",
      data: []
    });
  });
});
