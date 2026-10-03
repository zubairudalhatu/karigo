import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { AdCreativeStorageProvider } from "@prisma/client";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { AdCreativeStorageService } from "./ad-creative-storage.service";

describe("AdCreativeStorageService", () => {
  const values: Record<string, string> = {
    APP_ENV: "production",
    AD_CREATIVE_STORAGE_DRIVER: "gcs",
    AD_CREATIVE_STORAGE_ENDPOINT: "https://storage.googleapis.com",
    AD_CREATIVE_STORAGE_REGION: "auto",
    AD_CREATIVE_STORAGE_BUCKET: "ad-creative-test-bucket",
    AD_CREATIVE_STORAGE_FORCE_PATH_STYLE: "true",
    AD_CREATIVE_STORAGE_ACCESS_KEY_ID: "test-access-id",
    AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY: "test-secret-value",
    AD_CREATIVE_STORAGE_TIMEOUT_MS: "1000"
  };

  function setup(send = jest.fn(), overrides: Record<string, string | undefined> = {}) {
    const configValues = { ...values, ...overrides };
    const config = { get: jest.fn((key: string) => configValues[key]) } as unknown as ConfigService;
    const storage = new AdCreativeStorageService(config);
    (storage as unknown as { client: { send: typeof send } }).client = { send };
    return { storage, send };
  }

  const reference = (storageKey: string) => ({
    provider: AdCreativeStorageProvider.GCS,
    bucket: values.AD_CREATIVE_STORAGE_BUCKET,
    storageKey
  });

  it.each([
    ["image/jpeg" as const, ".jpg"],
    ["image/png" as const, ".png"]
  ])("uploads %s with an opaque immutable key and minimal provider headers", async (mimeType, extension) => {
    const { storage, send } = setup(jest.fn().mockResolvedValue({}));
    const stored = await storage.put(Buffer.from([1, 2, 3]), mimeType);
    expect(stored.storageKey).toMatch(new RegExp(`^campaigns/[a-f0-9]{32}/revisions/[a-f0-9]{32}/[a-f0-9]{32}\\${extension}$`));
    expect(stored.storageKey).not.toContain("original");
    expect(stored.provider).toBe(AdCreativeStorageProvider.GCS);
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: values.AD_CREATIVE_STORAGE_BUCKET,
      Key: stored.storageKey,
      ContentType: mimeType,
      ContentLength: 3
    });
    expect(command.input).not.toHaveProperty("Metadata");
    expect(command.input).not.toHaveProperty("ACL");
    expect(command.input).not.toHaveProperty("ServerSideEncryption");
  });

  it("returns exact bytes from authenticated reads", async () => {
    const body = { transformToByteArray: jest.fn().mockResolvedValue(Uint8Array.from([7, 8, 9])) };
    const { storage, send } = setup(jest.fn().mockResolvedValue({ Body: body }));
    const key = storage.createOpaqueKey("image/png");
    await expect(storage.read(reference(key))).resolves.toEqual(Buffer.from([7, 8, 9]));
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
  });

  it("supports bounded metadata checks", async () => {
    const { storage, send } = setup(jest.fn().mockResolvedValue({ ContentLength: 42, ContentType: "image/png" }));
    const key = storage.createOpaqueKey("image/png");
    await expect(storage.head(reference(key))).resolves.toEqual({ byteSize: 42, contentType: "image/png" });
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);
    expect(send.mock.calls[0][1].abortSignal).toBeDefined();
  });

  it("deletes idempotently, including provider not-found", async () => {
    const notFound = Object.assign(new Error("provider details"), { $metadata: { httpStatusCode: 404 } });
    const { storage, send } = setup(jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(notFound));
    const key = storage.createOpaqueKey("image/jpeg");
    await expect(storage.delete(reference(key))).resolves.toBeUndefined();
    await expect(storage.delete(reference(key))).resolves.toBeUndefined();
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it("maps provider 404 reads to a safe not-found response", async () => {
    const error = Object.assign(new Error("raw provider XML"), { name: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
    const { storage } = setup(jest.fn().mockRejectedValue(error));
    await expect(storage.read(reference(storage.createOpaqueKey("image/png")))).rejects.toThrow(NotFoundException);
    await expect(storage.read(reference(storage.createOpaqueKey("image/png")))).rejects.not.toThrow("raw provider XML");
  });

  it.each([403, 401, 500])("sanitizes provider status %s and credentials", async (status) => {
    const error = Object.assign(new Error(values.AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY), { $metadata: { httpStatusCode: status } });
    const { storage } = setup(jest.fn().mockRejectedValue(error));
    const operation = storage.read(reference(storage.createOpaqueKey("image/png")));
    await expect(operation).rejects.toThrow("Ad creative storage is temporarily unavailable.");
    await expect(operation).rejects.not.toThrow(values.AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY);
  });

  it("rejects arbitrary keys, traversal and a different bucket before provider access", async () => {
    const { storage, send } = setup(jest.fn());
    for (const key of ["../../secret", "campaigns/vendor-name/file.png", "partner-private/object.png", "https://example.test/a.png"]) {
      expect(() => storage.assertStorageKey(key)).toThrow(BadRequestException);
    }
    const mismatched = { ...reference(storage.createOpaqueKey("image/png")), bucket: "partner-private-bucket" };
    await expect(storage.read(mismatched)).rejects.toThrow("does not match the configured provider");
    expect(send).not.toHaveBeenCalled();
  });

  it("fails closed for local or incomplete production configuration", async () => {
    const local = setup(jest.fn(), { AD_CREATIVE_STORAGE_DRIVER: "local" }).storage;
    await expect(local.put(Buffer.from([1]), "image/png")).rejects.toThrow("Durable ad creative storage is required in production.");
    const incomplete = setup(jest.fn(), { AD_CREATIVE_STORAGE_BUCKET: undefined }).storage;
    await expect(incomplete.put(Buffer.from([1]), "image/png")).rejects.toThrow("Ad creative storage is not configured.");
  });

  it("rejects non-GCS endpoint, region and path-style settings", async () => {
    for (const overrides of [
      { AD_CREATIVE_STORAGE_ENDPOINT: "https://objects.example.test" },
      { AD_CREATIVE_STORAGE_REGION: "us-east-1" },
      { AD_CREATIVE_STORAGE_FORCE_PATH_STYLE: "false" }
    ]) {
      const { storage } = setup(jest.fn(), overrides);
      await expect(storage.put(Buffer.from([1]), "image/png")).rejects.toThrow("GCS interoperability settings are invalid");
    }
  });

  it("uses a read-only authenticated list for readiness", async () => {
    const { storage, send } = setup(jest.fn().mockResolvedValue({ Contents: [] }));
    await expect(storage.readiness()).resolves.toEqual({ driver: "gcs", ready: true });
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command);
    expect(send.mock.calls[0][0].input).toEqual({ Bucket: values.AD_CREATIVE_STORAGE_BUCKET, MaxKeys: 1 });
  });

  it("bounds SDK retries and aborts a stalled provider operation", async () => {
    const config = { get: jest.fn((key: string) => ({ ...values, AD_CREATIVE_STORAGE_TIMEOUT_MS: "5" })[key]) } as unknown as ConfigService;
    const policyStorage = new AdCreativeStorageService(config);
    const client = (policyStorage as unknown as { s3(): { config: { maxAttempts(): Promise<number> }; destroy(): void } }).s3();
    await expect(client.config.maxAttempts()).resolves.toBe(3);
    client.destroy();

    const send = jest.fn((_command: unknown, options: { abortSignal: AbortSignal }) => new Promise((_resolve, reject) => {
      options.abortSignal.addEventListener("abort", () => reject(Object.assign(new Error("stalled"), { name: "AbortError" })));
    }));
    const { storage } = setup(send, { AD_CREATIVE_STORAGE_TIMEOUT_MS: "5" });
    await expect(storage.read(reference(storage.createOpaqueKey("image/png"))))
      .rejects.toThrow("Ad creative storage is temporarily unavailable.");
  });

  it("provides an isolated local adapter without cloud credentials", async () => {
    const root = await mkdtemp(join(tmpdir(), "karigo-ad-storage-"));
    try {
      const { storage } = setup(jest.fn(), {
        APP_ENV: "test",
        AD_CREATIVE_STORAGE_DRIVER: "local",
        AD_CREATIVE_LOCAL_ROOT: root,
        AD_CREATIVE_STORAGE_ENDPOINT: undefined,
        AD_CREATIVE_STORAGE_REGION: undefined,
        AD_CREATIVE_STORAGE_BUCKET: undefined,
        AD_CREATIVE_STORAGE_ACCESS_KEY_ID: undefined,
        AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY: undefined
      });
      const bytes = Buffer.from([9, 8, 7]);
      const stored = await storage.put(bytes, "image/png");
      expect(stored.provider).toBe(AdCreativeStorageProvider.LOCAL_TEST);
      await expect(storage.read(stored)).resolves.toEqual(bytes);
      await storage.delete(stored);
      await storage.delete(stored);
      await expect(storage.read(stored)).rejects.toThrow(NotFoundException);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
