import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AllExceptionsFilter } from "../../common/filters/all-exceptions.filter";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ApiResponseInterceptor } from "../../common/interceptors/api-response.interceptor";
import { ControlledSupplyService } from "./controlled-supply.service";
import { AdminLaunchOperationsController } from "./launch-operations.controller";
import { LaunchOperationsService } from "./launch-operations.service";
import { QuickLaunchService } from "./quick-launch.service";

describe("Quick Launch candidate routes (HTTP)", () => {
  let app: INestApplication;

  const discovery = (kind: "customer" | "captain" | "partner", query: Record<string, unknown>) => ({
    items: [{
      userId: `${kind}-user`,
      ...(kind === "partner" ? { vendorId: "partner-vendor" } : {}),
      fullName: `${kind} account`,
      phoneNumber: "+2348033686696",
      city: query.city,
      ready: false,
      blockerCodes: ["CITY_MISMATCH"],
      blockerMessages: [`${kind} remains visible with blocker`]
    }],
    pagination: {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
      total: 1,
      hasMore: false
    },
    diagnosticCode: null
  });

  const quickLaunch = {
    customerDiscovery: jest.fn(async (query: Record<string, unknown>) => discovery("customer", query)),
    captainDiscovery: jest.fn(async (query: Record<string, unknown>) => discovery("captain", query)),
    partnerDiscovery: jest.fn(async (query: Record<string, unknown>) => discovery("partner", query))
  };

  beforeAll(async () => {
    const allow = { canActivate: () => true };
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminLaunchOperationsController],
      providers: [
        { provide: LaunchOperationsService, useValue: {} },
        { provide: ControlledSupplyService, useValue: {} },
        { provide: QuickLaunchService, useValue: quickLaunch }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allow)
      .overrideGuard(RolesGuard)
      .useValue(allow)
      .overrideGuard(AdminRolesGuard)
      .useValue(allow)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(["ABUJA", "KANO"])("forwards %s Customer browse query through the DTO exactly", async (city) => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/admin/production-launch/quick-launch/customers")
      .query({ city, query: "", readiness: "ALL", page: "1" })
      .expect(200);

    expect(quickLaunch.customerDiscovery).toHaveBeenCalledWith({ city, query: "", readiness: "ALL", page: 1 });
    expect(response.body).toEqual({
      success: true,
      message: "Quick Launch Customer candidates retrieved",
      data: expect.objectContaining({
        items: [expect.objectContaining({ userId: "customer-user", ready: false })],
        pagination: { page: 1, pageSize: 50, total: 1, hasMore: false },
        diagnosticCode: null
      })
    });
    expect(response.body.data.data).toBeUndefined();
  });

  it.each(["ABUJA", "KANO"])("forwards %s Ride Captain browse query through the DTO exactly", async (city) => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/admin/production-launch/quick-launch/captains")
      .query({ city, serviceType: "RIDES", query: "", readiness: "ALL", capability: "ALL", page: "1" })
      .expect(200);

    expect(quickLaunch.captainDiscovery).toHaveBeenCalledWith({
      city,
      serviceType: "RIDES",
      query: "",
      readiness: "ALL",
      capability: "ALL",
      page: 1
    });
    expect(response.body.data).toEqual(expect.objectContaining({
      items: [expect.objectContaining({ userId: "captain-user", ready: false })],
      pagination: { page: 1, pageSize: 50, total: 1, hasMore: false },
      diagnosticCode: null
    }));
  });

  it("forwards Partner browse filters without changing city or capability", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/admin/production-launch/quick-launch/partners")
      .query({ city: "ABUJA", serviceType: "MARKETPLACE", query: "", readiness: "ALL", capability: "ALL", page: "1" })
      .expect(200);

    expect(quickLaunch.partnerDiscovery).toHaveBeenCalledWith({
      city: "ABUJA",
      serviceType: "MARKETPLACE",
      query: "",
      readiness: "ALL",
      capability: "ALL",
      page: 1
    });
    expect(response.body.data.items).toEqual([expect.objectContaining({ vendorId: "partner-vendor", ready: false })]);
  });

  it("forwards a Nigerian phone search and optional pageSize through the real query DTO", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/production-launch/quick-launch/customers")
      .query({ city: "ABUJA", query: "08033686696", readiness: "ALL", page: "2", pageSize: "25" })
      .expect(200);

    expect(quickLaunch.customerDiscovery).toHaveBeenCalledWith({
      city: "ABUJA",
      query: "08033686696",
      readiness: "ALL",
      page: 2,
      pageSize: 25
    });
  });

  it("accepts browse with no query parameter and leaves query undefined", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/production-launch/quick-launch/customers")
      .query({ city: "ABUJA", readiness: "ALL", page: "1" })
      .expect(200);

    expect(quickLaunch.customerDiscovery).toHaveBeenCalledWith({ city: "ABUJA", readiness: "ALL", page: 1 });
  });

  it("reproduces the deployed validation message when the BFF drops city", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/admin/production-launch/quick-launch/customers")
      .query({ query: "", readiness: "ALL", page: "1" })
      .expect(400);

    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: "city must be shorter than or equal to 80 characters",
      error_code: "VALIDATION_ERROR"
    }));
    expect(quickLaunch.customerDiscovery).not.toHaveBeenCalled();
  });
});
