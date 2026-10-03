import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AdCampaignStatus, AdCreativeStorageProvider, UserRole } from "@prisma/client";
import { AdCreativeService, inspectCreative, stripJpegMetadata } from "./ad-creative.service";

describe("ad creative validation", () => {
  it("accepts a sufficiently large PNG and rejects unsupported content", () => {
    const png = Buffer.alloc(24); Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(png); png.write("IHDR", 12, "ascii"); png.writeUInt32BE(1200, 16); png.writeUInt32BE(628, 20);
    expect(inspectCreative(png, "image/png")).toEqual({ width: 1200, height: 628 });
    expect(() => inspectCreative(Buffer.from("svg"), "image/svg+xml")).toThrow(BadRequestException);
  });
  it("rejects MIME mismatch, truncated PNG, HTML, SVG and oversized payloads", () => {
    const fake = Buffer.from("<script>alert(1)</script>");
    for (const mime of ["image/png", "image/jpeg", "text/html", "image/svg+xml"]) expect(() => inspectCreative(fake, mime)).toThrow(BadRequestException);
    expect(() => inspectCreative(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png")).toThrow(BadRequestException);
  });
  it("removes JPEG EXIF APP1 segments", () => {
    const input = Buffer.from([0xff,0xd8,0xff,0xe1,0x00,0x04,0x41,0x42,0xff,0xda,0x00,0x02]);
    expect(stripJpegMetadata(input)).toEqual(Buffer.from([0xff,0xd8,0xff,0xda,0x00,0x02]));
  });

  it("accepts a valid JPEG whose dimensions meet policy", () => {
    const jpeg = Buffer.from([0xff,0xd8,0xff,0xc0,0x00,0x07,0x08,0x02,0x74,0x04,0xb0,0x03,0xff,0xd9]);
    expect(inspectCreative(jpeg, "image/jpeg")).toEqual({ width: 1200, height: 628 });
  });
});

function png() {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(buffer);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(1200, 16);
  buffer.writeUInt32BE(628, 20);
  return buffer;
}

const storageKey = "campaigns/11111111111111111111111111111111/revisions/22222222222222222222222222222222/33333333333333333333333333333333.png";

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset-1",
    campaignId: "campaign-1",
    provider: AdCreativeStorageProvider.LOCAL_TEST,
    bucket: null,
    storageKey,
    mimeType: "image/png",
    byteSize: 24,
    width: 1200,
    height: 628,
    sha256: "hash",
    metadataStripped: false,
    deletedAt: null,
    createdAt: new Date(),
    ...overrides
  };
}

function approvedAsset(overrides: Record<string, unknown> = {}) {
  const creative = asset(overrides);
  return {
    ...creative,
    campaign: {
      id: "campaign-1",
      status: AdCampaignStatus.ACTIVE,
      approvedRevisionId: "revision-1",
      vendorId: "vendor-1",
      reservedCreditKobo: 10_000,
      spentKobo: 0,
      approvedRevision: {
        id: "revision-1",
        creativeAssetId: creative.id,
        requestedBudgetKobo: 10_000,
        dailyBudgetKobo: 1_000,
        startsAt: null,
        endsAt: null
      }
    }
  };
}

function serviceHarness(foundAsset: any = approvedAsset()) {
  const createdAsset = asset();
  const tx = {
    adCreativeAsset: { create: jest.fn().mockResolvedValue(createdAsset) },
    adCampaignRevision: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }
  };
  const prisma = {
    adCampaign: { findFirst: jest.fn().mockResolvedValue({ id: "campaign-1", currentRevisionNumber: 2, approvedRevisionId: "revision-1" }) },
    adCampaignRevision: { findUnique: jest.fn().mockResolvedValue({ id: "revision-2", campaignId: "campaign-1", revisionNumber: 2 }) },
    adCreativeAsset: {
      findFirst: jest.fn().mockResolvedValue(foundAsset),
      update: jest.fn().mockResolvedValue(foundAsset)
    },
    adCampaignEvent: { aggregate: jest.fn().mockResolvedValue({ _sum: { costKobo: 0 } }) },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))
  } as any;
  const storage = {
    put: jest.fn().mockResolvedValue({
      provider: AdCreativeStorageProvider.LOCAL_TEST,
      bucket: null,
      storageKey,
      byteSize: 24
    }),
    read: jest.fn().mockResolvedValue(png()),
    delete: jest.fn().mockResolvedValue(undefined)
  } as any;
  return { service: new AdCreativeService(prisma, storage), prisma, storage, tx };
}

