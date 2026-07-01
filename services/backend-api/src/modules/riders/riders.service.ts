import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { publicUserSelect } from "../users/users.service";
import { UpdateRiderProfileDto } from "./dto/update-rider-profile.dto";

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: {
        user: { select: publicUserSelect },
        documents: true
      }
    });

    if (!rider) {
      throw new NotFoundException("Rider profile not found");
    }

    return rider;
  }

  async update(userId: string, dto: UpdateRiderProfileDto) {
    await this.me(userId);
    return this.prisma.rider.update({
      where: { userId },
      data: dto,
      include: {
        user: { select: publicUserSelect },
        documents: true
      }
    });
  }
}

