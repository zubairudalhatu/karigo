import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OrderStatus, Prisma, PromoDiscountType, ServiceCategory } from "@prisma/client";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePromoDto } from "./dto/create-promo.dto";
import { UpdatePromoDto } from "./dto/update-promo.dto";
import { ValidatePromoDto } from "./dto/validate-promo.dto";

export interface PromoValidationContext {
  subtotal: Prisma.Decimal;
  deliveryFee: Prisma.Decimal;
  vendorId?: string | null;
  serviceCategory?: ServiceCategory;
  orderId?: string;
}

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AdminAuditService, private readonly config: ConfigService) {}

  async create(adminUserId: string, dto: CreatePromoDto) {
    this.assertDates(dto.startsAt, dto.endsAt);
    this.assertDiscount(dto.discountType, dto.discountValue);
    try {
      const promo = await this.prisma.promoCode.create({
        data: {
          code: this.normalize(dto.code),
          title: dto.title,
          description: dto.description,
          discountType: dto.discountType,
          discountValue: new Prisma.Decimal(dto.discountValue),
          maxDiscountAmount: dto.maxDiscountAmount !== undefined ? new Prisma.Decimal(dto.maxDiscountAmount) : undefined,
          minimumOrderAmount: new Prisma.Decimal(dto.minimumOrderAmount ?? 0),
          usageLimit: dto.usageLimit,
          usageLimitPerCustomer: dto.usageLimitPerCustomer ?? 1,
          firstOrderOnly: dto.firstOrderOnly ?? false,
          serviceCategory: dto.serviceCategory,
          vendorId: dto.vendorId,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          isActive: dto.isActive ?? true,
          createdByAdminId: adminUserId
        }
      });
      await this.audit.record(adminUserId, "promo.created", "PromoCode", promo.id, { code: promo.code });
      return promo;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Promo code already exists");
      }
      throw error;
    }
  }

  list() {
    return this.prisma.promoCode.findMany({
      include: { vendor: { select: { id: true, businessName: true } }, _count: { select: { usages: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async detail(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
      include: { vendor: { select: { id: true, businessName: true } }, _count: { select: { usages: true } } }
    });
    if (!promo) throw new NotFoundException("Promo code not found");
    return promo;
  }

  async update(adminUserId: string, id: string, dto: UpdatePromoDto) {
    const existing = await this.detail(id);
    const startsAt = dto.startsAt ?? existing.startsAt.toISOString();
    const endsAt = dto.endsAt ?? existing.endsAt.toISOString();
    this.assertDates(startsAt, endsAt);
    this.assertDiscount(dto.discountType ?? existing.discountType, dto.discountValue ?? existing.discountValue.toNumber());
    const promo = await this.prisma.promoCode.update({
      where: { id },
      data: {
        ...this.promoData(dto),
        ...(dto.code ? { code: this.normalize(dto.code) } : {})
      }
    });
    await this.audit.record(adminUserId, "promo.updated", "PromoCode", id, { code: promo.code });
    return promo;
  }

  async deactivate(adminUserId: string, id: string) {
    await this.detail(id);
    const promo = await this.prisma.promoCode.update({ where: { id }, data: { isActive: false } });
    await this.audit.record(adminUserId, "promo.deactivated", "PromoCode", id, { code: promo.code });
    return promo;
  }

  async validate(userId: string, dto: ValidatePromoDto) {
    const customer = await this.requireCustomer(userId);
    let context: PromoValidationContext = {
      subtotal: new Prisma.Decimal(dto.subtotal),
      deliveryFee: new Prisma.Decimal(dto.deliveryFee ?? this.config.get<number>("STANDARD_DELIVERY_FEE", 1000)),
      vendorId: dto.vendorId,
      serviceCategory: dto.serviceCategory,
      orderId: dto.orderId
    };
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({ where: { id: dto.orderId, customerId: customer.id } });
      if (!order) throw new NotFoundException("Order not found");
      context = {
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        vendorId: order.vendorId,
        serviceCategory: order.serviceCategory,
        orderId: order.id
      };
    }
    return this.validateForCustomer(customer.id, dto.promoCode, context);
  }

  async validateForCustomer(customerId: string, code: string, context: PromoValidationContext) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code: this.normalize(code) } });
    if (!promo) throw new NotFoundException("Promo code not found");
    const now = new Date();
    if (!promo.isActive) throw new BadRequestException("Promo code is inactive");
    if (now < promo.startsAt || now > promo.endsAt) throw new BadRequestException("Promo code is outside its valid date range");
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) throw new BadRequestException("Promo code usage limit reached");
    if (context.subtotal.lessThan(promo.minimumOrderAmount)) throw new BadRequestException("Order subtotal does not meet promo minimum");
    if (promo.vendorId && promo.vendorId !== context.vendorId) throw new BadRequestException("Promo code is not valid for this vendor");
    if (promo.serviceCategory && promo.serviceCategory !== context.serviceCategory) throw new BadRequestException("Promo code is not valid for this service category");
    const [customerUsageCount, completedOrders] = await Promise.all([
      this.prisma.promoCodeUsage.count({ where: { promoCodeId: promo.id, customerId } }),
      promo.firstOrderOnly
        ? this.prisma.order.count({ where: { customerId, orderStatus: OrderStatus.COMPLETED } })
        : Promise.resolve(0)
    ]);
    if (promo.usageLimitPerCustomer !== null && customerUsageCount >= promo.usageLimitPerCustomer) {
      throw new BadRequestException("Customer promo usage limit reached");
    }
    if (promo.firstOrderOnly && completedOrders > 0) throw new BadRequestException("Promo code is only valid for a first order");

    let discount = promo.discountType === PromoDiscountType.PERCENTAGE
      ? context.subtotal.mul(promo.discountValue).div(100)
      : promo.discountValue;
    if (promo.maxDiscountAmount && discount.greaterThan(promo.maxDiscountAmount)) discount = promo.maxDiscountAmount;
    if (discount.greaterThan(context.subtotal)) discount = context.subtotal;
    const finalPayableAmount = context.subtotal.add(context.deliveryFee).sub(discount);
    return { promo, deliveryFee: context.deliveryFee, discountAmount: discount, finalPayableAmount: finalPayableAmount.lessThan(0) ? new Prisma.Decimal(0) : finalPayableAmount };
  }

  async report() {
    const promos = await this.prisma.promoCode.findMany({
      include: { usages: { select: { discountAmount: true, customerId: true, orderId: true } } },
      orderBy: { createdAt: "desc" }
    });
    return promos.map((promo) => ({
      promoCode: promo.code,
      status: promo.isActive ? "ACTIVE" : "INACTIVE",
      totalUsage: promo.usages.length,
      totalDiscountGiven: promo.usages.reduce((sum, usage) => sum.add(usage.discountAmount), new Prisma.Decimal(0)),
      ordersLinked: new Set(promo.usages.map((usage) => usage.orderId)).size,
      customersReached: new Set(promo.usages.map((usage) => usage.customerId)).size,
      startDate: promo.startsAt,
      endDate: promo.endsAt
    }));
  }

  private requireCustomer(userId: string) {
    return this.prisma.customerProfile.findUnique({ where: { userId } }).then((customer) => {
      if (!customer) throw new NotFoundException("Customer profile not found");
      return customer;
    });
  }
  private normalize(code: string) { return code.trim().toUpperCase(); }
  private assertDates(start: string, end: string) {
    if (new Date(start) >= new Date(end)) throw new BadRequestException("Promo end date must be after start date");
  }
  private assertDiscount(type: PromoDiscountType, value: number) {
    if (type === PromoDiscountType.PERCENTAGE && value > 100) throw new BadRequestException("Percentage discount cannot exceed 100");
  }
  private promoData(dto: Partial<CreatePromoDto>) {
    return {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
      ...(dto.discountValue !== undefined ? { discountValue: new Prisma.Decimal(dto.discountValue) } : {}),
      ...(dto.maxDiscountAmount !== undefined ? { maxDiscountAmount: new Prisma.Decimal(dto.maxDiscountAmount) } : {}),
      ...(dto.minimumOrderAmount !== undefined ? { minimumOrderAmount: new Prisma.Decimal(dto.minimumOrderAmount) } : {}),
      ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
      ...(dto.usageLimitPerCustomer !== undefined ? { usageLimitPerCustomer: dto.usageLimitPerCustomer } : {}),
      ...(dto.firstOrderOnly !== undefined ? { firstOrderOnly: dto.firstOrderOnly } : {}),
      ...(dto.serviceCategory !== undefined ? { serviceCategory: dto.serviceCategory } : {}),
      ...(dto.vendorId !== undefined ? { vendorId: dto.vendorId } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
    };
  }
}
