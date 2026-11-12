import { PartnerMobileFilesService, validatePartnerDocument } from "./partner-mobile-files.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorPrivateUploadStorageService } from "../vendors/vendor-private-upload-storage.service";

describe("Partner onboarding private files", () => {
  const file = () => ({ originalname: "../../untrusted.pdf", mimetype: "application/pdf", buffer: Buffer.from("%PDF-test"), size: 9 });
  it("checks MIME, magic, declared size and the 10MB limit", () => {
    expect(() => validatePartnerDocument(file())).not.toThrow();
    expect(() => validatePartnerDocument({ ...file(), mimetype: "image/png" })).toThrow();
    expect(() => validatePartnerDocument({ ...file(), size: 11 * 1024 * 1024 })).toThrow();
    expect(() => validatePartnerDocument({ ...file(), mimetype: "text/html" })).toThrow();
  });
  it("cross-owner read, label and delete fail before accessing storage", async () => {
    const db = { partnerMobileFile: { findFirst: jest.fn(async (_query: unknown) => null) } };
    const storage = { storageLocation: () => ({ provider: "LOCAL", bucket: "synthetic-private" }), readOwnedObject: jest.fn(), deleteOwnedObject: jest.fn() };
    const service = new PartnerMobileFilesService(db as unknown as PrismaService, storage as unknown as VendorPrivateUploadStorageService);
    await expect(service.read("other", "file-id")).rejects.toThrow();
    await expect(service.remove("other", "file-id")).rejects.toThrow();
    await expect(service.label("other", "/partner-mobile/onboarding/files/11111111-1111-4111-8111-111111111111", "OWNER_ID")).rejects.toThrow();
    expect(storage.readOwnedObject).not.toHaveBeenCalled(); expect(storage.deleteOwnedObject).not.toHaveBeenCalled();
    expect(db.partnerMobileFile.findFirst.mock.calls[0][0]).toMatchObject({ where: { userId: "other" } });
  });
  it("does not mark an object deleted when external storage deletion fails", async () => {
    const db = { partnerMobileFile: { findFirst: jest.fn(async () => ({ id: "id", userId: "owner", storageKey: "opaque", storageProvider: "LOCAL", storageBucket: "synthetic-private" })), update: jest.fn() } };
    const storage = { storageLocation: () => ({ provider: "LOCAL", bucket: "synthetic-private" }), deleteOwnedObject: jest.fn(async () => { throw new Error("storage unavailable"); }) };
    const service = new PartnerMobileFilesService(db as unknown as PrismaService, storage as unknown as VendorPrivateUploadStorageService);
    await expect(service.remove("owner", "id")).rejects.toThrow(); expect(db.partnerMobileFile.update).not.toHaveBeenCalled();
  });
  it("rolls back an unreferenced object if metadata persistence fails", async () => {
    const db = { partnerMobileFile: { create: jest.fn(async () => { throw new Error("database unavailable"); }) } };
    const storage = { storageLocation: () => ({ provider: "LOCAL", bucket: "synthetic-private" }), putOnboardingDocument: jest.fn(async () => "opaque"), deleteOwnedObject: jest.fn() };
    const service = new PartnerMobileFilesService(db as unknown as PrismaService, storage as unknown as VendorPrivateUploadStorageService);
    await expect(service.upload("owner", file())).rejects.toThrow();
    expect(storage.deleteOwnedObject).toHaveBeenCalledWith("owner", "opaque");
  });
});
