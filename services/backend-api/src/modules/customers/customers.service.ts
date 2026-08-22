import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { publicUserSelect } from "../users/users.service";
import { UpdateCustomerProfileDto } from "./dto/update-customer-profile.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...publicUserSelect,
        customerProfile: true
      }
    });

    if (!customer?.customerProfile) {
      throw new NotFoundException("Customer profile not found");
    }

    return this.customerResponse(customer);
  }

  async update(userId: string, dto: UpdateCustomerProfileDto) {
    try {
      const { requireRidePin, ...userFields } = dto;
      const customer = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...userFields,
          ...(requireRidePin === undefined ? {} : { customerProfile: { update: { requireRidePin } } })
        },
        select: {
          ...publicUserSelect,
          customerProfile: true
        }
      });
      if (!customer.customerProfile) throw new NotFoundException("Customer profile not found");
      return this.customerResponse(customer);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Email address is already registered");
      }
      throw error;
    }
  }

  async retentionSummary(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException("Customer profile not found");
    const [totalOrders, completedOrders, firstOrder, lastOrder, promoUsageCount] = await Promise.all([
      this.prisma.order.count({ where: { customerId: customer.id } }),
      this.prisma.order.count({ where: { customerId: customer.id, orderStatus: OrderStatus.COMPLETED } }),
      this.prisma.order.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      this.prisma.order.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      this.prisma.promoCodeUsage.count({ where: { customerId: customer.id } })
    ]);
    return {
      totalOrders,
      completedOrders,
      firstOrderDate: firstOrder?.createdAt ?? null,
      lastOrderDate: lastOrder?.createdAt ?? null,
      promoUsageCount,
      isRepeatCustomer: completedOrders > 1
    };
  }

  private customerResponse<T extends { customerProfile: { requireRidePin: boolean } | null }>(customer: T) {
    if (!customer.customerProfile) throw new NotFoundException("Customer profile not found");
    return {
      ...customer,
      requireRidePin: customer.customerProfile.requireRidePin
    };
  }
}
