import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AdCampaignStatus, UserRole } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AdCreativeStorageReference, AdCreativeStorageService } from "./ad-creative-storage.service";
import { deliveryBudgetEligible } from "./ad-policy";
import { lagosDayKey } from "./ad-reporting";

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
  constructor(private readonly prisma: PrismaService, private readonly storage: AdCreativeStorageService) {}

  async saveForVendor(userId: string, campaignId: string, file: { buffer: Buffer; mimetype: string; size: number; originalname: string }) {
    const campaign = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, vendor: { is: { userId, deletedAt: null } } } });
    if (!campaign) throw new NotFoundException("Ad campaign not found");
    const revision = await this.prisma.adCampaignRevision.findUnique({
      where: { campaignId_revisionNumber: { campaignId, revisionNumber: campaign.currentRevisionNumber } }
    });
    if (!revision) throw new NotFoundException("Ad campaign revision not found");
    if (campaign.approvedRevisionId === revision.id) {
      throw new BadRequestException("Create a replacement revision before uploading new creative bytes.");
    }
    const { width, height } = inspectCreative(file.buffer, file.mimetype);
    const cleaned = file.mimetype === "image/jpeg" ? stripJpegMetadata(file.buffer) : file.buffer;
    const stored = await this.storage.put(cleaned, file.mimetype as "image/jpeg" | "image/png");
    try {
      const asset = await this.prisma.$transaction(async (tx) => {
        const created = await tx.adCreativeAsset.create({ data: {
          campaignId, provider: stored.provider, bucket: stored.bucket, storageKey: stored.storageKey, mimeType: file.mimetype,
          byteSize: cleaned.length, width, height, sha256: createHash("sha256").update(cleaned).digest("hex"), metadataStripped: file.mimetype === "image/jpeg"
        }});
        await tx.adCampaignRevision.updateMany({
          where: { campaignId, revisionNumber: campaign.currentRevisionNumber }, data: { creativeAssetId: created.id, imageUrl: null }
        });
        return created;
      });
      return { id: asset.id, mimeType: asset.mimeType, byteSize: asset.byteSize, width, height, metadataStripped: asset.metadataStripped };
    } catch (error) {
      await this.storage.delete(stored).catch(() => undefined);
      throw error;
    }
  }

  async readForActor(assetId: string, actor: Pick<AuthenticatedUser, "id" | "role">) {
    if (actor.role === UserRole.CUSTOMER) return this.readApproved(assetId);
    const asset = await this.prisma.adCreativeAsset.findFirst({
      where: {
        id: assetId,
        deletedAt: null,
        ...(actor.role === UserRole.VENDOR ? { campaign: { is: { vendor: { is: { userId: actor.id, deletedAt: null } } } } } : {})
      }
    });
    if (!asset || (actor.role !== UserRole.VENDOR && actor.role !== UserRole.ADMIN)) throw new NotFoundException("Creative not found");
    return { buffer: await this.storage.read(this.reference(asset)), mimeType: asset.mimeType };
  }

  async readApproved(assetId: string) {
    const asset = await this.prisma.adCreativeAsset.findFirst({
      where: { id: assetId, deletedAt: null },
      include: { campaign: { include: { approvedRevision: true } } }
    });
    if (!asset || !(await this.customerReadable(asset))) throw new NotFoundException("Creative not found");
    return { buffer: await this.storage.read(this.reference(asset)), mimeType: asset.mimeType };
  }

  async deleteForVendor(userId: string, assetId: string) {
    const asset = await this.prisma.adCreativeAsset.findFirst({
      where: { id: assetId, deletedAt: null, campaign: { is: { vendor: { is: { userId, deletedAt: null } } } } },
      include: { campaign: { include: { approvedRevision: true } } }
    });
    if (!asset) throw new NotFoundException("Creative not found");
    if (asset.campaign.approvedRevision?.creativeAssetId === asset.id) {
      throw new ForbiddenException("An approved live creative cannot be deleted.");
    }
    await this.storage.delete(this.reference(asset));
    await this.prisma.adCreativeAsset.update({ where: { id: asset.id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  private async customerReadable(asset: {
    id: string;
    campaign: {
      id: string;
      status: AdCampaignStatus;
      approvedRevisionId: string | null;
      vendorId: string | null;
      reservedCreditKobo: number;
      spentKobo: number;
      approvedRevision: {
        id: string;
        creativeAssetId: string | null;
        requestedBudgetKobo: number;
        dailyBudgetKobo: number | null;
        startsAt: Date | null;
        endsAt: Date | null;
      } | null;
    };
  }) {
    const revision = asset.campaign.approvedRevision;
    const now = new Date();
    if (!(asset.campaign.status === AdCampaignStatus.ACTIVE
      && Boolean(revision)
      && asset.campaign.approvedRevisionId === revision!.id
      && revision!.creativeAssetId === asset.id
      && (!revision!.startsAt || revision!.startsAt <= now)
      && (!revision!.endsAt || revision!.endsAt >= now))) return false;
    const dayStart = new Date(`${lagosDayKey(now)}T00:00:00+01:00`);
    const spend = await this.prisma.adCampaignEvent.aggregate({
      where: { campaignId: asset.campaign.id, occurredAt: { gte: dayStart, lte: now } },
      _sum: { costKobo: true }
    });
    return deliveryBudgetEligible({
      requestedBudgetKobo: revision!.requestedBudgetKobo,
      dailyBudgetKobo: revision!.dailyBudgetKobo,
      spentKobo: asset.campaign.spentKobo,
      spentTodayKobo: spend._sum.costKobo ?? 0,
      vendorFunded: Boolean(asset.campaign.vendorId),
      reservedCreditKobo: asset.campaign.reservedCreditKobo
    });
  }

  private reference(asset: { provider: AdCreativeStorageReference["provider"]; bucket: string | null; storageKey: string }): AdCreativeStorageReference {
    return { provider: asset.provider, bucket: asset.bucket, storageKey: asset.storageKey };
  }
}
