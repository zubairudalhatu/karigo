import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface CaptainUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class CaptainUploadStorageService {
  private client?: S3Client;

  constructor(private readonly config: ConfigService) {}

  private bucket() {
    return this.config.get<string>("CAPTAIN_UPLOADS_STORAGE_BUCKET")?.trim();
  }

  private storageConfig() {
    const bucket = this.bucket();
    const endpoint = this.config.get<string>("CAPTAIN_UPLOADS_STORAGE_ENDPOINT")?.trim();
    const region = this.config.get<string>("CAPTAIN_UPLOADS_STORAGE_REGION")?.trim();
    const accessKeyId = this.config.get<string>("CAPTAIN_UPLOADS_STORAGE_ACCESS_KEY_ID")?.trim();
    const secretAccessKey = this.config.get<string>("CAPTAIN_UPLOADS_STORAGE_SECRET_ACCESS_KEY")?.trim();
    const forcePathStyle = `${this.config.get<string>("CAPTAIN_UPLOADS_STORAGE_FORCE_PATH_STYLE") ?? ""}`.toLowerCase() === "true";
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException("Captain document storage is not configured.");
    }
    return { bucket, endpoint, region, accessKeyId, secretAccessKey, forcePathStyle };
  }

  private s3() {
    if (this.client) return this.client;
    const config = this.storageConfig();
    this.client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    return this.client;
  }

  configured() {
    return Boolean(this.bucket());
  }

  async putObject(objectKey: string, file: CaptainUploadFile) {
    const config = this.storageConfig();
    await this.s3().send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname.slice(0, 200)
      }
    }));
  }

  async signedViewUrl(objectKey: string, expiresInSeconds = 300) {
    const config = this.storageConfig();
    return getSignedUrl(this.s3(), new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey
    }), { expiresIn: expiresInSeconds });
  }
}
