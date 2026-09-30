import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { VendorPrivateUploadStorageService } from "./vendor-private-upload-storage.service";

describe("VendorPrivateUploadStorageService", () => {
  const values: Record<string, string> = {
    NODE_ENV: "production",
    PARTNER_PRIVATE_STORAGE_DRIVER: "s3",
    PARTNER_PRIVATE_STORAGE_BUCKET: "test-private-bucket",
    PARTNER_PRIVATE_STORAGE_REGION: "test-region-1",
    PARTNER_PRIVATE_STORAGE_ENDPOINT: "https://objects.example.test",
    PARTNER_PRIVATE_STORAGE_ACCESS_KEY_ID: "test-access-key",
    PARTNER_PRIVATE_STORAGE_SECRET_ACCESS_KEY: "test-secret-value",
    PARTNER_PRIVATE_STORAGE_KEY_SECRET: "test-only-partner-private-key-secret-2026",
    PARTNER_PRIVATE_STORAGE_SERVER_SIDE_ENCRYPTION: "AES256"
  };

  function setup(send = jest.fn()) {
    const config = { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
    const storage = new VendorPrivateUploadStorageService(config);
    (storage as unknown as { client: { send: typeof send } }).client = { send };
    return { storage, send };
  }

  it("writes a private, encrypted, vendor-scoped object without a public ACL", async () => {
    const { storage, send } = setup(jest.fn().mockResolvedValue({}));
    const key = await storage.putOnboardingDocument("vendor-a", {
      originalname: "identity.pdf", mimetype: "application/pdf", size: 3, buffer: Buffer.from("pdf")
    });
    expect(key).toMatch(/^partner-private\/[a-f0-9]{32}\/[a-f0-9]{32}\.pdf$/);
    expect(key).not.toContain("vendor-a");
    expect(key).not.toContain("identity");
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({ Bucket: "test-private-bucket", Key: key, ServerSideEncryption: "AES256" });
    expect(command.input).not.toHaveProperty("ACL");
    expect(command.input).not.toHaveProperty("Metadata");
  });

  it("retrieves an owned object and rejects cross-tenant/traversal keys", async () => {
    const body = { transformToByteArray: jest.fn().mockResolvedValue(Uint8Array.from([1, 2, 3])) };
    const { storage, send } = setup(jest.fn().mockResolvedValue({}));
    const key = await storage.putOnboardingDocument("vendor-a", {
      originalname: "evidence.pdf", mimetype: "application/pdf", size: 3, buffer: Buffer.from("pdf")
    });
    send.mockResolvedValueOnce({ Body: body });
    await expect(storage.readOwnedObject("vendor-a", key)).resolves.toEqual(Buffer.from([1, 2, 3]));
    expect(send.mock.calls[1][0]).toBeInstanceOf(GetObjectCommand);
    expect(() => storage.assertOwnedKey("vendor-b", key)).toThrow(BadRequestException);
    expect(() => storage.assertOwnedKey("vendor-a", "partner-private/vendors/vendor-a/onboarding-documents/../../secret")).toThrow(BadRequestException);
  });

  it("supports retryable and idempotent S3 deletion", async () => {
    const send = jest.fn().mockResolvedValue({});
    const { storage } = setup(send);
    const key = await storage.putOnboardingDocument("vendor-a", {
      originalname: "evidence.pdf", mimetype: "application/pdf", size: 3, buffer: Buffer.from("pdf")
    });
    send.mockRejectedValueOnce(new Error("temporary failure")).mockResolvedValue({});
    await expect(storage.deleteOwnedObject("vendor-a", key)).rejects.toThrow(ServiceUnavailableException);
    await expect(storage.deleteOwnedObject("vendor-a", key)).resolves.toBeUndefined();
    await expect(storage.deleteOwnedObject("vendor-a", key)).resolves.toBeUndefined();
    expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(storage.storageLocation()).toEqual({ provider: "S3_COMPATIBLE", bucket: "test-private-bucket" });
  });

  it("does not leak storage credentials in failures", async () => {
    const { storage } = setup(jest.fn().mockRejectedValue(new Error(values.PARTNER_PRIVATE_STORAGE_SECRET_ACCESS_KEY)));
    const promise = storage.deleteOwnedObject("vendor-a", "partner-private/vendors/vendor-a/onboarding-documents/evidence.pdf");
    await expect(promise).rejects.toThrow("Private Partner document could not be removed from storage.");
    await expect(promise).rejects.not.toThrow(values.PARTNER_PRIVATE_STORAGE_SECRET_ACCESS_KEY);
    await expect(promise).rejects.not.toThrow("vendor-a");
    await expect(promise).rejects.not.toThrow("evidence.pdf");
  });

  it("refuses local filesystem storage in production", async () => {
    const config = { get: jest.fn((key: string) => ({ NODE_ENV: "production", PARTNER_PRIVATE_STORAGE_DRIVER: "local" })[key as "NODE_ENV"]) } as unknown as ConfigService;
    const storage = new VendorPrivateUploadStorageService(config);
    await expect(storage.deleteOwnedObject("vendor-a", "partner-private/vendors/vendor-a/onboarding-documents/evidence.pdf"))
      .rejects.toThrow("Durable private Partner storage is required in production.");
  });
});