describe("AdCreativeService storage and authorization", () => {
  it("stores only validated bytes and persists the provider reference", async () => {
    const { service, storage, tx } = serviceHarness();
    const bytes = png();
    const result = await service.saveForVendor("vendor-user", "campaign-1", {
      buffer: bytes,
      mimetype: "image/png",
      size: bytes.length,
      originalname: "Company Name - private campaign.png"
    });
    expect(storage.put).toHaveBeenCalledWith(bytes, "image/png");
    expect(storage.put.mock.calls[0]).not.toContain("Company Name - private campaign.png");
    expect(tx.adCreativeAsset.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      provider: AdCreativeStorageProvider.LOCAL_TEST,
      bucket: null,
      storageKey,
      mimeType: "image/png"
    }) }));
    expect(tx.adCampaignRevision.updateMany).toHaveBeenCalledWith({
      where: { campaignId: "campaign-1", revisionNumber: 2 },
      data: { creativeAssetId: "asset-1", imageUrl: null }
    });
    expect(result.id).toBe("asset-1");
  });

  it("rejects an invalid image before invoking storage", async () => {
    const { service, storage } = serviceHarness();
    await expect(service.saveForVendor("vendor-user", "campaign-1", {
      buffer: Buffer.from("<svg/>"), mimetype: "image/png", size: 6, originalname: "creative.png"
    })).rejects.toThrow(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("refuses to replace the currently approved revision bytes in place", async () => {
    const { service, prisma, storage } = serviceHarness();
    prisma.adCampaign.findFirst.mockResolvedValue({ id: "campaign-1", currentRevisionNumber: 1, approvedRevisionId: "revision-1" });
    prisma.adCampaignRevision.findUnique.mockResolvedValue({ id: "revision-1", campaignId: "campaign-1", revisionNumber: 1 });
    const bytes = png();
    await expect(service.saveForVendor("vendor-user", "campaign-1", {
      buffer: bytes, mimetype: "image/png", size: bytes.length, originalname: "replacement.png"
    })).rejects.toThrow("Create a replacement revision");
    expect(storage.put).not.toHaveBeenCalled();
  });

  it("cleans up a newly written object when database persistence fails", async () => {
    const { service, storage, tx } = serviceHarness();
    tx.adCreativeAsset.create.mockRejectedValue(new Error("database failure"));
    const bytes = png();
    await expect(service.saveForVendor("vendor-user", "campaign-1", {
      buffer: bytes, mimetype: "image/png", size: bytes.length, originalname: "creative.png"
    })).rejects.toThrow("database failure");
    expect(storage.delete).toHaveBeenCalledWith(expect.objectContaining({ storageKey }));
  });

  it("allows the owning vendor to preview a pending creative", async () => {
    const { service, prisma, storage } = serviceHarness(asset());
    await expect(service.readForActor("asset-1", { id: "vendor-user", role: UserRole.VENDOR })).resolves.toEqual({
      buffer: expect.any(Buffer), mimeType: "image/png"
    });
    expect(prisma.adCreativeAsset.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ campaign: { is: { vendor: { is: { userId: "vendor-user", deletedAt: null } } } } })
    }));
    expect(storage.read).toHaveBeenCalled();
  });

  it("blocks cross-vendor read without calling storage", async () => {
    const { service, prisma, storage } = serviceHarness(null);
    prisma.adCreativeAsset.findFirst.mockResolvedValue(null);
    await expect(service.readForActor("asset-1", { id: "other-vendor", role: UserRole.VENDOR })).rejects.toThrow(NotFoundException);
    expect(storage.read).not.toHaveBeenCalled();
  });

  it("allows an authorized admin to preview a pending creative", async () => {
    const { service, storage } = serviceHarness(asset());
    await expect(service.readForActor("asset-1", { id: "admin-user", role: UserRole.ADMIN })).resolves.toEqual({
      buffer: expect.any(Buffer), mimeType: "image/png"
    });
    expect(storage.read).toHaveBeenCalled();
  });

  it("serves only the current approved active revision to customers", async () => {
    const { service, storage } = serviceHarness(approvedAsset());
    await expect(service.readForActor("asset-1", { id: "customer", role: UserRole.CUSTOMER })).resolves.toEqual({
      buffer: expect.any(Buffer), mimeType: "image/png"
    });
    expect(storage.read).toHaveBeenCalled();
  });

  it.each([
    { status: AdCampaignStatus.UNDER_REVIEW },
    { approvedRevisionId: "revision-2" },
    { spentKobo: 10_000 },
    { approvedRevision: { id: "revision-1", creativeAssetId: "other-asset", requestedBudgetKobo: 10_000, startsAt: null, endsAt: null } },
    { approvedRevision: { id: "revision-1", creativeAssetId: "asset-1", requestedBudgetKobo: 10_000, startsAt: new Date(Date.now() + 60_000), endsAt: null } }
  ])("blocks non-eligible customer delivery: %o", async (campaignOverride) => {
    const candidate = approvedAsset();
    candidate.campaign = { ...candidate.campaign, ...campaignOverride } as typeof candidate.campaign;
    const { service, storage } = serviceHarness(candidate);
    await expect(service.readApproved("asset-1")).rejects.toThrow(NotFoundException);
    expect(storage.read).not.toHaveBeenCalled();
  });

  it("blocks customer delivery when the approved revision daily budget is exhausted", async () => {
    const { service, prisma, storage } = serviceHarness(approvedAsset());
    prisma.adCampaignEvent.aggregate.mockResolvedValue({ _sum: { costKobo: 1_000 } });
    await expect(service.readApproved("asset-1")).rejects.toThrow(NotFoundException);
    expect(storage.read).not.toHaveBeenCalled();
  });

  it("keeps the old approved creative readable while a replacement is under review", async () => {
    const oldApproved = approvedAsset();
    const { service, storage } = serviceHarness(oldApproved);
    await expect(service.readApproved("asset-1")).resolves.toEqual({ buffer: expect.any(Buffer), mimeType: "image/png" });
    expect(storage.read).toHaveBeenCalledWith(expect.objectContaining({ storageKey }));
  });

  it("deletes only an owned non-approved creative and records logical deletion", async () => {
    const candidate = approvedAsset();
    candidate.campaign.approvedRevision!.creativeAssetId = "other-asset";
    const { service, prisma, storage } = serviceHarness(candidate);
    await expect(service.deleteForVendor("vendor-user", "asset-1")).resolves.toEqual({ deleted: true });
    expect(storage.delete).toHaveBeenCalledWith(expect.objectContaining({ storageKey }));
    expect(prisma.adCreativeAsset.update).toHaveBeenCalledWith({ where: { id: "asset-1" }, data: { deletedAt: expect.any(Date) } });
  });

  it("blocks deletion of an approved live creative", async () => {
    const { service, storage } = serviceHarness(approvedAsset());
    await expect(service.deleteForVendor("vendor-user", "asset-1")).rejects.toThrow(ForbiddenException);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("blocks cross-vendor deletion", async () => {
    const { service, prisma, storage } = serviceHarness(null);
    prisma.adCreativeAsset.findFirst.mockResolvedValue(null);
    await expect(service.deleteForVendor("other-vendor", "asset-1")).rejects.toThrow(NotFoundException);
    expect(storage.delete).not.toHaveBeenCalled();
  });
});
