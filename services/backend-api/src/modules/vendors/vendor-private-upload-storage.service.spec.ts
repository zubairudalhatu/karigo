import { BadRequestException } from "@nestjs/common";
import { VendorPrivateUploadStorageService } from "./vendor-private-upload-storage.service";

describe("VendorPrivateUploadStorageService", () => {
  const storage = new VendorPrivateUploadStorageService();

  it("rejects cross-tenant and traversal keys before reading or deleting", () => {
    expect(() => storage.assertOwnedKey("vendor-a", "vendors/vendor-b/onboarding-documents/file.pdf")).toThrow(BadRequestException);
    expect(() => storage.assertOwnedKey("vendor-a", "vendors/vendor-a/onboarding-documents/../../secret")).toThrow(BadRequestException);
  });
});
