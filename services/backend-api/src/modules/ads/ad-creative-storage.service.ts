import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { AdCreativeStorageProvider } from "@prisma/client";
import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { normalize, resolve } from "path";
import { randomBytes } from "crypto";

export type AdCreativeStorageDriver = "local" | "gcs";

export interface AdCreativeStorageReference {
  provider: AdCreativeStorageProvider;
  bucket: string | null;
  storageKey: string;
}

export interface StoredAdCreative extends AdCreativeStorageReference {
  byteSize: number;
}

const OPAQUE_KEY_PATTERN = /^campaigns\/[a-f0-9]{32}\/revisions\/[a-f0-9]{32}\/[a-f0-9]{32}\.(?:jpg|png)$/;
const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_TIMEOUT_MS = 30_000;

@Injectable()
export class AdCreativeStorageService {
  private readonly logger = new Logger(AdCreativeStorageService.name);
  private client?: S3Client;

  constructor(private readonly config: ConfigService) {}

  async put(buffer: Buffer, mimeType: "image/jpeg" | "image/png"): Promise<StoredAdCreative> {
    const storageKey = this.createOpaqueKey(mimeType);
    if (this.driver() === "local") {
      const path = this.localPath(storageKey);
      await mkdir(resolve(path, ".."), { recursive: true });
      await writeFile(path, buffer, { flag: "wx" });
      return { provider: AdCreativeStorageProvider.LOCAL_TEST, bucket: null, storageKey, byteSize: buffer.length };
    }

    const storage = this.gcsConfig();
    try {
      await this.send(new PutObjectCommand({
        Bucket: storage.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length
      }));
      return { provider: AdCreativeStorageProvider.GCS, bucket: storage.bucket, storageKey, byteSize: buffer.length };
    } catch (error) {
      this.logFailure("put", error);
      throw new ServiceUnavailableException("Ad creative could not be written to storage.");
    }
  }

  async read(reference: AdCreativeStorageReference): Promise<Buffer> {
    this.assertReference(reference);
    if (reference.provider === AdCreativeStorageProvider.LOCAL_TEST) {
      try {
        return await readFile(this.localPath(reference.storageKey));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new NotFoundException("Creative not found");
        throw new ServiceUnavailableException("Ad creative storage is temporarily unavailable.");
      }
    }

    try {
      const response = await this.send(new GetObjectCommand({ Bucket: reference.bucket!, Key: reference.storageKey })) as GetObjectCommandOutput;
      if (!response.Body) throw new Error("missing_body");
      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      if (this.isNotFound(error)) throw new NotFoundException("Creative not found");
      this.logFailure("read", error);
      throw new ServiceUnavailableException("Ad creative storage is temporarily unavailable.");
    }
  }

  async head(reference: AdCreativeStorageReference): Promise<{ byteSize: number; contentType?: string }> {
    this.assertReference(reference);
    if (reference.provider === AdCreativeStorageProvider.LOCAL_TEST) {
      try {
        const details = await stat(this.localPath(reference.storageKey));
        return { byteSize: details.size };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new NotFoundException("Creative not found");
        throw new ServiceUnavailableException("Ad creative storage is temporarily unavailable.");
      }
    }

    try {
      const response = await this.send(new HeadObjectCommand({ Bucket: reference.bucket!, Key: reference.storageKey })) as HeadObjectCommandOutput;
      return { byteSize: response.ContentLength ?? 0, contentType: response.ContentType };
    } catch (error) {
      if (this.isNotFound(error)) throw new NotFoundException("Creative not found");
      this.logFailure("head", error);
      throw new ServiceUnavailableException("Ad creative storage is temporarily unavailable.");
    }
  }

  async delete(reference: AdCreativeStorageReference): Promise<void> {
    this.assertReference(reference);
    if (reference.provider === AdCreativeStorageProvider.LOCAL_TEST) {
      try {
        await unlink(this.localPath(reference.storageKey));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
        throw new ServiceUnavailableException("Ad creative could not be removed from storage.");
      }
      return;
    }

    try {
      await this.send(new DeleteObjectCommand({ Bucket: reference.bucket!, Key: reference.storageKey }));
    } catch (error) {
      if (this.isNotFound(error)) return;
      this.logFailure("delete", error);
      throw new ServiceUnavailableException("Ad creative could not be removed from storage.");
    }
  }

  async readiness(): Promise<{ driver: AdCreativeStorageDriver; ready: true }> {
    const driver = this.driver();
    if (driver === "local") {
      await mkdir(this.localRoot(), { recursive: true });
      return { driver, ready: true };
    }
    const storage = this.gcsConfig();
    try {
      await this.send(new ListObjectsV2Command({ Bucket: storage.bucket, MaxKeys: 1 }));
      return { driver, ready: true };
    } catch (error) {
      this.logFailure("readiness", error);
      throw new ServiceUnavailableException("Ad creative storage is not ready.");
    }
  }

