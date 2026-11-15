import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { json } from "express";
import { randomUUID, timingSafeEqual } from "crypto";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { PrismaService } from "../prisma/prisma.service";
import { OrderPaymentRuntime } from "../modules/payments/order-payment-runtime.service";
import { PaymentsService } from "../modules/payments/payments.service";

export async function startPaymentSandbox() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
    rawBody: true,
  });
  const db = app.get(PrismaService),
    runtime = app.get(OrderPaymentRuntime);
  app.get(PaymentsService); // Binds the same transactional business finalizer as ordinary order checkout.
  app.use(
    json({
      limit: "128kb",
      verify: (req: any, _res, bytes) => {
        req.rawBody = bytes;
      },
    }),
  );
  app.use((req: any, res: any, next: any) => {
    res.setHeader("X-KariGO-Environment", "payment-sandbox");
    if (req.path === "/ready")
      return void db.$queryRaw`SELECT 1`
        .then(() =>
          res.json({
            status: "ready",
            environment: "payment-sandbox",
            source: process.env.RENDER_GIT_COMMIT || "local",
            credentialConfigured: Boolean(process.env.SQUAD_SECRET_KEY),
          }),
        )
        .catch(() => res.sendStatus(503));
    if (req.path === "/callback")
      return res
        .type("text")
        .send(
          "Return to KariGO and verify your original payment. This callback does not confirm payment.",
        );
    if (
      /^\/api\/v1\/payments\/webhook\/(squad|flutterwave)$/.test(req.path) &&
      req.method === "POST"
    )
      return next();
    if (!req.path.startsWith("/sandbox/")) return res.sendStatus(404);
    const supplied = Buffer.from(
        req.headers.authorization?.replace(/^Bearer /, "") || "",
      ),
      expected = Buffer.from(process.env.PAYMENT_SANDBOX_OPERATOR_SECRET!);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      return res.sendStatus(401);
    void (async () => {
      if (req.path === "/sandbox/orders" && req.method === "POST") {
        const user = await db.user.upsert({
          where: { email: "checkout@payment-sandbox.invalid" },
          create: {
            fullName: "[PAY02] Synthetic Customer",
            phoneNumber: "+2348000000901",
            email: "checkout@payment-sandbox.invalid",
            passwordHash: "NO_LOGIN_ALLOWED",
            role: "CUSTOMER",
            customerProfile: {
              create: { referralCode: "PAY02_SYNTHETIC_ONLY" },
            },
          },
          update: {},
          include: { customerProfile: true },
        });
        const order = await db.order.create({
          data: {
            customerId: user.customerProfile!.id,
            orderNumber: "PAY02-" + randomUUID(),
            serviceCategory: "FOOD",
            orderStatus: "AWAITING_PAYMENT",
            paymentMethod: "SQUAD",
            totalAmount: 100,
          },
        });
        return res.json(
          await runtime.initiate(user.id, {
            orderId: order.id,
            amount: 100,
            idempotencyKey: "sandbox-order:" + order.id,
          }),
        );
      }
      const verify = req.path.match(
        /^\/sandbox\/verify\/(KGO-ORDER-[a-f0-9-]+)$/,
      );
      if (verify && req.method === "POST") {
        const user = await db.user.findUniqueOrThrow({
          where: { email: "checkout@payment-sandbox.invalid" },
        });
        return res.json(await runtime.verify(user.id, verify[1]));
      }
      const inspect = req.path.match(
        /^\/sandbox\/attempts\/([a-f0-9-]{36})(?:\/(refund|reconcile))?$/,
      );
      if (inspect) {
        const a = await db.orderPaymentAttempt.findUniqueOrThrow({
          where: { id: inspect[1] },
        });
        if (inspect[2] === "refund" && req.method === "POST") {
          if (
            !Number.isSafeInteger(req.body?.amountMinor) ||
            typeof req.body?.idempotencyKey !== "string"
          )
            return res.sendStatus(400);
          const r = await runtime.refund(
            a.id,
            req.body.amountMinor,
            req.body.idempotencyKey,
          );
          return res.json({
            id: r.id,
            state: r.state,
            providerReference: r.providerReference,
          });
        }
        if (inspect[2] === "reconcile" && req.method === "POST")
          return res.json(await runtime.reconcile(a.id));
        if (!inspect[2] && req.method === "GET")
          return res.json({
            id: a.id,
            provider: a.provider,
            environment: a.environment,
            reference: a.transactionReference,
            state: a.state,
            amountMinor: a.amountMinor,
            currency: a.currency,
            version: a.version,
            events: await db.orderPaymentProviderEvent.findMany({
              where: { attemptId: a.id },
              select: { state: true, eventType: true, receivedAt: true },
            }),
            audit: await db.orderPaymentAudit.findMany({
              where: { attemptId: a.id },
              select: { stage: true, reasonCode: true, createdAt: true },
            }),
          });
      }
      return res.sendStatus(404);
    })().catch(() =>
      res
        .status(409)
        .json({
          code: "SANDBOX_OPERATION_NOT_COMPLETED_RECONCILE_ORIGINAL_REFERENCE",
        }),
    );
  });
  configureApp(app, app.get(ConfigService));
  await app.listen(Number(process.env.PORT || 4010), "0.0.0.0");
  process.stdout.write("PAYMENT_SANDBOX_READY\n");
}
