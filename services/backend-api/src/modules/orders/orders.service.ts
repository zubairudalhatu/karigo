import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CashCollectionStatus,
  NotificationType,
  OrderPaymentMethod,
  OrderStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  ServiceCategory,
  VendorStatus,
  WalletLedgerDirection,
  WalletLedgerEntryStatus,
  WalletLedgerEntryType,
  WalletStatus
} from "@prisma/client";
import { randomBytes } from "crypto";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
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
const LAUNCH_PAYMENT_CITIES = new Set(["kano", "abuja"]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly promos: PromoService,
    private readonly notifications: NotificationsService,
    private readonly applicationNotifications: ApplicationNotificationsService
  ) {}

  async quoteVendorOrder(userId: string, dto: CreateOrderDto) {
    if (!VENDOR_ORDER_CATEGORIES.includes(dto.serviceCategory)) {
      throw new BadRequestException("Vendor orders support FOOD, GROCERY or MARKET categories");
    }

    const [customer, vendor, deliveryAddress] = await Promise.all([
      this.requireCustomer(userId),
      this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, status: VendorStatus.ACTIVE, deletedAt: null },
        select: { id: true, userId: true, city: true, state: true, address: true }
      }),
      this.prisma.address.findFirst({
        where: { id: dto.deliveryAddressId, userId },
        select: { id: true, city: true, state: true }
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
        select: { id: true, userId: true, city: true, state: true, address: true }
      }),
      this.prisma.address.findFirst({
        where: { id: dto.deliveryAddressId, userId },
        select: { id: true, city: true, state: true }
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
    const paymentMethod = this.normalizePaymentMethod(dto.paymentMethod);
    this.assertPaymentMethodAvailable(paymentMethod, [
      deliveryAddress.city,
      deliveryAddress.state,
      vendor.city,
      vendor.state,
      vendor.address
    ]);

    const order = await this.prisma.$transaction(async (tx) => {
      const isCashOrder = paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY;
      const isWalletOrder = paymentMethod === OrderPaymentMethod.WALLET;
      const initialOrderStatus = isCashOrder || isWalletOrder ? OrderStatus.PAID : OrderStatus.AWAITING_PAYMENT;
      const initialPaymentStatus = isCashOrder
        ? PaymentStatus.CASH_PENDING
        : isWalletOrder
          ? PaymentStatus.SUCCESSFUL
          : PaymentStatus.PENDING;
      const statusNote = isCashOrder
        ? "Pay on Delivery order created; cash collection is pending and requires manual reconciliation"
        : isWalletOrder
          ? "Order paid from KariGO Wallet"
          : "Order created and awaiting payment";

      let walletLedgerEntryId: string | undefined;
      if (isWalletOrder) {
        walletLedgerEntryId = await this.debitWalletForOrder(tx, customer.id, totalAmount, {
          orderNumberPreview: "pending",
          userId
        });
      }

      const created = await tx.order.create({
        data: {
          orderNumber: this.orderNumber(),
          customerId: customer.id,
          vendorId: dto.vendorId,
          serviceCategory: dto.serviceCategory,
          orderStatus: initialOrderStatus,
          paymentStatus: initialPaymentStatus,
          paymentMethod,
          cashCollectionStatus: isCashOrder ? CashCollectionStatus.PENDING_COLLECTION : CashCollectionStatus.NOT_REQUIRED,
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
              newStatus: initialOrderStatus,
              changedByUserId: userId,
              changedByRole: "CUSTOMER",
              note: statusNote
            }
          }
        },
        include: this.orderInclude()
      });

      if (isWalletOrder && walletLedgerEntryId) {
        const ledgerReference = `KGO-WALLET-ORDER-${created.orderNumber}`;
        const wallet = await tx.customerWallet.findUniqueOrThrow({ where: { customerId: customer.id } });
        const ledger = await tx.customerWalletLedgerEntry.update({
          where: { id: walletLedgerEntryId },
          data: {
            reference: ledgerReference,
            sourceId: created.id,
            description: `Wallet payment for order ${created.orderNumber}`,
            metadata: { orderNumber: created.orderNumber } as Prisma.InputJsonValue
          }
        });
        await tx.payment.create({
          data: {
            orderId: created.id,
            customerId: customer.id,
            gateway: "wallet",
            transactionReference: ledger.reference,
            amount: totalAmount,
            currency: wallet.currency,
            paymentPurpose: PaymentPurpose.ORDER_PAYMENT,
            walletLedgerEntryId: ledger.id,
            paymentMethod: "wallet",
            paymentStatus: PaymentStatus.SUCCESSFUL,
            paidAt: ledger.postedAt
          }
        });
      }

      if ((isWalletOrder || isCashOrder) && promo?.promo.id && discountAmount.greaterThan(0)) {
        await this.recordPromoUsage(tx, promo.promo.id, customer.id, created.id, discountAmount);
      }

      return created;
    });

    const paymentCopy = order.paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY
      ? "with Pay on Delivery. Please pay only the amount shown in the app."
      : order.paymentMethod === OrderPaymentMethod.WALLET
        ? "and paid from your KariGO Wallet."
        : "and is awaiting payment.";
    await this.notifications.createNotification({ userId, title: "Order created", message: `Order ${order.orderNumber} was created ${paymentCopy}`, type: NotificationType.ORDER_CREATED, entityType: "Order", entityId: order.id });
    if (vendor.userId && order.orderStatus === OrderStatus.PAID) {
      const vendorMessage = order.paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY
        ? `Order ${order.orderNumber} is Pay on Delivery. Cash collection is pending.`
        : `Order ${order.orderNumber} is ready for confirmation.`;
      await this.notifications.createNotification({
        userId: vendor.userId,
        title: order.paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY ? "New Cash/POD order" : "New paid order",
        message: vendorMessage,
        type: NotificationType.ORDER_CREATED,
        entityType: "Order",
        entityId: order.id
      });
    }
    await this.applicationNotifications.orderCreated({
      reference: order.orderNumber,
      recipientName: customer.user.fullName,
      phoneNumber: customer.user.phoneNumber,
      email: customer.user.email
    });
    return order;
  }

  private async debitWalletForOrder(
    tx: Prisma.TransactionClient,
    customerId: string,
    amount: Prisma.Decimal,
    context: { orderNumberPreview: string; userId: string }
  ): Promise<string> {
    if (!this.flagValue("WALLET_PAYMENTS_ENABLED", false)) {
      throw new BadRequestException("Wallet payments are not enabled for this launch stage");
    }
    const wallet = await tx.customerWallet.upsert({
      where: { customerId },
      update: {},
      create: { customerId }
    });
    if (wallet.status !== WalletStatus.ACTIVE) {
      throw new BadRequestException("Only active wallets can be used for order payment");
    }
    if (wallet.availableBalance.lessThan(amount)) {
      throw new BadRequestException("Wallet balance is not sufficient for this order");
    }
    const balanceAfter = wallet.availableBalance.sub(amount);
    const now = new Date();
    await tx.customerWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: balanceAfter,
        ledgerBalance: balanceAfter,
        lastActivityAt: now
      }
    });
    const entry = await tx.customerWalletLedgerEntry.create({
      data: {
        walletId: wallet.id,
        customerId,
        entryType: WalletLedgerEntryType.ORDER_PAYMENT,
        direction: WalletLedgerDirection.DEBIT,
        status: WalletLedgerEntryStatus.POSTED,
        amount,
        currency: wallet.currency,
        balanceBefore: wallet.availableBalance,
        balanceAfter,
        reference: `KGO-WALLET-ORDER-PENDING-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`,
        sourceType: "ORDER",
        description: `Wallet payment for order ${context.orderNumberPreview}`,
        metadata: { initiatedByUserId: context.userId } as Prisma.InputJsonValue,
        postedAt: now
      }
    });
    return entry.id;
  }

  private async recordPromoUsage(
    tx: Prisma.TransactionClient,
    promoCodeId: string,
    customerId: string,
    orderId: string,
    discountAmount: Prisma.Decimal
  ) {
    const existingUsage = await tx.promoCodeUsage.findUnique({
      where: { promoCodeId_orderId: { promoCodeId, orderId } }
    });
    if (existingUsage) return;
    await tx.promoCodeUsage.create({
      data: { promoCodeId, customerId, orderId, discountAmount }
    });
    await tx.promoCode.update({
      where: { id: promoCodeId },
      data: { usageCount: { increment: 1 } }
    });
  }

  private normalizePaymentMethod(value?: string): OrderPaymentMethod {
    const normalized = value?.trim().toUpperCase();
    if (!normalized || normalized === "FLUTTERWAVE") return OrderPaymentMethod.FLUTTERWAVE;
    if (normalized === "SQUAD") return OrderPaymentMethod.SQUAD;
    if (normalized === "WALLET") return OrderPaymentMethod.WALLET;
    if (normalized === "CASH_ON_DELIVERY" || normalized === "CASHONDELIVERY" || normalized === "CASH") {
      return OrderPaymentMethod.CASH_ON_DELIVERY;
    }
    if (value?.trim().toLowerCase() === "cash_on_delivery") return OrderPaymentMethod.CASH_ON_DELIVERY;
    throw new BadRequestException("Unsupported checkout payment method");
  }

  private assertPaymentMethodAvailable(paymentMethod: OrderPaymentMethod, cityValues: Array<string | null | undefined>) {
    if (paymentMethod === OrderPaymentMethod.FLUTTERWAVE) {
      const provider = this.configuredPaymentProvider();
      const livePaymentsEnabled = this.flagValue("PAYMENTS_LIVE_ENABLED", false);
      if (!livePaymentsEnabled || provider !== "flutterwave" || !this.flagValue("FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED", false)) {
        throw new BadRequestException("Flutterwave checkout is not enabled right now. Please use Pay on Delivery where available.");
      }
    }
    if (paymentMethod === OrderPaymentMethod.SQUAD && !this.flagValue("SQUAD_CUSTOMER_CHECKOUT_ENABLED", false)) {
      throw new BadRequestException("Squad checkout is disabled for customer orders.");
    }
    if (paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY || paymentMethod === OrderPaymentMethod.WALLET) {
      const cityCandidates = cityValues
        .map((city) => this.canonicalLaunchCity(city))
        .filter((city): city is string => Boolean(city));
      if (cityCandidates.length && !cityCandidates.some((city) => LAUNCH_PAYMENT_CITIES.has(city))) {
        throw new BadRequestException("Pay on Delivery is available in supported KariGO cities.");
      }
    }
    if (paymentMethod === OrderPaymentMethod.CASH_ON_DELIVERY && !this.flagValue("CASH_ON_DELIVERY_ENABLED", false)) {
      throw new BadRequestException("Pay on Delivery is not enabled for this launch stage");
    }
    if (paymentMethod === OrderPaymentMethod.WALLET && !this.flagValue("WALLET_PAYMENTS_ENABLED", false)) {
      throw new BadRequestException("Wallet payments are not enabled for this launch stage");
    }
  }

  private flagValue(name: string, fallback: boolean): boolean {
    const value = this.config.get<unknown>(name);
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value !== "string" || !value.trim()) return fallback;
    return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
  }

  private configuredPaymentProvider(): string {
    const provider = this.config.get<unknown>("PAYMENTS_PROVIDER") ?? this.config.get<unknown>("PAYMENT_PROVIDER");
    return typeof provider === "string" && provider.trim() ? provider.trim().toLowerCase() : "mock";
  }

  private canonicalLaunchCity(value?: string | null): string {
    const normalized = value
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? "";
    if (!normalized) return "";
    if (normalized.includes("kano")) return "kano";
    if (
      normalized === "fct"
      || normalized.includes("abuja")
      || normalized.includes("federal capital territory")
    ) {
      return "abuja";
    }
    return normalized;
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
    await this.applicationNotifications.orderCreated({
      reference: order.orderNumber,
      recipientName: customer.user.fullName,
      phoneNumber: customer.user.phoneNumber,
      email: customer.user.email
    });
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
    const customer = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true, phoneNumber: true, email: true } } }
    });
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
