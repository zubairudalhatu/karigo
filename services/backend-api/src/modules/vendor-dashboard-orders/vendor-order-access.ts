import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";

export const partnerOrderAccessHash = (token: string) => createHash("sha256").update(`partner-access:${token}`).digest("hex");
export async function approvedOrderVendor(db: PrismaService | Prisma.TransactionClient, userId: string, accessHash?: string) {
  if (accessHash && await db.partnerMobileSession.findFirst({ where: { userId, refreshHash: accessHash, purpose: "REVOKED_ACCESS", expiresAt: { gt: new Date() } } })) {
    throw new UnauthorizedException("Partner session was signed out. Sign in again.");
  }
  const vendor = await db.vendor.findFirst({ where: { userId, deletedAt: null, status: "ACTIVE", user: { deletedAt: null, accountStatus: "ACTIVE", phoneVerified: true } }, select: { id: true } });
  if (!vendor) throw new ForbiddenException("Approved business-owner access is required for orders.");
  return vendor;
}

@Injectable()
export class VendorOrderAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token || !req.user?.id) throw new UnauthorizedException();
    req.partnerOrderAccessHash = partnerOrderAccessHash(token);
    await approvedOrderVendor(this.prisma, req.user.id, req.partnerOrderAccessHash);
    return true;
  }
}
