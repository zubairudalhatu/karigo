import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { normalize, resolve } from "path";

export interface PrivateVendorFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type StorageDriver = "local" | "s3";

@Injectable()
export class VendorPrivateUploadStorageService {
  private client?: S3Client;

  constructor(private readonly config: ConfigService) {}

  async putOnboardingDocument(vendorId: string, file: PrivateVendorFile) {
    const extension = this.extensionFor(file.mimetype);
    const opaqueSubject = this.opaqueSubject(vendorId);
    const opaqueObject = randomBytes(16).toString("hex");
    const key = `partner-private/${opaqueSubject}/${opaqueObject}${extension}`;
    this.assertOwnedKey(vendorId, key);
    if (this.driver() === "s3") {
      const storage = this.s3Config();
      try {
        await this.s3().send(new PutObjectCommand({
          Bucket: storage.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: storage.serverSideEncryption
        }));
      } catch {
        throw new ServiceUnavailableException("Private Partner document could not be written to storage.");
      }
      return key;
    }
    const path = this.localPathForOwnedKey(vendorId, key);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, file.buffer, { flag: "wx" });
    return key;
  }

  async readOwnedObject(vendorId: string, key: string) {
    this.assertOwnedKey(vendorId, key);
    if (this.driver() === "s3") {
      const storage = this.s3Config();
      try {
        const response = await this.s3().send(new GetObjectCommand({ Bucket: storage.bucket, Key: key }));
        if (!response.Body) throw new Error("missing body");
        return Buffer.from(await response.Body.transformToByteArray());
      } catch {
        throw new ServiceUnavailableException("Private Partner document is unavailable.");
      }
    }
    try {
      return await readFile(this.localPathForOwnedKey(vendorId, key));
    } catch {
      throw new ServiceUnavailableException("Private Partner document is unavailable.");
    }
  }

  async deleteOwnedObject(vendorId: string, key: string) {
    this.assertOwnedKey(vendorId, key);
    if (this.driver() === "s3") {
      const storage = this.s3Config();
      try {
        await this.s3().send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
        return;
      } catch {
        throw new ServiceUnavailableException("Private Partner document could not be removed from storage.");
      }
    }
    try {
      await unlink(this.localPathForOwnedKey(vendorId, key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw new ServiceUnavailableException("Private Partner document could not be removed from storage.");
    }
  }

  assertOwnedKey(vendorId: string, key: string) {
    if (key.includes("..") || key.includes("\\")) throw new BadRequestException("Private upload reference is invalid.");
    const legacyPrefix = `partner-private/vendors/${vendorId}/onboarding-documents/`;
    if (key.startsWith(legacyPrefix)) return;
    const opaqueMatch = key.match(/^partner-private\/([a-f0-9]{32})\/[a-f0-9]{32}(?:\.(?:jpg|jpeg|png|webp|pdf))?$/);
    if (opaqueMatch) {
      const actual = Buffer.from(opaqueMatch[1], "utf8");
      const expected = Buffer.from(this.opaqueSubject(vendorId), "utf8");
      if (actual.length === expected.length && timingSafeEqual(actual, expected)) return;
    }
    throw new BadRequestException("Private upload reference is invalid.");
  }

  storageLocation() {
    if (this.driver() === "local") return { provider: "LOCAL", bucket: "private-uploads" };
    const storage = this.s3Config();
    const provider = storage.endpoint?.includes("storage.googleapis.com") ? "GCS" : "S3_COMPATIBLE";
    return { provider, bucket: storage.bucket };
  }

  private driver(): StorageDriver {
    const configured = (this.config.get<string>("PARTNER_PRIVATE_STORAGE_DRIVER") ?? "local").trim().toLowerCase();
    if (configured !== "local" && configured !== "s3") {
      throw new ServiceUnavailableException("Private Partner storage driver is invalid.");
    }
    const environment = this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV") ?? process.env.NODE_ENV;
    if (configured === "local" && environment === "production") {
      throw new ServiceUnavailableException("Durable private Partner storage is required in production.");
    }
    return configured;
  }

  private root() {
    return resolve(this.config.get<string>("PARTNER_PRIVATE_STORAGE_LOCAL_ROOT") ?? resolve(process.cwd(), "private-uploads"));
  }

  private opaqueSubject(vendorId: string) {
    const secret = this.config.get<string>("PARTNER_PRIVATE_STORAGE_KEY_SECRET")?.trim();
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException("Private Partner object-key protection is not configured.");
    }
    return createHmac("sha256", secret).update(`vendor:${vendorId}`).digest("hex").slice(0, 32);
  }

  private localPathForOwnedKey(vendorId: string, key: string) {
    this.assertOwnedKey(vendorId, key);
    const relative = normalize(key).replaceAll("\\", "/");
    const path = resolve(this.root(), relative);
    if (!path.startsWith(`${this.root()}\\`) && !path.startsWith(`${this.root()}/`)) {
      throw new BadRequestException("Private upload reference is invalid.");
    }
    return path;
  }

  private s3Config() {
    const bucket = this.config.get<string>("PARTNER_PRIVATE_STORAGE_BUCKET")?.trim();
    const endpoint = this.config.get<string>("PARTNER_PRIVATE_STORAGE_ENDPOINT")?.trim();
    const region = this.config.get<string>("PARTNER_PRIVATE_STORAGE_REGION")?.trim();
    const accessKeyId = this.config.get<string>("PARTNER_PRIVATE_STORAGE_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = this.config.get<string>("PARTNER_PRIVATE_STORAGE_SECRET_ACCESS_KEY")?.trim();
    const forcePathStyle = `${this.config.get<string>("PARTNER_PRIVATE_STORAGE_FORCE_PATH_STYLE") ?? ""}`.toLowerCase() === "true";
    const serverSideEncryption = (this.config.get<string>("PARTNER_PRIVATE_STORAGE_SERVER_SIDE_ENCRYPTION") ?? "AES256") as "AES256" | "aws:kms";
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException("Private Partner object storage is not configured.");
    }
    if (endpoint && !endpoint.startsWith("https://")) {
      throw new ServiceUnavailableException("Private Partner object storage endpoint must use HTTPS.");
    }
    if (serverSideEncryption !== "AES256" && serverSideEncryption !== "aws:kms") {
      throw new ServiceUnavailableException("Private Partner object storage encryption setting is invalid.");
    }
    return { bucket, endpoint, region, accessKeyId, secretAccessKey, forcePathStyle, serverSideEncryption };
  }

  private s3() {
    if (this.client) return this.client;
    const storage = this.s3Config();
    this.client = new S3Client({
      endpoint: storage.endpoint || undefined,
      region: storage.region,
      forcePathStyle: storage.forcePathStyle,
      credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey }
    });
    return this.client;
  }

  private extensionFor(mimeType: string) {
    if (mimeType === "application/pdf") return ".pdf";
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/webp") return ".webp";
    return ".jpg";
  }
}
