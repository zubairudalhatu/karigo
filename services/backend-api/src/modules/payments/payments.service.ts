import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  OrderStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
  ServiceCategory
} from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import { PaymentWebhookContext } from "./providers/payment-provider.interface";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { NotificationsService } from "../notifications/notifications.service";

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly audit: AdminAuditService,
    private readonly notifications: NotificationsService
  ) {}

  async initiate(userId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customer: { userId } },
      include: { customer: { include: { user: true } } }
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.paymentStatus === PaymentStatus.SUCCESSFUL) {
      throw new ConflictException("Order has already been paid");
    }
    if (order.orderStatus !== OrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException("Order is not awaiting payment");
    }
    if (!order.totalAmount.equals(new Prisma.Decimal(dto.amount))) {
      throw new BadRequestException("Payment amount does not match the order total");
    }

    const provider = dto.paymentProvider
      ? this.providerRegistry.customerTestProvider(dto.paymentProvider)
      : this.providerRegistry.active();
    const transactionReference = this.transactionReference(provider.name);
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        gateway: provider.name,
        transactionReference,
        amount: order.totalAmount,
        currency: "NGN",
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING
      }
    });
    let authorization;
    try {
      authorization = await provider.initialize({
        transactionReference,
        amount: order.totalAmount.toFixed(2),
        currency: payment.currency,
        customerEmail: order.customer.user.email,
        customerPhone: order.customer.user.phoneNumber,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentId: payment.id,
          selectedPaymentProvider: dto.paymentProvider ?? "environment-default"
        }
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.FAILED }
      });
      await this.notifications.createNotification({
        userId,
        title: "Payment failed",
        message: `Payment initialization for order ${order.orderNumber} failed.`,
        type: NotificationType.PAYMENT_FAILED,
        entityType: "Order",
        entityId: order.id
      });
      throw error;
    }

    const initializedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { gatewayResponse: authorization.providerResponse as Prisma.InputJsonValue }
    });

    return { payment: initializedPayment, authorization };
  }

  async verify(userId: string, transactionReference: string) {
    const payment = await this.requireCustomerPaymentByReference(userId, transactionReference);
    if (payment.paymentStatus === PaymentStatus.SUCCESSFUL) {
      return { payment, alreadyProcessed: true };
    }

    const result = await this.providerRegistry.get(payment.gateway).verify(transactionReference);
    if (!result.successful) {
      throw new BadRequestException("Payment verification was not successful");
    }
    this.assertProviderEvidence(payment.amount, payment.currency, transactionReference, result);

    return {
      payment: await this.processSuccessfulPayment(
        transactionReference,
        result.providerResponse,
        payment.gateway
      ),
      alreadyProcessed: false
    };
  }

  async webhook(gateway: string, payload: Record<string, unknown>, context?: PaymentWebhookContext) {
    const provider = this.providerRegistry.get(gateway);
    const result = await provider.parseWebhook(payload, context);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.paymentWebhookLog.create({
          data: {
            gateway: provider.name,
            eventType: result.eventType,
            transactionReference: result.transactionReference,
            payload: result.providerResponse as Prisma.InputJsonValue,
            isVerified: result.verified,
            processedAt: new Date()
          }
        });

        if (!result.verified || !result.successful || !result.transactionReference) {
          return { processed: false, reason: "Webhook was not a verified successful payment" };
        }
        const payment = await tx.payment.findUnique({ where: { transactionReference: result.transactionReference } });
        if (!payment) throw new NotFoundException("Payment not found");
        this.assertProviderEvidence(payment.amount, payment.currency, result.transactionReference, {
          ...result,
          transactionReference: result.transactionReference
        });

        return {
          processed: true,
          payment: await this.processSuccessfulPaymentWithClient(
            tx,
            result.transactionReference,
            result.providerResponse,
            provider.name
          )
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { processed: false, duplicate: true };
      }
      throw error;
    }
  }

  async requestRefund(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, customer: { userId } },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.paymentStatus === PaymentStatus.REFUND_PENDING) {
      return payment;
    }
    if (payment.paymentStatus !== PaymentStatus.SUCCESSFUL) {
      throw new BadRequestException("Only successful payments can be refunded");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUND_PENDING }
      });
      const shouldMoveToRefundRequested = payment.order.orderStatus !== OrderStatus.REFUND_REQUESTED;
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.REFUND_PENDING,
          ...(shouldMoveToRefundRequested
            ? {
                orderStatus: OrderStatus.REFUND_REQUESTED,
                statusHistory: {
                  create: {
                    previousStatus: payment.order.orderStatus,
                    newStatus: OrderStatus.REFUND_REQUESTED,
                    changedByUserId: userId,
                    changedByRole: "CUSTOMER",
                    note: "Customer requested a refund"
                  }
                }
              }
            : {})
        }
      });
      return updatedPayment;
    });
    await this.notifications.createNotification({ userId, title: "Refund requested", message: "Your refund request is awaiting review.", type: NotificationType.REFUND_REQUESTED, entityType: "Payment", entityId: paymentId });
    return result;
  }

  async approveRefund(adminUserId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.paymentStatus === PaymentStatus.REFUNDED) {
      return payment;
    }
    if (payment.paymentStatus !== PaymentStatus.REFUND_PENDING) {
      throw new BadRequestException("Payment does not have a pending refund request");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paymentStatus: PaymentStatus.REFUNDED }
      });
      if (payment.order.orderStatus !== OrderStatus.REFUNDED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            orderStatus: OrderStatus.REFUNDED,
            paymentStatus: PaymentStatus.REFUNDED,
            statusHistory: {
              create: {
                previousStatus: payment.order.orderStatus,
                newStatus: OrderStatus.REFUNDED,
                changedByUserId: adminUserId,
                changedByRole: "ADMIN",
                note: "Admin approved refund"
              }
            }
          }
        });
      }
      return updatedPayment;
    });
    await this.audit.record(adminUserId, "payment.refund.approved", "Payment", paymentId, { orderId: payment.orderId });
    const customer = await this.prisma.customerProfile.findUnique({ where: { id: payment.customerId }, select: { userId: true } });
    if (customer) await this.notifications.createNotification({ userId: customer.userId, title: "Refund approved", message: "Your refund request has been approved.", type: NotificationType.REFUND_APPROVED, entityType: "Payment", entityId: paymentId });
    return result;
  }

  private processSuccessfulPayment(
    transactionReference: string,
    providerResponse: Record<string, unknown>,
    expectedGateway: string
  ) {
    return this.prisma.$transaction((tx) =>
      this.processSuccessfulPaymentWithClient(tx, transactionReference, providerResponse, expectedGateway)
    );
  }

  private async processSuccessfulPaymentWithClient(
    tx: TransactionClient,
    transactionReference: string,
    providerResponse: Record<string, unknown>,
    expectedGateway: string
  ) {
    const payment = await tx.payment.findUnique({
      where: { transactionReference },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.gateway !== expectedGateway) {
      throw new BadRequestException("Payment gateway does not match the transaction");
    }
    if (payment.paymentStatus === PaymentStatus.SUCCESSFUL) {
      return payment;
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.SUCCESSFUL,
        paidAt: new Date(),
        gatewayResponse: providerResponse as Prisma.InputJsonValue
      }
    });

    const shouldMoveToPaid = payment.order.orderStatus === OrderStatus.AWAITING_PAYMENT;
    const isDispatchReadyParcel =
      shouldMoveToPaid && payment.order.serviceCategory === ServiceCategory.PARCEL;
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: PaymentStatus.SUCCESSFUL,
        ...(shouldMoveToPaid
          ? {
              orderStatus: isDispatchReadyParcel ? OrderStatus.READY_FOR_PICKUP : OrderStatus.PAID,
              statusHistory: {
                create: isDispatchReadyParcel
                  ? [
                      {
                        previousStatus: OrderStatus.AWAITING_PAYMENT,
                        newStatus: OrderStatus.PAID,
                        changedByRole: "SYSTEM",
                        note: `Payment verified through ${payment.gateway}`
                      },
                      {
                        previousStatus: OrderStatus.PAID,
                        newStatus: OrderStatus.READY_FOR_PICKUP,
                        changedByRole: "SYSTEM",
                        note: "Paid parcel request is ready for dispatch"
                      }
                    ]
                  : {
                      previousStatus: OrderStatus.AWAITING_PAYMENT,
                      newStatus: OrderStatus.PAID,
                      changedByRole: "SYSTEM",
                      note: `Payment verified through ${payment.gateway}`
                    }
              }
            }
          : {})
      }
    });
    if (payment.order.promoCodeId && payment.order.discountAmount.greaterThan(0)) {
      const existingUsage = await tx.promoCodeUsage.findUnique({
        where: {
          promoCodeId_orderId: {
            promoCodeId: payment.order.promoCodeId,
            orderId: payment.orderId
          }
        }
      });
      if (!existingUsage) {
        await tx.promoCodeUsage.create({
          data: {
            promoCodeId: payment.order.promoCodeId,
            customerId: payment.customerId,
            orderId: payment.orderId,
            discountAmount: payment.order.discountAmount
          }
        });
        await tx.promoCode.update({
          where: { id: payment.order.promoCodeId },
          data: { usageCount: { increment: 1 } }
        });
      }
    }
    const customer = await tx.customerProfile.findUnique({ where: { id: payment.customerId }, select: { userId: true } });
    if (customer) {
      await tx.notification.create({ data: { userId: customer.userId, title: "Payment successful", message: `Payment for order ${payment.order.orderNumber} was successful.`, type: NotificationType.PAYMENT_SUCCESSFUL, entityType: "Order", entityId: payment.orderId } });
    }
    if (payment.order.vendorId) {
      const vendor = await tx.vendor.findUnique({ where: { id: payment.order.vendorId }, select: { userId: true } });
      if (vendor) await tx.notification.create({ data: { userId: vendor.userId, title: "New paid order", message: `Order ${payment.order.orderNumber} is ready for confirmation.`, type: NotificationType.PAYMENT_SUCCESSFUL, entityType: "Order", entityId: payment.orderId } });
    }
    return updatedPayment;
  }

  private async requireCustomerPaymentByReference(userId: string, transactionReference: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionReference, customer: { userId } },
      include: { order: true }
    });
    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    return payment;
  }

  private transactionReference(gateway: string): string {
    return `KGO-${gateway.toUpperCase()}-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  private assertProviderEvidence(
    expectedAmount: Prisma.Decimal,
    expectedCurrency: string,
    expectedReference: string,
    evidence: { transactionReference: string; amountMinor?: number; currency?: string }
  ): void {
    if (evidence.transactionReference !== expectedReference) {
      throw new BadRequestException("Provider transaction reference does not match the payment");
    }
    if (evidence.currency && evidence.currency.toUpperCase() !== expectedCurrency.toUpperCase()) {
      throw new BadRequestException("Provider payment currency does not match the payment");
    }
    if (evidence.amountMinor !== undefined) {
      const expectedMinor = Number(expectedAmount.mul(100).toFixed(0));
      if (evidence.amountMinor !== expectedMinor) {
        throw new BadRequestException("Provider payment amount does not match the order total");
      }
    }
  }
}
