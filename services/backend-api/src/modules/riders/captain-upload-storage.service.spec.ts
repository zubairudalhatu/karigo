import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CaptainUploadStorageService } from "./captain-upload-storage.service";

describe("CaptainUploadStorageService", () => {
  const values: Record<string, string> = {
    CAPTAIN_UPLOADS_STORAGE_BUCKET: "private-test-bucket",
    CAPTAIN_UPLOADS_STORAGE_REGION: "test-region",
    CAPTAIN_UPLOADS_STORAGE_ACCESS_KEY_ID: "access-key-must-not-leak",
    CAPTAIN_UPLOADS_STORAGE_SECRET_ACCESS_KEY: "secret-key-must-not-leak"
  };
  const config = { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;

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
