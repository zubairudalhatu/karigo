import { ConfigService } from "@nestjs/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PaymentsService } from "./payments.service";
import { OrderPaymentRuntime } from "./order-payment-runtime.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import {
  PaymentProvider,
  VerifyPaymentResult,
} from "./providers/payment-provider.interface";

const target = process.env.KARIGO_PAY02_TEST_DATABASE_URL;
const suite = target ? describe : describe.skip;
suite(
  "PAY02 real Postgres orchestration (synthetic, provider contract double)",
  () => {
    let db: PrismaClient,
      runtime: OrderPaymentRuntime,
      userId: string,
      customerId: string;
    let evidence: VerifyPaymentResult, initializes: number, finalized: number;
    const provider: PaymentProvider = {
      name: "squad",
      capabilities: {
        refunds: true,
        refundLookup: false,
        reconciliation: "REFERENCE",
      },
      identity: () => ({
        environment: "sandbox",
        merchantAccountId: "PAY02-SYNTHETIC",
      }),
      initialize: async (input) => {
        initializes++;
        return {
          transactionReference: input.transactionReference,
          authorizationUrl: "https://sandbox-pay.squadco.com/synthetic",
          accessCode: null,
          providerResponse: {},
        };
      },
      verify: async (ref) => ({
        ...evidence,
        transactionReference: evidence.transactionReference || ref,
      }),
      parseWebhook: async () => {
        throw Error("not used");
      },
      refund: async () => ({
        state: "PENDING",
        providerReference: "synthetic-refund",
        providerStatus: "pending",
      }),
    };
    beforeAll(async () => {
      const url = new URL(target!);
      if (
        url.hostname !== "127.0.0.1" ||
        url.port !== "55443" ||
        url.pathname !== "/karigo_pay02_sandbox"
      )
        throw Error("ISOLATED_LOCAL_DATABASE_REQUIRED");
      db = new PrismaClient({ datasourceUrl: target });
      runtime = new OrderPaymentRuntime(
        db as PrismaService,
        { get: () => provider } as unknown as PaymentProviderRegistry,
        new ConfigService({
          ORDER_PAYMENT_RUNTIME_V2_ENABLED: "true",
          PAYMENT_SANDBOX_ISOLATED: "true",
          APP_ENV: "staging",
          ORDER_PAYMENT_V2_PROVIDER: "squad",
        }),
      );
      const service = new PaymentsService(
        db as PrismaService,
        { get: () => provider } as unknown as PaymentProviderRegistry,
        {} as never,
        {} as never,
        new ConfigService(),
        {} as never,
        undefined,
        runtime,
      );
      runtime.bindFinalizer(async (tx, reference, response, gateway) => {
        finalized++;
        return service["processSuccessfulPaymentWithClient"](
          tx,
          reference,
          response,
          gateway,
        );
      });
      const user = await db.user.create({
        data: {
          fullName: "PAY02 Synthetic",
          phoneNumber: "+234800" + String(Date.now()).slice(-7),
          email: `pay02-${randomUUID()}@example.invalid`,
          passwordHash: "NOT_A_LOGIN",
          role: "CUSTOMER",
          customerProfile: { create: { referralCode: randomUUID() } },
        },
        include: { customerProfile: true },
      });
      userId = user.id;
      customerId = user.customerProfile!.id;
    });
    afterAll(async () => {
      await db?.$disconnect();
    });
    beforeEach(() => {
      initializes = 0;
      finalized = 0;
      evidence = {
        transactionReference: "",
        successful: true,
        amountMinor: 10000,
        currency: "NGN",
        normalizedStatus: "SUCCEEDED",
        providerTransactionReference: randomUUID(),
        providerResponse: {},
      };
    });
    async function order() {
      return db.order.create({
        data: {
          orderNumber: `PAY02-${randomUUID()}`,
          customerId,
          serviceCategory: "FOOD",
          totalAmount: new Prisma.Decimal(100),
          orderStatus: "AWAITING_PAYMENT",
          paymentMethod: "SQUAD",
        },
      });
    }
    async function start() {
      const o = await order();
      const result = await runtime.initiate(userId, {
        orderId: o.id,
        amount: 100,
        idempotencyKey: randomUUID(),
      });
      return { o, result };
    }
    it("serializes double taps and callback/webhook/verification races; no double finalization", async () => {
      const o = await order();
      const input = {
        orderId: o.id,
        amount: 100,
        idempotencyKey: randomUUID(),
      };
      const attempts = await Promise.all(
        Array.from({ length: 8 }, () => runtime.initiate(userId, input)),
      );
      expect(initializes).toBe(1);
      expect(new Set(attempts.map((a) => a.attempt.id)).size).toBe(1);
      const reference = attempts[0].payment.transactionReference;
      await Promise.all(
        Array.from({ length: 8 }, () => runtime.verify(userId, reference)),
      );
      expect(finalized).toBe(1);
      expect(await db.notification.count({ where: { entityId: o.id } })).toBe(
        1,
      );
      expect(
        await db.orderStatusHistory.count({
          where: { orderId: o.id, newStatus: "PAID" },
        }),
      ).toBe(1);
      expect(
        (await db.order.findUniqueOrThrow({ where: { id: o.id } }))
          .paymentStatus,
      ).toBe("SUCCESSFUL");
    });
    it.each(["amount", "currency", "reference", "merchant"])(
      "rejects %s evidence mismatch",
      async (kind) => {
        const { result } = await start();
        if (kind === "amount") evidence.amountMinor = 1;
        if (kind === "currency") evidence.currency = "USD";
        if (kind === "reference") evidence.transactionReference = "WRONG";
        if (kind === "merchant") evidence.merchantAccountId = "WRONG";
        await expect(
          runtime.verify(userId, result.payment.transactionReference),
        ).rejects.toThrow();
        expect(finalized).toBe(0);
      },
    );
    it("does not accept a paid delayed attempt after cancellation; flags review", async () => {
      const { o, result } = await start();
      await db.order.update({
        where: { id: o.id },
        data: { orderStatus: "CANCELLED" },
      });
      expect(
        (await runtime.verify(userId, result.payment.transactionReference))
          .attempt.state,
      ).toBe("REVIEW_REQUIRED");
      expect(finalized).toBe(0);
    });
    it("retains original attempt on provider timeout, rather than opening fallback", async () => {
      const initialize = provider.initialize;
      provider.initialize = async () => {
        initializes++;
        throw Error("timeout");
      };
      try {
        const { o, result } = await start();
        expect(result.attempt.state).toBe("UNKNOWN");
        const retry = await runtime.initiate(userId, {
          orderId: o.id,
          amount: 100,
          idempotencyKey: randomUUID(),
        });
        expect(retry.attempt.id).toBe(result.attempt.id);
        expect(initializes).toBe(1);
      } finally {
        provider.initialize = initialize;
      }
    });
    it("separates pending and failed state; server result drives receipt", async () => {
      const { result } = await start();
      evidence.successful = false;
      evidence.normalizedStatus = "PENDING";
      expect(
        (await runtime.verify(userId, result.payment.transactionReference))
          .attempt.state,
      ).toBe("PENDING");
      evidence.normalizedStatus = "FAILED";
      expect(
        (await runtime.verify(userId, result.payment.transactionReference))
          .attempt.state,
      ).toBe("FAILED");
      expect(finalized).toBe(0);
    });
    it("deduplicates provider events, rejects wrong endpoint, preserves unknown references", async () => {
      const { result } = await start();
      const event = {
        ...evidence,
        transactionReference: result.payment.transactionReference,
        verified: true,
        eventType: "charge_successful",
        providerEventId: randomUUID(),
      };
      await runtime.webhook(provider, event);
      const second = await runtime.webhook(provider, event);
      expect(second).toMatchObject({ duplicate: true });
      expect(finalized).toBe(1);
      await expect(
        runtime.webhook({ ...provider, name: "flutterwave" }, event),
      ).rejects.toThrow();
      expect(
        await runtime.webhook(provider, {
          ...event,
          transactionReference: randomUUID(),
          providerEventId: randomUUID(),
        }),
      ).toMatchObject({ reason: "UNKNOWN_REFERENCE" });
    });
    it("serializes refund retries and never marks pending acknowledgement refunded", async () => {
      const { result } = await start();
      await runtime.verify(userId, result.payment.transactionReference);
      await runtime.requestCustomerRefund(userId, result.payment.id);
      const key = randomUUID();
      const refunds = await Promise.all([
        runtime.refund(result.attempt.id, 10000, key),
        runtime.refund(result.attempt.id, 10000, key),
      ]);
      expect(new Set(refunds.map((r) => r.id)).size).toBe(1);
      await expect(
        runtime.refund(result.attempt.id, 10000, randomUUID()),
      ).rejects.toThrow();
      expect(
        (
          await db.payment.findUniqueOrThrow({
            where: { id: result.payment.id },
          })
        ).paymentStatus,
      ).toBe("REFUND_PENDING");
      expect(
        (await runtime.reconcile(result.attempt.id)).discrepancies,
      ).toContain("REFUND_FINAL_STATUS_UNVERIFIABLE");
    });
    it("records reconciliation mismatch without silently correcting", async () => {
      const { result } = await start();
      evidence.amountMinor = 2;
      const r = await runtime.reconcile(result.attempt.id);
      expect(r.corrected).toBe(false);
      expect(r.discrepancies).toContain(
        "REFERENCE_AMOUNT_CURRENCY_OR_ACCOUNT_MISMATCH",
      );
      expect(
        await db.orderPaymentDiscrepancy.count({
          where: { attemptId: result.attempt.id },
        }),
      ).toBeGreaterThan(0);
    });
    it("prevents another customer's verification and changed-key payload", async () => {
      const { result } = await start();
      await expect(
        runtime.verify(randomUUID(), result.payment.transactionReference),
      ).rejects.toThrow();
      const first = await order(),
        second = await order(),
        key = randomUUID();
      await runtime.initiate(userId, {
        orderId: first.id,
        amount: 100,
        idempotencyKey: key,
      });
      await expect(
        runtime.initiate(userId, {
          orderId: second.id,
          amount: 100,
          idempotencyKey: key,
        }),
      ).rejects.toThrow();
    });
    it("keeps in-flight verification available after new routing is disabled", async () => {
      const { result } = await start();
      const stopped = new OrderPaymentRuntime(
        db as PrismaService,
        { get: () => provider } as unknown as PaymentProviderRegistry,
        new ConfigService({
          APP_ENV: "staging",
          ORDER_PAYMENT_RUNTIME_V2_ENABLED: "false",
        }),
      );
      new PaymentsService(
        db as PrismaService,
        {} as never,
        {} as never,
        {} as never,
        new ConfigService(),
        {} as never,
        undefined,
        stopped,
      );
      expect(stopped.enabled()).toBe(false);
      await expect(
        stopped.initiate(userId, {
          orderId: randomUUID(),
          amount: 100,
          idempotencyKey: randomUUID(),
        }),
      ).rejects.toThrow();
      expect(
        (await stopped.verify(userId, result.payment.transactionReference))
          .attempt.state,
      ).toBe("SUCCEEDED");
    });
    it("does not let stale verification overwrite a newer refund state", async () => {
      const { result } = await start();
      const original = provider.verify;
      provider.verify = async (ref) => {
        await db.orderPaymentAttempt.update({
          where: { id: result.attempt.id },
          data: { state: "REFUND_PENDING", version: { increment: 1 } },
        });
        return original(ref);
      };
      try {
        expect(
          (await runtime.verify(userId, result.payment.transactionReference))
            .attempt.state,
        ).toBe("REFUND_PENDING");
        expect(finalized).toBe(0);
      } finally {
        provider.verify = original;
      }
    });
    it("persists verification outage and retries the original event safely", async () => {
      const { result } = await start();
      const original = provider.verify;
      provider.verify = async () => {
        throw Error("synthetic outage");
      };
      const event = {
        ...evidence,
        transactionReference: result.payment.transactionReference,
        verified: true,
        eventType: "charge_successful",
        providerEventId: randomUUID(),
      };
      try {
        expect(await runtime.webhook(provider, event)).toMatchObject({
          retryRequired: true,
        });
      } finally {
        provider.verify = original;
      }
      const inbox = await db.orderPaymentProviderEvent.findFirstOrThrow({
        where: { attemptId: result.attempt.id },
      });
      expect(inbox.state).toBe("RETRY_REQUIRED");
      await runtime.retryEvent(inbox.id);
      await runtime.retryEvent(inbox.id);
      expect(finalized).toBe(1);
    });
    it("serializes a duplicated provider transaction reference across different orders", async () => {
      const one = await start(),
        two = await start();
      const results = await Promise.all([
        runtime.verify(userId, one.result.payment.transactionReference),
        runtime.verify(userId, two.result.payment.transactionReference),
      ]);
      expect(results.map((r) => r.attempt.state).sort()).toEqual([
        "REVIEW_REQUIRED",
        "SUCCEEDED",
      ]);
      expect(finalized).toBe(1);
    });
    it.each(["FAILED", "CANCELLED"] as const)(
      "does not reopen terminal %s when a later lookup returns stale pending",
      async (terminal) => {
        const { result } = await start();
        evidence.successful = false;
        evidence.normalizedStatus = terminal;
        expect(
          (await runtime.verify(userId, result.payment.transactionReference))
            .attempt.state,
        ).toBe(terminal);
        evidence.normalizedStatus = "PENDING";
        expect(
          (await runtime.verify(userId, result.payment.transactionReference))
            .attempt.state,
        ).toBe(terminal);
        expect(
          (
            await db.payment.findUniqueOrThrow({
              where: { id: result.payment.id },
            })
          ).paymentStatus,
        ).toBe(terminal);
        expect(finalized).toBe(0);
      },
    );

    it("finalizes successful evidence racing with a newer pending lookup", async () => {
      const { result } = await start();
      const original = provider.verify;
      provider.verify = async (ref) => {
        await db.orderPaymentAttempt.update({
          where: { id: result.attempt.id },
          data: { state: "PENDING", version: { increment: 1 } },
        });
        return original(ref);
      };
      try {
        expect(
          (await runtime.verify(userId, result.payment.transactionReference))
            .attempt.state,
        ).toBe("SUCCEEDED");
        expect(finalized).toBe(1);
      } finally {
        provider.verify = original;
      }
    });
    it("does not credit provider evidence already refunded externally", async () => {
      const { result } = await start();
      evidence.refundConfirmed = true;
      expect(
        (await runtime.verify(userId, result.payment.transactionReference))
          .attempt.state,
      ).toBe("REVIEW_REQUIRED");
      expect(finalized).toBe(0);
    });
    it("does not require a success webhook for an unpaid pending attempt", async () => {
      const { result } = await start();
      evidence.successful = false;
      evidence.normalizedStatus = "PENDING";
      expect(
        (await runtime.reconcile(result.attempt.id)).discrepancies,
      ).toEqual([]);
    });
    it("blocks legacy initialization of a tracked order after routing rollback", async () => {
      const { o } = await start();
      const stopped = new OrderPaymentRuntime(
        db as PrismaService,
        { get: () => provider } as unknown as PaymentProviderRegistry,
        new ConfigService({
          APP_ENV: "staging",
          ORDER_PAYMENT_RUNTIME_V2_ENABLED: "false",
        }),
      );
      const legacy = { ...provider, name: "flutterwave" };
      const service = new PaymentsService(
        db as PrismaService,
        {
          active: () => legacy,
          customerTestProvider: () => legacy,
          customerCheckoutProviders: () => ["flutterwave"],
        } as unknown as PaymentProviderRegistry,
        {} as never,
        {} as never,
        new ConfigService(),
        {} as never,
        undefined,
        stopped,
      );
      const before = await db.payment.count({ where: { orderId: o.id } });
      await expect(
        service.initiate(userId, {
          orderId: o.id,
          amount: 100,
          paymentMethod: "CARD",
        } as never),
      ).rejects.toThrow("tracked payment");
      expect(await db.payment.count({ where: { orderId: o.id } })).toBe(before);
      expect(initializes).toBe(1);
    });
  },
);
