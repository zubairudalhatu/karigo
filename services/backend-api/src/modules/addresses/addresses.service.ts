import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      const makeDefault = dto.isDefault === true || count === 0;

      if (makeDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }

      return tx.address.create({
        data: { ...dto, userId, country: dto.country ?? "Nigeria", isDefault: makeDefault }
      });
    });
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    await this.requireOwnedAddress(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id: addressId }, data: dto });
    });
  }

  async remove(userId: string, addressId: string) {
    const address = await this.requireOwnedAddress(userId, addressId);
    const linkedOrders = await this.prisma.order.count({
      where: {
        OR: [{ pickupAddressId: addressId }, { deliveryAddressId: addressId }]
      }
    });
    if (linkedOrders > 0) {
      throw new ConflictException("Address cannot be deleted because it is linked to an order");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: addressId } });
      if (address.isDefault) {
        const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
      return { id: addressId };
    });
  }

  async setDefault(userId: string, addressId: string) {
    await this.requireOwnedAddress(userId, addressId);
    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    });
  }

  private async requireOwnedAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) {
      throw new NotFoundException("Address not found");
    }
    return address;
  }
}
