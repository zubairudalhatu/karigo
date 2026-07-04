import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationType, OrderStatus, PaymentStatus, Prisma, ServiceCategory, VendorStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { CreateParcelOrderDto } from "./dto/create-parcel-order.dto";
import { PromoService } from "../promos/promo.service";
import { NotificationsService } from "../notifications/notifications.service";

const VENDOR_ORDER_CATEGORIES: ServiceCategory[] = [
  ServiceCategory.FOOD,
  ServiceCategory.GROCERY,
  ServiceCategory.MARKET
];

const DELIVERY_OTP_VISIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.ARRIVED_DESTINATION,
  OrderStatus.DELIVERED
];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly promos: PromoService,
    private readonly notifications: NotificationsService
  ) {}

  async quoteVendorOrder(userId: string, dto: CreateOrderDto) {
    if (!VENDOR_ORDER_CATEGORIES.includes(dto.serviceCategory)) {
      throw new BadRequestException("Vendor orders support FOOD, GROCERY or MARKET categories");
    }

    const [customer, vendor, deliveryAddress] = await Promise.all([
      this.requireCustomer(userId),
      this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, status: VendorStatus.ACTIVE, deletedAt: null },
        select: { id: true }
      }),
      this.prisma.address.findFirst({
        where: { id: dto.deliveryAddressId, userId },
        select: { id: true }
      })
    ]);

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    if (!deliveryAddress) {
      throw new NotFoundException("Delivery address not found");
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        vendorId: dto.vendorId,
        isActive: true,
        isAvailable: true,
        deletedAt: null
      },
      select: { id: true, price: true }
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("One or more products are unavailable");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const subtotal = dto.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum.add(product.price.mul(item.quantity));
    }, new Prisma.Decimal(0));
    const deliveryFee = new Prisma.Decimal(this.config.get<number>("STANDARD_DELIVERY_FEE", 1000));
    const promo = dto.promoCode
      ? await this.promos.validateForCustomer(customer.id, dto.promoCode, {
          subtotal,
          deliveryFee,
          vendorId: dto.vendorId,
          serviceCategory: dto.serviceCategory
        })
      : null;
    const discountAmount = promo?.discountAmount ?? new Prisma.Decimal(0);
    const finalPayableAmount = subtotal.add(deliveryFee).sub(discountAmount);

    return {
      quoteReference: `KGO-QUOTE-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`,
      cartSubtotal: subtotal,
      deliveryFee,
      discountAmount,
      finalPayableAmount,
      promoCode: promo?.promo.code,
      createdAt: new Date().toISOString()
    };
  }

  async createVendorOrder(userId: string, dto: CreateOrderDto) {
    if (!VENDOR_ORDER_CATEGORIES.includes(dto.serviceCategory)) {
      throw new BadRequestException("Vendor orders support FOOD, GROCERY or MARKET categories");
    }

    const [customer, vendor, deliveryAddress] = await Promise.all([
      this.requireCustomer(userId),
      this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, status: VendorStatus.ACTIVE, deletedAt: null },
        select: { id: true }
      }),
      this.prisma.address.findFirst({
        where: { id: dto.deliveryAddressId, userId },
        select: { id: true }
      })
    ]);

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    if (!deliveryAddress) {
      throw new NotFoundException("Delivery address not found");
    }

    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        vendorId: dto.vendorId,
        isActive: true,
        isAvailable: true,
        deletedAt: null
      },
      select: { id: true, name: true, price: true }
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("One or more products are unavailable");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const items = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const totalPrice = product.price.mul(item.quantity);
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        totalPrice,
        specialInstruction: item.specialInstruction
      };
    });
    const subtotal = items.reduce((sum, item) => sum.add(item.totalPrice), new Prisma.Decimal(0));
    const deliveryFee = new Prisma.Decimal(this.config.get<number>("STANDARD_DELIVERY_FEE", 1000));
    const promo = dto.promoCode
      ? await this.promos.validateForCustomer(customer.id, dto.promoCode, {
          subtotal,
          deliveryFee,
          vendorId: dto.vendorId,
          serviceCategory: dto.serviceCategory
        })
      : null;
    const discountAmount = promo?.discountAmount ?? new Prisma.Decimal(0);
    const totalAmount = subtotal.add(deliveryFee).sub(discountAmount);

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.orderNumber(),
        customerId: customer.id,
        vendorId: dto.vendorId,
        serviceCategory: dto.serviceCategory,
        orderStatus: OrderStatus.AWAITING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        deliveryAddressId: dto.deliveryAddressId,
        customerNote: dto.customerNote,
        subtotal,
        deliveryFee,
        discountAmount,
        totalAmount,
        promoCodeId: promo?.promo.id,
        items: { create: items },
        statusHistory: {
          create: {
            newStatus: OrderStatus.AWAITING_PAYMENT,
            changedByUserId: userId,
            changedByRole: "CUSTOMER",
            note: "Order created and awaiting payment"
          }
        }
      },
      include: this.orderInclude()
    });
    await this.notifications.createNotification({ userId, title: "Order created", message: `Order ${order.orderNumber} was created and is awaiting payment.`, type: NotificationType.ORDER_CREATED, entityType: "Order", entityId: order.id });
    return order;
  }

  async createParcelOrder(userId: string, dto: CreateParcelOrderDto) {
    const customer = await this.requireCustomer(userId);
    const addressCount = await this.prisma.address.count({
      where: { id: { in: [dto.pickupAddressId, dto.deliveryAddressId] }, userId }
    });
    const expectedAddressCount = new Set([dto.pickupAddressId, dto.deliveryAddressId]).size;
    if (addressCount !== expectedAddressCount) {
      throw new NotFoundException("Pickup or delivery address not found");
    }

    const deliveryFee = new Prisma.Decimal(this.config.get<number>("PARCEL_DELIVERY_FEE", 1500));
    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.orderNumber(),
        customerId: customer.id,
        serviceCategory: ServiceCategory.PARCEL,
        orderStatus: OrderStatus.AWAITING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        pickupAddressId: dto.pickupAddressId,
        deliveryAddressId: dto.deliveryAddressId,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        itemDescription: dto.itemDescription,
        customerNote: dto.customerNote,
        deliveryFee,
        totalAmount: deliveryFee,
        statusHistory: {
          create: {
            newStatus: OrderStatus.AWAITING_PAYMENT,
            changedByUserId: userId,
            changedByRole: "CUSTOMER",
            note: "Parcel request created and awaiting payment"
          }
        }
      },
      include: this.orderInclude()
    });
    await this.notifications.createNotification({ userId, title: "Parcel request created", message: `Parcel request ${order.orderNumber} was created and is awaiting payment.`, type: NotificationType.ORDER_CREATED, entityType: "Order", entityId: order.id });
    return order;
  }

  async listMine(userId: string) {
    const customer = await this.requireCustomer(userId);
    return this.prisma.order.findMany({
      where: { customerId: customer.id },
      include: this.orderInclude(),
      orderBy: { createdAt: "desc" }
    });
  }

  async detail(userId: string, orderId: string) {
    const customer = await this.requireCustomer(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: customer.id },
      include: this.orderInclude()
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return order;
  }

  async tracking(userId: string, orderId: string) {
    const order = await this.detail(userId, orderId);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      statusHistory: order.statusHistory
    };
  }

  async deliveryOtp(userId: string, orderId: string) {
    const customer = await this.requireCustomer(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: customer.id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        deliveryOtp: true
      }
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (!DELIVERY_OTP_VISIBLE_STATUSES.includes(order.orderStatus)) {
      throw new BadRequestException("Delivery code is only available after the rider arrives.");
    }
    if (!order.deliveryOtp) {
      throw new BadRequestException("Delivery code is no longer available for this order.");
    }
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryOtp: order.deliveryOtp
    };
  }

  private async requireCustomer(userId: string) {
    const customer = await this.prisma.customerProfile.findUnique({ where: { userId } });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }
    return customer;
  }

  private orderNumber(): string {
    return `KGO-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  private orderInclude() {
    return {
      items: true,
      vendor: {
        select: {
          id: true,
          businessName: true,
          businessCategory: true,
          address: true,
          city: true,
          state: true,
          logoUrl: true,
          isOpen: true
        }
      },
      pickupAddress: true,
      deliveryAddress: true,
      statusHistory: { orderBy: { createdAt: "asc" as const } }
    };
  }
}
