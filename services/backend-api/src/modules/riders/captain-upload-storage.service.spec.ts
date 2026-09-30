import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CaptainUploadStorageService } from "./captain-upload-storage.service";

describe("CaptainUploadStorageService", () => {
  const values: Record<string, string> = {
    CAPTAIN_UPLOADS_STORAGE_BUCKET: "private-test-bucket",
    CAPTAIN_UPLOADS_STORAGE_REGION: "test-region",
    CAPTAIN_UPLOADS_STORAGE_ENDPOINT: "https://storage.googleapis.com",
    CAPTAIN_UPLOADS_STORAGE_FORCE_PATH_STYLE: "true",
    CAPTAIN_UPLOADS_STORAGE_ACCESS_KEY_ID: "access-key-must-not-leak",
    CAPTAIN_UPLOADS_STORAGE_SECRET_ACCESS_KEY: "secret-key-must-not-leak"
  };
  const config = { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;

  it("writes content metadata without copying the original filename to GCS", async () => {
    const storage = new CaptainUploadStorageService(config);
    const send = jest.fn().mockResolvedValue({});
    (storage as any).client = { send };

    await storage.putObject("captain-private/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf", {
      originalname: "person-name-licence.pdf",
      mimetype: "application/pdf",
      size: 3,
      buffer: Buffer.from("pdf")
    });

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({ ContentType: "application/pdf" });
    expect(command.input).not.toHaveProperty("Metadata");
    expect(storage.storageLocation()).toEqual({ provider: "GCS", bucket: "private-test-bucket" });
  });

  it("signs both opaque and legacy Captain keys without rewriting them", async () => {
    const storage = new CaptainUploadStorageService(config);
    const opaqueKey = "captain-private/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf";
    const legacyKey = "captain-applications/00000000-0000-0000-0000-000000000001/driver_licence/file.pdf";

    const [opaqueUrl, legacyUrl] = await Promise.all([
      storage.signedViewUrl(opaqueKey, 300),
      storage.signedViewUrl(legacyKey, 300)
    ]);

    expect(decodeURIComponent(new URL(opaqueUrl).pathname)).toContain(opaqueKey);
    expect(opaqueUrl).not.toContain("driver_licence");
    expect(decodeURIComponent(new URL(legacyUrl).pathname)).toContain(legacyKey);
  });

  it("treats provider-confirmed DeleteObject completion as idempotent success", async () => {
    const storage = new CaptainUploadStorageService(config);
    const send = jest.fn().mockResolvedValue({});
    (storage as any).client = { send };

    await expect(storage.deleteObject("captain-applications/user/file.pdf")).resolves.toBeUndefined();
    await expect(storage.deleteObject("captain-applications/user/file.pdf")).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("returns a stable secret-free error when the provider fails", async () => {
    const storage = new CaptainUploadStorageService(config);
    (storage as any).client = { send: jest.fn().mockRejectedValue(new Error("secret-key-must-not-leak")) };

    const promise = storage.deleteObject("captain-applications/user/private-file.pdf");
    await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(promise).rejects.not.toThrow("secret-key-must-not-leak");
    await expect(promise).rejects.not.toThrow("private-file.pdf");
  });
});
