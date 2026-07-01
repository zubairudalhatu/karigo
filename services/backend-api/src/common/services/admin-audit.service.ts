import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(adminUserId: string, action: string, entityType: string, entityId: string, details: object = {}) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        entityType,
        entityId,
        newValue: details as Prisma.InputJsonValue
      }
    });
  }
}
