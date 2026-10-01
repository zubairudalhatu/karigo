import { AccountStatus, UserRole, VendorStatus } from "@prisma/client";
import { ExecutionContext, INestApplication, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AllExceptionsFilter } from "../../common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ApiResponseInterceptor } from "../../common/interceptors/api-response.interceptor";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorPrivateUploadStorageService } from "./vendor-private-upload-storage.service";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

const OWN_DOCUMENT_ID = "00000000-0000-4000-8000-000000000001";
const DELETED_DOCUMENT_ID = "00000000-0000-4000-8000-000000000002";
const OPAQUE_STORAGE_KEY = "partner-private/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png";
const FILE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);

describe("Partner private document binary response (HTTP)", () => {
  let app: INestApplication;

  const prisma = {
    vendor: { findFirst: jest.fn() },
    vendorOnboardingDocument: { findFirst: jest.fn() }
  };
  const privateUploads = {
    readOwnedObject: jest.fn()
  };

  beforeAll(async () => {
    const authenticatedGuard = {
      canActivate(context: ExecutionContext) {
        const httpRequest = context.switchToHttp().getRequest();
        const authorization = httpRequest.headers.authorization;
        if (authorization !== "Bearer vendor-one" && authorization !== "Bearer vendor-two") {
          throw new UnauthorizedException();
        }
        httpRequest.user = {
          id: authorization === "Bearer vendor-one" ? "vendor-user-1" : "vendor-user-2",
          fullName: "Controlled Partner QA",
          phoneNumber: "+2348000000000",
          email: null,
          role: UserRole.VENDOR,
          adminRole: null,
          accountStatus: AccountStatus.ACTIVE,
          phoneVerified: true
        };
        return true;
      }
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: VendorPrivateUploadStorageService, useValue: privateUploads }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authenticatedGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vendor.findFirst.mockImplementation(async ({ where }: { where: { userId: string } }) => ({
      id: where.userId === "vendor-user-1" ? "vendor-1" : "vendor-2",
      userId: where.userId,
      businessName: "Controlled Partner QA",
      businessCategory: "RESTAURANT",
      status: VendorStatus.ACTIVE,
      deletedAt: null,
      sourceApplication: { status: "APPROVED" },
      user: { accountStatus: AccountStatus.ACTIVE, deletedAt: null }
    }));
    prisma.vendorOnboardingDocument.findFirst.mockImplementation(async ({ where }: {
      where: { id: string; vendorId: string; deletedAt: null; storageKey: { not: null } };
    }) => {
      if (where.id !== OWN_DOCUMENT_ID || where.vendorId !== "vendor-1") return null;
      return {
        id: OWN_DOCUMENT_ID,
        vendorId: "vendor-1",
        storageKey: OPAQUE_STORAGE_KEY,
        vendorPrivateUpload: { mimeType: "image/png" }
      };
    });
    privateUploads.readOwnedObject.mockResolvedValue(Buffer.from(FILE_BYTES));
  });

  afterAll(async () => {
    await app.close();
  });

  it("sends the authorized vendor's byte-identical file without the JSON envelope", async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/vendors/onboarding-documents/${OWN_DOCUMENT_ID}/file`)
      .set("Authorization", "Bearer vendor-one")
      .buffer(true)
      .parse(binaryParser)
      .expect(200);

    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body).toEqual(FILE_BYTES);
    expect(response.headers["content-type"]).toBe("image/png");
    expect(response.headers["content-length"]).toBe(String(FILE_BYTES.length));
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-disposition"]).toBeUndefined();
    expect(response.headers["x-goog-meta-original-filename"]).toBeUndefined();
    expect(response.headers["x-goog-generation"]).toBeUndefined();
    expect(response.text).toBeUndefined();
    expect(response.body.toString("utf8")).not.toContain("success");
    expect(response.body.toString("utf8")).not.toContain(OPAQUE_STORAGE_KEY);
  });

  it("denies a different vendor before private storage is read", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vendors/onboarding-documents/${OWN_DOCUMENT_ID}/file`)
      .set("Authorization", "Bearer vendor-two")
      .expect(404);

    expect(privateUploads.readOwnedObject).not.toHaveBeenCalled();
  });

  it("denies anonymous access before private storage is read", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vendors/onboarding-documents/${OWN_DOCUMENT_ID}/file`)
      .expect(401);

    expect(privateUploads.readOwnedObject).not.toHaveBeenCalled();
  });

  it("fails safely when the manifest is missing or deleted", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/vendors/onboarding-documents/${DELETED_DOCUMENT_ID}/file`)
      .set("Authorization", "Bearer vendor-one")
      .expect(404);

    expect(privateUploads.readOwnedObject).not.toHaveBeenCalled();
  });
});

function binaryParser(
  response: any,
  callback: (error: Error | null, body?: any) => void
) {
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer | Uint8Array | string) => chunks.push(Buffer.from(chunk)));
  response.on("end", () => callback(null, Buffer.concat(chunks)));
  response.on("error", callback);
}