  createOpaqueKey(mimeType: "image/jpeg" | "image/png") {
    const extension = mimeType === "image/png" ? ".png" : ".jpg";
    return `campaigns/${randomBytes(16).toString("hex")}/revisions/${randomBytes(16).toString("hex")}/${randomBytes(16).toString("hex")}${extension}`;
  }

  assertStorageKey(storageKey: string) {
    if (!OPAQUE_KEY_PATTERN.test(storageKey)) throw new BadRequestException("Creative storage reference is invalid.");
  }

  private assertReference(reference: AdCreativeStorageReference) {
    this.assertStorageKey(reference.storageKey);
    const driver = this.driver();
    if (driver === "local") {
      if (reference.provider !== AdCreativeStorageProvider.LOCAL_TEST || reference.bucket !== null) {
        throw new ServiceUnavailableException("Creative storage reference does not match the configured provider.");
      }
      return;
    }
    const storage = this.gcsConfig();
    if (reference.provider !== AdCreativeStorageProvider.GCS || reference.bucket !== storage.bucket) {
      throw new ServiceUnavailableException("Creative storage reference does not match the configured provider.");
    }
  }

  private driver(): AdCreativeStorageDriver {
    const value = (this.config.get<string>("AD_CREATIVE_STORAGE_DRIVER") ?? "local").trim().toLowerCase();
    if (value !== "local" && value !== "gcs") {
      throw new ServiceUnavailableException("Ad creative storage driver is invalid.");
    }
    const environment = this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV") ?? process.env.NODE_ENV;
    if (environment === "production" && value !== "gcs") {
      throw new ServiceUnavailableException("Durable ad creative storage is required in production.");
    }
    return value;
  }

  private gcsConfig() {
    const endpoint = this.config.get<string>("AD_CREATIVE_STORAGE_ENDPOINT")?.trim();
    const region = this.config.get<string>("AD_CREATIVE_STORAGE_REGION")?.trim();
    const bucket = this.config.get<string>("AD_CREATIVE_STORAGE_BUCKET")?.trim();
    const accessKeyId = this.config.get<string>("AD_CREATIVE_STORAGE_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = this.config.get<string>("AD_CREATIVE_STORAGE_SECRET_ACCESS_KEY")?.trim();
    const forcePathStyle = `${this.config.get<string>("AD_CREATIVE_STORAGE_FORCE_PATH_STYLE") ?? ""}`.trim().toLowerCase() === "true";
    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException("Ad creative storage is not configured.");
    }
    if (endpoint !== "https://storage.googleapis.com" || region !== "auto" || !forcePathStyle) {
      throw new ServiceUnavailableException("Ad creative GCS interoperability settings are invalid.");
    }
    return { endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle };
  }

  private localRoot() {
    return resolve(this.config.get<string>("AD_CREATIVE_LOCAL_ROOT") ?? resolve(process.cwd(), ".local", "ad-creatives"));
  }

  private localPath(storageKey: string) {
    this.assertStorageKey(storageKey);
    const root = this.localRoot();
    const path = resolve(root, normalize(storageKey));
    const relative = path.slice(root.length);
    if (!relative.startsWith("\\") && !relative.startsWith("/")) throw new BadRequestException("Creative storage reference is invalid.");
    return path;
  }

  private s3() {
    if (this.client) return this.client;
    const storage = this.gcsConfig();
    this.client = new S3Client({
      endpoint: storage.endpoint,
      region: storage.region,
      forcePathStyle: storage.forcePathStyle,
      credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey },
      maxAttempts: 3
    });
    return this.client;
  }

  private async send(command: object): Promise<unknown> {
    const configured = Number(this.config.get<string>("AD_CREATIVE_STORAGE_TIMEOUT_MS") ?? DEFAULT_TIMEOUT_MS);
    const timeoutMs = Number.isInteger(configured) && configured > 0 && configured <= MAX_TIMEOUT_MS ? configured : DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await (this.s3() as unknown as {
        send(input: object, options: { abortSignal: AbortSignal }): Promise<unknown>;
      }).send(command, { abortSignal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private isNotFound(error: unknown) {
    const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    return candidate?.$metadata?.httpStatusCode === 404 || candidate?.name === "NoSuchKey" || candidate?.Code === "NoSuchKey";
  }

  private logFailure(operation: string, error: unknown) {
    const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    const status = candidate?.$metadata?.httpStatusCode;
    const category = status === 401 || status === 403
      ? "authentication_or_permission"
      : candidate?.name === "AbortError" ? "timeout" : status && status >= 500 ? "provider_unavailable" : "provider_error";
    this.logger.warn(`Ad creative storage ${operation} failed (${category}${status ? `:${status}` : ""}).`);
  }
}
