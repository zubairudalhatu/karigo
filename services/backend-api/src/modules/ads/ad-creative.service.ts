import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdCreativeStorageProvider, AdCampaignStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PrismaService } from "../../prisma/prisma.service";

export const AD_CREATIVE_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([["image/jpeg", ".jpg"], ["image/png", ".png"]]);

export function inspectCreative(buffer: Buffer, mimeType: string) {
  if (!ALLOWED.has(mimeType)) throw new BadRequestException("Creative must be a JPEG or PNG image.");
  if (!buffer.length || buffer.length > AD_CREATIVE_MAX_BYTES) throw new BadRequestException("Creative must be between 1 byte and 5 MB.");
  let width = 0;
  let height = 0;
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/png" && buffer.length >= 24 && buffer.subarray(0, 8).equals(pngSignature) && buffer.subarray(12, 16).toString("ascii") === "IHDR") {
    width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20);
  } else if (mimeType === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) { height = buffer.readUInt16BE(offset + 5); width = buffer.readUInt16BE(offset + 7); break; }
      offset += 2 + length;
    }
  }
  if (!width || !height) throw new BadRequestException("Creative image dimensions could not be verified.");
  const ratio = width / height;
  if (width < 600 || height < 300 || ratio < 1.2 || ratio > 2.2) {
    throw new BadRequestException("Creative must be at least 600×300 with an aspect ratio between 1.2:1 and 2.2:1.");
  }
  return { width, height };
}

export function stripJpegMetadata(buffer: Buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
  const chunks = [buffer.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) { chunks.push(buffer.subarray(offset)); break; }
    const marker = buffer[offset + 1];
    if (marker === 0xda) { chunks.push(buffer.subarray(offset)); break; }
    const length = buffer.readUInt16BE(offset + 2);
    const end = offset + 2 + length;
    if (end > buffer.length) throw new BadRequestException("Creative JPEG is malformed.");
    if (![0xe1, 0xed].includes(marker)) chunks.push(buffer.subarray(offset, end));
    offset = end;
  }
  return Buffer.concat(chunks);
}

@Injectable()
export class AdCreativeService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async saveForVendor(userId: string, campaignId: string, file: { buffer: Buffer; mimetype: string; size: number; originalname: string }) {
    const campaign = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, vendor: { is: { userId, deletedAt: null } } } });
    if (!campaign) throw new NotFoundException("Ad campaign not found");
    const { width, height } = inspectCreative(file.buffer, file.mimetype);
    if (this.config.get("APP_ENV", "development") === "production") {
      throw new ServiceUnavailableException("Production ad-creative storage has not been provisioned.");
    }
    const cleaned = file.mimetype === "image/jpeg" ? stripJpegMetadata(file.buffer) : file.buffer;
    const root = this.config.get("AD_CREATIVE_LOCAL_ROOT", join(process.cwd(), ".local", "ad-creatives"));
    await mkdir(root, { recursive: true });
    const storageKey = `${randomBytes(24).toString("hex")}${ALLOWED.get(file.mimetype)}`;
    await writeFile(join(root, storageKey), cleaned, { flag: "wx" });
    const asset = await this.prisma.adCreativeAsset.create({ data: {
      campaignId, provider: AdCreativeStorageProvider.LOCAL_TEST, storageKey, mimeType: file.mimetype,
      byteSize: cleaned.length, width, height, sha256: createHash("sha256").update(cleaned).digest("hex"), metadataStripped: file.mimetype === "image/jpeg"
    }});
    await this.prisma.adCampaignRevision.updateMany({
      where: { campaignId, revisionNumber: campaign.currentRevisionNumber }, data: { creativeAssetId: asset.id, imageUrl: null }
    });
    return { id: asset.id, mimeType: asset.mimeType, byteSize: asset.byteSize, width, height, metadataStripped: asset.metadataStripped };
  }

  async readApproved(assetId: string) {
    const asset = await this.prisma.adCreativeAsset.findFirst({ where: {
      id: assetId, deletedAt: null, revisions: { some: { approvedForCampaign: { is: { status: AdCampaignStatus.ACTIVE } } } }
    }});
    if (!asset || asset.provider !== AdCreativeStorageProvider.LOCAL_TEST) throw new NotFoundException("Creative not found");
    const root = this.config.get("AD_CREATIVE_LOCAL_ROOT", join(process.cwd(), ".local", "ad-creatives"));
    return { buffer: await readFile(join(root, asset.storageKey)), mimeType: asset.mimeType };
  }
}
