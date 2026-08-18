import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isUUID } from "class-validator";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  record(adminUserId: string, action: string, entityType: string, entityId: string | null, details: object = {}) {
    if (!isUUID(adminUserId)) {
      this.logger.error(`Rejected Admin audit write with an invalid actor identifier for action=${action} entityType=${entityType}`);
      throw new InternalServerErrorException("Authenticated Admin identity could not be resolved for audit recording.");
    }

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
