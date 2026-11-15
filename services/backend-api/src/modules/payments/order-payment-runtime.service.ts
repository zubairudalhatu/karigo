import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OrderPaymentAttempt,
  OrderAttemptState,
  OrderRefundState,
  Prisma,
} from "@prisma/client";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { safePaymentFailure } from "./providers/payment-failure-summary";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import {
  PaymentProvider,
  PaymentWebhookContext,
  VerifyPaymentResult,
  WebhookPaymentResult,
} from "./providers/payment-provider.interface";

type Tx = Prisma.TransactionClient;
type Finalizer = (
  tx: Tx,
  reference: string,
  response: Record<string, unknown>,
  provider: string,
) => Promise<unknown>;
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const active: OrderAttemptState[] = [
  "CREATING",
  "READY",
  "PENDING",
  "UNKNOWN",
  "REVIEW_REQUIRED",
  "REFUND_PENDING",
];
const refundActive: OrderRefundState[] = [
  "REQUESTED",
  "ACCEPTED",
  "PENDING",
  "UNKNOWN",
  "REVIEW_REQUIRED",
];

@Injectable()
export class OrderPaymentRuntime {
  private finalizer?: Finalizer;
  constructor(
    private readonly db: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly config: ConfigService,
  ) {}
  bindFinalizer(fn: Finalizer) {
    this.finalizer = fn;
  }
  enabled() {
    return (
      String(
        this.config.get("ORDER_PAYMENT_RUNTIME_V2_ENABLED", "false"),
      ).toLowerCase() === "true" &&
      String(
        this.config.get("PAYMENT_SANDBOX_ISOLATED", "false"),
      ).toLowerCase() === "true" &&
      this.config.get("APP_ENV") === "staging"
    );
  }
  private selected() {
    return this.config
      .get<string>("ORDER_PAYMENT_V2_PROVIDER", "flutterwave")
      .toLowerCase();
  }
  private key(value: string) {
    if (!/^[A-Za-z0-9:._-]{12,128}$/.test(value))
      throw new BadRequestException(
        "A stable order-payment idempotency key is required",
      );
    return digest(value);
  }
  private adapter(name: string): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider.identity || !provider.capabilities)
      throw new BadRequestException(
        "Provider is not certified for this order runtime",
      );
    return provider;
  }
  private async lock(tx: Tx, orderId: string) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"order-payment:" + orderId}))::text AS lock`;
  }
  private audit(
    tx: Tx,
    a: OrderPaymentAttempt,
    stage: string,
    reasonCode?: string,
  ) {
    return tx.orderPaymentAudit.create({
      data: { attemptId: a.id, stage, version: a.version, reasonCode },
    });
  }
  private async discrepancy(
    tx: Tx,
    a: OrderPaymentAttempt,
    kind: string,
    evidence: string,
  ) {
    const evidenceDigest = digest(evidence);
    await tx.orderPaymentDiscrepancy.upsert({
      where: {
        attemptId_kind_evidenceDigest: {
          attemptId: a.id,
          kind,
          evidenceDigest,
        },
      },
      create: { attemptId: a.id, kind, evidenceDigest },
      update: {},
    });
    await this.audit(tx, a, "RECONCILIATION_DISCREPANCY", kind);
  }
  private validate(
    a: OrderPaymentAttempt,
    e: VerifyPaymentResult | WebhookPaymentResult,
  ) {
    if (e.transactionReference !== a.transactionReference)
      throw new BadRequestException("REFERENCE_MISMATCH");
    if (!Number.isSafeInteger(e.amountMinor) || e.amountMinor !== a.amountMinor)
      throw new BadRequestException("AMOUNT_MISMATCH");
    if (!e.currency || e.currency.toUpperCase() !== a.currency)
      throw new BadRequestException("CURRENCY_MISMATCH");
    if (e.merchantAccountId && e.merchantAccountId !== a.merchantAccountId)
      throw new BadRequestException("MERCHANT_MISMATCH");
    if (
      e.providerTransactionReference &&
      !/^[A-Za-z0-9:._/-]{1,200}$/.test(e.providerTransactionReference)
    )
      throw new BadRequestException("PROVIDER_REFERENCE_INVALID");
  }
  private async owned(userId: string, reference: string) {
    const a = await this.db.orderPaymentAttempt.findFirst({
      where: {
        transactionReference: reference,
        payment: { customer: { userId } },
      },
    });
    if (!a) throw new NotFoundException("Order payment attempt not found");
    return a;
  }
  has(reference: string) {
    return this.db.orderPaymentAttempt
      .findUnique({
        where: { transactionReference: reference },
        select: { id: true },
      })
      .then(Boolean);
  }
  publicConfig() {
    if (!this.enabled()) return undefined;
    const provider = this.adapter(this.selected());
    return {
      version: 2 as const,
      provider: provider.name,
      orderPaymentMethod:
        provider.name === "squad"
          ? ("SQUAD" as const)
          : ("FLUTTERWAVE" as const),
    };
  }
  private response(a: OrderPaymentAttempt) {
    const checkoutUrl = ["READY", "PENDING"].includes(a.state)
      ? a.authorizationUrl
      : null;
    return {
      payment: {
        id: a.paymentId,
        transactionReference: a.transactionReference,
        gateway: a.provider,
        amount: a.amountMinor / 100,
        currency: a.currency,
        createdAt: a.createdAt,
        paymentStatus: a.state === "SUCCEEDED" ? "SUCCESSFUL" : a.state,
      },
      attempt: {
        id: a.id,
        version: a.version,
        state: a.state,
        amountMinor: a.amountMinor,
        currency: a.currency,
        retry:
          a.state === "UNKNOWN" || a.state === "REVIEW_REQUIRED"
            ? "RECONCILE_ORIGINAL_ATTEMPT"
            : "VERIFY_ORIGINAL_ATTEMPT",
      },
      authorization: {
        transactionReference: a.transactionReference,
        reference: a.transactionReference,
        provider: a.provider,
        amount: a.amountMinor / 100,
        currency: a.currency,
        authorizationUrl: checkoutUrl,
        checkoutUrl,
        paymentUrl: checkoutUrl,
        url: checkoutUrl,
      },
      alreadyProcessed: a.state === "SUCCEEDED",
    };
  }
  async initiate(
    userId: string,
    input: {
      orderId: string;
      amount: number;
      idempotencyKey: string;
      paymentProvider?: string;
    },
  ) {
    if (!this.enabled())
      throw new BadRequestException("New order-payment routing is disabled");
    if (!this.finalizer)
      throw new ServiceUnavailableException(
        "Order finalization is unavailable",
      );
    const provider = this.adapter(this.selected()),
      identity = provider.identity!(),
      keyHash = this.key(input.idempotencyKey);
    if (input.paymentProvider && input.paymentProvider !== provider.name)
      throw new BadRequestException(
        "Requested provider is not selected for new order attempts",
      );
    const fingerprint = digest(
      JSON.stringify({
        orderId: input.orderId,
        amount: input.amount,
        provider: provider.name,
        ...identity,
      }),
    );
    const created = await this.db.$transaction(async (tx) => {
      const customer = await tx.customerProfile.findUnique({
        where: { userId },
        include: { user: true },
      });
      if (!customer) throw new NotFoundException("Customer not found");
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"order-payment-key:" + customer.id + ":" + keyHash}))::text AS lock`;
      await this.lock(tx, input.orderId);
      const order = await tx.order.findUnique({ where: { id: input.orderId } });
      if (!customer || !order || order.customerId !== customer.id)
        throw new NotFoundException("Order not found");
      const existing = await tx.orderPaymentAttempt.findUnique({
        where: {
          customerId_idempotencyKeyHash: {
            customerId: customer.id,
            idempotencyKeyHash: keyHash,
          },
        },
      });
      if (existing) {
        if (existing.requestHash !== fingerprint)
          throw new ConflictException("Idempotency key input changed");
        return { a: existing, initialize: false, user: customer.user };
      }
      if (
        order.orderStatus !== "AWAITING_PAYMENT" ||
        order.paymentStatus === "SUCCESSFUL" ||
        order.paymentStatus === "CASH_PENDING" ||
        order.paymentMethod === "CASH_ON_DELIVERY" ||
        !order.totalAmount.equals(new Prisma.Decimal(input.amount))
      )
        throw new BadRequestException(
          "Order is not eligible for this payment amount",
        );
      const minor = Number(order.totalAmount.mul(100).toFixed(0));
      if (!Number.isSafeInteger(minor) || minor < 1 || minor > 2147483647)
        throw new BadRequestException("Invalid payment amount");
      const claim = await tx.orderPaymentClaim.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id },
        update: {},
      });
      if (claim.successfulAttemptId)
        throw new ConflictException("Order already has a successful payment");
      if (claim.activeAttemptId) {
        const prior = await tx.orderPaymentAttempt.findUniqueOrThrow({
          where: { id: claim.activeAttemptId },
        });
        if (active.includes(prior.state))
          return { a: prior, initialize: false, user: customer.user };
      }
      const legacyPending = await tx.payment.count({
        where: {
          orderId: order.id,
          paymentStatus: "PENDING",
          orderAttemptV2: null,
        },
      });
      if (legacyPending)
        throw new ConflictException(
          "Verify the existing provider attempt before creating another payment",
        );
      const reference = "KGO-ORDER-" + randomUUID();
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          customerId: customer.id,
          gateway: provider.name,
          transactionReference: reference,
          amount: order.totalAmount,
          currency: "NGN",
          paymentPurpose: "ORDER_PAYMENT",
          paymentStatus: "PENDING",
        },
      });
      const a = await tx.orderPaymentAttempt.create({
        data: {
          paymentId: payment.id,
          orderId: order.id,
          customerId: customer.id,
          provider: provider.name,
          ...identity,
          transactionReference: reference,
          idempotencyKeyHash: keyHash,
          requestHash: fingerprint,
          amountMinor: minor,
          currency: "NGN",
        },
      });
      await tx.orderPaymentClaim.update({
        where: { orderId: order.id },
        data: { activeAttemptId: a.id },
      });
      await this.audit(tx, a, "ATTEMPT_CREATED");
      return { a, initialize: true, user: customer.user };
    });
    if (!created.initialize) return this.response(created.a);
    let a = created.a;
    try {
      const authorization = await provider.initialize({
        transactionReference: a.transactionReference,
        amount: (a.amountMinor / 100).toFixed(2),
        currency: a.currency,
        customerEmail: created.user.email,
        customerPhone: created.user.phoneNumber ?? "",
        redirectUrl:
          this.config.get<string>("ORDER_PAYMENT_CALLBACK_URL") ??
          (this.config.get<string>("RENDER_EXTERNAL_URL")
            ? this.config.get<string>("RENDER_EXTERNAL_URL") + "/callback"
            : undefined),
        metadata: { orderId: a.orderId, attemptId: a.id },
      });
      if (authorization.transactionReference !== a.transactionReference)
        throw new BadRequestException("Initialization reference mismatch");
      const url = new URL(authorization.authorizationUrl ?? "");
      const allowed = String(
        this.config.get(
          "ORDER_PAYMENT_CHECKOUT_HOSTS",
          "sandbox-pay.squadco.com,pay.squadco.com,checkout.flutterwave.com",
        ),
      ).split(",");
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        !allowed.includes(url.hostname)
      )
        throw new BadRequestException("Provider checkout URL is not allowed");
      a = await this.db.$transaction(async (tx) => {
        await this.lock(tx, a.orderId);
        const fresh = await tx.orderPaymentAttempt.findUniqueOrThrow({
          where: { id: a.id },
        });
        if (fresh.state !== "CREATING") return fresh;
        const updated = await tx.orderPaymentAttempt.update({
          where: { id: a.id },
          data: {
            state: "READY",
            authorizationUrl: url.href,
            version: { increment: 1 },
          },
        });
        await this.audit(tx, updated, "INITIALIZATION_READY");
        return updated;
      });
    } catch (error: unknown) {
      const failure = safePaymentFailure(error);
      // An initialization timeout does NOT prove that the provider created no intent.
      await this.db.orderPaymentAttempt.updateMany({
        where: { id: a.id, state: "CREATING" },
        data: { state: "UNKNOWN", version: { increment: 1 } },
      });
      a = await this.db.orderPaymentAttempt.findUniqueOrThrow({
        where: { id: a.id },
      });
      await this.audit(
        this.db,
        a,
        "INITIALIZATION_UNKNOWN",
        "INIT_" +
          failure.reason +
          (failure.providerHttpStatus
            ? "_HTTP_" + failure.providerHttpStatus
            : ""),
      );
    }
    return this.response(a);
  }
  async verify(userId: string, reference: string) {
    return this.verifyAttempt(await this.owned(userId, reference));
  }
  private async verifyAttempt(snapshot: OrderPaymentAttempt) {
    if (["SUCCEEDED", "REFUND_PENDING", "REFUNDED"].includes(snapshot.state))
      return this.response(snapshot);
    const provider = this.adapter(snapshot.provider),
      identity = provider.identity!();
    if (
      identity.environment !== snapshot.environment ||
      identity.merchantAccountId !== snapshot.merchantAccountId
    )
      throw new ConflictException(
        "Stored payment credential context is unavailable",
      );
    const evidence = await provider.verify(snapshot.transactionReference);
    this.validate(snapshot, evidence);
    const updated = await this.db.$transaction(async (tx) => {
      await this.lock(tx, snapshot.orderId);
      const a = await tx.orderPaymentAttempt.findUniqueOrThrow({
        where: { id: snapshot.id },
      });
      if (
        a.state === "SUCCEEDED" ||
        a.state === "REFUNDED" ||
        a.state === "REFUND_PENDING"
      )
        return a;
      if (a.version !== snapshot.version) return a;
      await this.audit(
        tx,
        a,
        "SERVER_VERIFICATION",
        evidence.successful ? "PROVIDER_PAID" : "PROVIDER_NOT_PAID",
      );
      if (!evidence.successful) {
        const next =
          evidence.normalizedStatus === "FAILED"
            ? "FAILED"
            : evidence.normalizedStatus === "CANCELLED"
              ? "CANCELLED"
              : "PENDING";
        if (next === "FAILED" || next === "CANCELLED")
          await tx.payment.update({
            where: { id: a.paymentId },
            data: { paymentStatus: next },
          });
        return tx.orderPaymentAttempt.update({
          where: { id: a.id },
          data: {
            state: next,
            providerStatus: evidence.normalizedStatus,
            version: { increment: 1 },
          },
        });
      }
      const order = await tx.order.findUniqueOrThrow({
        where: { id: a.orderId },
      });
      const claim = await tx.orderPaymentClaim.findUniqueOrThrow({
        where: { orderId: a.orderId },
      });
      const unsafe =
        order.customerId !== a.customerId ||
        !order.totalAmount.mul(100).equals(a.amountMinor) ||
        order.orderStatus !== "AWAITING_PAYMENT" ||
        order.paymentStatus === "SUCCESSFUL" ||
        Boolean(
          claim.successfulAttemptId && claim.successfulAttemptId !== a.id,
        ) ||
        ["FAILED", "CANCELLED", "REVIEW_REQUIRED"].includes(a.state);
      if (unsafe) {
        await this.discrepancy(
          tx,
          a,
          "PROVIDER_PAID_ORDER_NOT_ELIGIBLE",
          evidence.transactionReference + ":" + order.orderStatus,
        );
        return tx.orderPaymentAttempt.update({
          where: { id: a.id },
          data: { state: "REVIEW_REQUIRED", version: { increment: 1 } },
        });
      }
      if (evidence.providerTransactionReference)
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"order-payment-provider:" + a.provider + ":" + a.environment + ":" + a.merchantAccountId + ":" + evidence.providerTransactionReference}))::text AS lock`;
      if (
        evidence.providerTransactionReference &&
        (await tx.orderPaymentAttempt.count({
          where: {
            provider: a.provider,
            environment: a.environment,
            merchantAccountId: a.merchantAccountId,
            providerTransactionReference: evidence.providerTransactionReference,
            id: { not: a.id },
          },
        }))
      ) {
        await this.discrepancy(
          tx,
          a,
          "DUPLICATE_PROVIDER_TRANSACTION",
          evidence.providerTransactionReference,
        );
        return tx.orderPaymentAttempt.update({
          where: { id: a.id },
          data: { state: "REVIEW_REQUIRED", version: { increment: 1 } },
        });
      }
      const next = await tx.orderPaymentAttempt.update({
        where: { id: a.id },
        data: {
          state: "SUCCEEDED",
          providerTransactionReference: evidence.providerTransactionReference,
          providerStatus: "SUCCEEDED",
          version: { increment: 1 },
        },
      });
      await tx.orderPaymentClaim.update({
        where: { orderId: a.orderId },
        data: { successfulAttemptId: a.id, activeAttemptId: null },
      });
      await this.finalizer!(
        tx,
        a.transactionReference,
        evidence.providerResponse,
        a.provider,
      );
      await this.audit(tx, next, "FINALIZED");
      return next;
    });
    return this.response(updated);
  }
  async webhook(
    provider: PaymentProvider,
    event: WebhookPaymentResult,
    context?: PaymentWebhookContext,
  ) {
    const identity = provider.identity?.();
    if (!identity || !event.verified || !event.transactionReference)
      throw new BadRequestException("Verified provider event required");
    const a = await this.db.orderPaymentAttempt.findUnique({
      where: { transactionReference: event.transactionReference },
    });
    if (
      a &&
      (a.provider !== provider.name ||
        a.environment !== identity.environment ||
        a.merchantAccountId !== identity.merchantAccountId)
    )
      throw new BadRequestException(
        "Provider endpoint does not own this attempt",
      );
    const bodyDigest = createHash("sha256")
      .update(context?.rawBody ?? Buffer.alloc(0))
      .digest("hex");
    const eventKey = digest(
      event.eventType + ":" + (event.providerEventId ?? bodyDigest),
    );
    const inbox = await this.db.orderPaymentProviderEvent.upsert({
      where: {
        provider_environment_merchantAccountId_eventKey: {
          provider: provider.name,
          ...identity,
          eventKey,
        },
      },
      create: {
        provider: provider.name,
        ...identity,
        eventKey,
        bodyDigest,
        reference: event.transactionReference.slice(0, 200),
        eventType: event.eventType.slice(0, 80),
        attemptId: a?.id,
        state: a ? "VERIFIED" : "UNKNOWN_REFERENCE",
      },
      update: {},
    });
    if (!a || inbox.state === "PROCESSED")
      return {
        processed: false,
        duplicate: inbox.state === "PROCESSED",
        reason: a ? "ALREADY_PROCESSED" : "UNKNOWN_REFERENCE",
      };
    try {
      if (event.successful) this.validate(a, event);
      const result = await this.verifyAttempt(a);
      await this.db.orderPaymentProviderEvent.update({
        where: { id: inbox.id },
        data: { state: "PROCESSED", processedAt: new Date() },
      });
      return { processed: true, ...result };
    } catch {
      await this.db.orderPaymentProviderEvent.update({
        where: { id: inbox.id },
        data: {
          state: "RETRY_REQUIRED",
          reasonCode: "VERIFY_OR_RECONCILE_ORIGINAL_REFERENCE",
        },
      });
      return { processed: false, retryRequired: true };
    }
  }
  private assertIdentity(a: OrderPaymentAttempt, provider: PaymentProvider) {
    const identity = provider.identity!();
    if (
      identity.environment !== a.environment ||
      identity.merchantAccountId !== a.merchantAccountId
    )
      throw new ConflictException(
        "Stored payment credential context is unavailable",
      );
  }
  async trackedPayment(paymentId: string) {
    return this.db.orderPaymentAttempt.findUnique({ where: { paymentId } });
  }
  async requestCustomerRefund(userId: string, paymentId: string) {
    const a = await this.db.orderPaymentAttempt.findFirst({
      where: { paymentId, payment: { customer: { userId } } },
    });
    if (!a) throw new NotFoundException("Order payment not found");
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, a.orderId);
      const fresh = await tx.orderPaymentAttempt.findUniqueOrThrow({
        where: { id: a.id },
      });
      if (fresh.state !== "SUCCEEDED" && fresh.state !== "REFUND_PENDING")
        throw new BadRequestException(
          "Only successful payments can be refunded",
        );
      if (fresh.state === "REFUND_PENDING")
        return tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      const order = await tx.order.findUniqueOrThrow({
        where: { id: a.orderId },
      });
      await tx.orderPaymentAttempt.update({
        where: { id: a.id },
        data: { state: "REFUND_PENDING", version: { increment: 1 } },
      });
      await tx.order.update({
        where: { id: a.orderId },
        data: {
          paymentStatus: "REFUND_PENDING",
          orderStatus: "REFUND_REQUESTED",
          statusHistory: {
            create: {
              previousStatus: order.orderStatus,
              newStatus: "REFUND_REQUESTED",
              changedByUserId: userId,
              changedByRole: "CUSTOMER",
              note: "Customer requested a refund",
            },
          },
        },
      });
      await this.audit(tx, fresh, "CUSTOMER_REFUND_REQUESTED");
      return tx.payment.update({
        where: { id: paymentId },
        data: { paymentStatus: "REFUND_PENDING" },
      });
    });
  }
  async retryEvent(eventId: string) {
    const event = await this.db.orderPaymentProviderEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    if (!event.attemptId)
      throw new BadRequestException(
        "Unknown reference requires manual reconciliation",
      );
    const a = await this.db.orderPaymentAttempt.findUniqueOrThrow({
      where: { id: event.attemptId },
    });
    const result = await this.verifyAttempt(a);
    await this.db.orderPaymentProviderEvent.update({
      where: { id: eventId },
      data: { state: "PROCESSED", processedAt: new Date(), reasonCode: null },
    });
    return result;
  }
  async refund(attemptId: string, amountMinor: number, idempotencyKey: string) {
    const snapshot = await this.db.orderPaymentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      }),
      provider = this.adapter(snapshot.provider);
    if (!provider.capabilities?.refunds || !provider.refund)
      throw new BadRequestException(
        "Provider refund capability is unavailable; reviewed external handling required",
      );
    this.assertIdentity(snapshot, provider);
    const keyHash = this.key(idempotencyKey),
      hash = digest(String(amountMinor));
    const entry = await this.db.$transaction(async (tx) => {
      await this.lock(tx, snapshot.orderId);
      const a = await tx.orderPaymentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      const prior = await tx.orderPaymentRefund.findUnique({
        where: {
          attemptId_idempotencyKeyHash: {
            attemptId,
            idempotencyKeyHash: keyHash,
          },
        },
      });
      if (prior) {
        if (prior.requestHash !== hash)
          throw new ConflictException("Refund idempotency input changed");
        return { row: prior, submit: false };
      }
      if (
        !["SUCCEEDED", "REFUND_PENDING"].includes(a.state) ||
        !a.providerTransactionReference ||
        !Number.isSafeInteger(amountMinor) ||
        amountMinor < 1 ||
        amountMinor > a.amountMinor
      )
        throw new BadRequestException(
          "Refund requires a successful verified payment",
        );
      if (
        await tx.orderPaymentRefund.count({
          where: { attemptId, state: { in: refundActive } },
        })
      )
        throw new ConflictException(
          "A refund is already pending reconciliation",
        );
      const confirmed = await tx.orderPaymentRefund.aggregate({
        where: { attemptId, state: "SUCCEEDED" },
        _sum: { amountMinor: true },
      });
      if ((confirmed._sum.amountMinor ?? 0) + amountMinor > a.amountMinor)
        throw new BadRequestException("Refund exceeds paid amount");
      const row = await tx.orderPaymentRefund.create({
        data: {
          attemptId,
          idempotencyKeyHash: keyHash,
          requestHash: hash,
          amountMinor,
        },
      });
      await tx.orderPaymentAttempt.update({
        where: { id: attemptId },
        data: { state: "REFUND_PENDING", version: { increment: 1 } },
      });
      await tx.payment.update({
        where: { id: a.paymentId },
        data: { paymentStatus: "REFUND_PENDING" },
      });
      await tx.order.update({
        where: { id: a.orderId },
        data: { paymentStatus: "REFUND_PENDING" },
      });
      await this.audit(tx, a, "REFUND_REQUESTED");
      return { row, submit: true };
    });
    if (!entry.submit) return entry.row;
    try {
      const response = await provider.refund({
        transactionReference: snapshot.transactionReference,
        providerTransactionReference: snapshot.providerTransactionReference!,
        amountMinor,
        originalAmountMinor: snapshot.amountMinor,
        reason: "Customer requested refund",
      });
      // No confirmed lookup in the current Squad contract. Do not elevate an
      // acknowledgement (or an unverified response) into a completed refund.
      return await this.db.$transaction(async (tx) => {
        await this.lock(tx, snapshot.orderId);
        const accepted = !["FAILED", "UNKNOWN"].includes(response.state);
        if (accepted) {
          await tx.orderPaymentRefund.update({
            where: { id: entry.row.id },
            data: { state: "ACCEPTED", acceptedAt: new Date() },
          });
          await this.audit(tx, snapshot, "REFUND_PROVIDER_ACCEPTED");
        }
        const row = await tx.orderPaymentRefund.update({
          where: { id: entry.row.id },
          data: {
            state:
              response.state === "FAILED"
                ? "FAILED"
                : response.state === "UNKNOWN"
                  ? "UNKNOWN"
                  : "PENDING",
            providerReference: response.providerReference?.slice(0, 200),
            providerStatus: response.providerStatus?.slice(0, 40),
          },
        });
        await this.audit(tx, snapshot, "REFUND_" + row.state);
        return row;
      });
    } catch {
      return this.db.orderPaymentRefund.update({
        where: { id: entry.row.id },
        data: { state: "UNKNOWN", providerStatus: "RECONCILE_BEFORE_RETRY" },
      });
    }
  }
  async reconcile(attemptId: string) {
    const snapshot = await this.db.orderPaymentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      }),
      provider = this.adapter(snapshot.provider);
    this.assertIdentity(snapshot, provider);
    const evidence = await provider.verify(snapshot.transactionReference);
    const order = await this.db.order.findUniqueOrThrow({
      where: { id: snapshot.orderId },
    });
    const payment = await this.db.payment.findUniqueOrThrow({
      where: { id: snapshot.paymentId },
    });
    const kinds: string[] = [];
    try {
      this.validate(snapshot, evidence);
    } catch {
      kinds.push("REFERENCE_AMOUNT_CURRENCY_OR_ACCOUNT_MISMATCH");
    }
    if (
      evidence.successful &&
      !["SUCCEEDED", "REFUND_PENDING", "REFUNDED"].includes(snapshot.state)
    )
      kinds.push("PROVIDER_PAID_INTERNAL_UNPAID");
    if (!evidence.successful && snapshot.state === "SUCCEEDED")
      kinds.push("INTERNAL_PAID_PROVIDER_NOT_SUCCESSFUL");
    if (
      order.customerId !== snapshot.customerId ||
      !order.totalAmount.mul(100).equals(snapshot.amountMinor)
    )
      kinds.push("ORDER_ACCOUNT_OR_AMOUNT_MISMATCH");
    if (
      snapshot.state === "SUCCEEDED" &&
      (order.paymentStatus !== "SUCCESSFUL" ||
        payment.paymentStatus !== "SUCCESSFUL")
    )
      kinds.push("ORDER_PAYMENT_STATE_MISMATCH");
    if (evidence.refundConfirmed && snapshot.state !== "REFUNDED")
      kinds.push("PROVIDER_REFUND_INTERNAL_MISMATCH");
    if (
      !(await this.db.orderPaymentProviderEvent.count({
        where: { attemptId, state: "PROCESSED" },
      }))
    )
      kinds.push("MISSING_PROCESSED_WEBHOOK");
    if (
      evidence.providerTransactionReference &&
      (await this.db.orderPaymentAttempt.count({
        where: {
          id: { not: attemptId },
          provider: snapshot.provider,
          environment: snapshot.environment,
          merchantAccountId: snapshot.merchantAccountId,
          providerTransactionReference: evidence.providerTransactionReference,
        },
      }))
    )
      kinds.push("DUPLICATE_PROVIDER_TRANSACTION");
    if (await this.db.orderPaymentRefund.count({ where: { attemptId } }))
      kinds.push(
        provider.capabilities?.refundLookup
          ? "REFUND_RECONCILIATION_REQUIRED"
          : "REFUND_FINAL_STATUS_UNVERIFIABLE",
      );
    await this.db.$transaction(async (tx) => {
      await this.lock(tx, snapshot.orderId);
      const fresh = await tx.orderPaymentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      if (fresh.version !== snapshot.version) {
        kinds.push("STATE_CHANGED_DURING_RECONCILIATION");
        return;
      }
      for (const kind of kinds)
        await this.discrepancy(
          tx,
          fresh,
          kind,
          JSON.stringify({
            reference: evidence.transactionReference,
            amountMinor: evidence.amountMinor,
            currency: evidence.currency,
            status: evidence.normalizedStatus,
          }),
        );
    });
    return { attemptId, discrepancies: kinds, corrected: false };
  }
}
