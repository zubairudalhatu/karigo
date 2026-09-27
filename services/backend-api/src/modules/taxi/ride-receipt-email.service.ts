import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, TaxiRideReceiptEmailKind, TaxiRideReceiptEmailStatus, TaxiTripActorType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];
const RESEND_WINDOW_MS = 10 * 60_000;
const PROCESS_INTERVAL_MS = 30_000;
const PROCESSING_LEASE_MS = 5 * 60_000;

type ReceiptForEmail = Prisma.TaxiRideReceiptGetPayload<Record<string, never>>;
type DeliveryForSummary = Pick<Prisma.TaxiRideReceiptEmailDeliveryGetPayload<Record<string, never>>, "status" | "recipientEmail" | "sentAt" | "attemptCount" | "createdAt">;

@Injectable()
export class RideReceiptEmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RideReceiptEmailService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  onModuleInit() {
    if (!this.enabled()) return;
    this.processPendingSoon();
    this.timer = setInterval(() => void this.processPending(), PROCESS_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  canResend(email?: string | null) {
    return this.enabled() && this.validEmail(email);
  }

  async enqueueAutomatic(tx: Prisma.TransactionClient, receipt: ReceiptForEmail, customerEmail?: string | null) {
    const recipientEmail = this.validEmail(customerEmail) ? customerEmail!.trim().toLowerCase() : null;
    const applicable = this.enabled() && Boolean(recipientEmail);
    return tx.taxiRideReceiptEmailDelivery.upsert({
      where: { dedupeKey: `ride-receipt:${receipt.id}:automatic` },
      update: {},
      create: {
        receiptId: receipt.id,
        tripId: receipt.tripId,
        kind: TaxiRideReceiptEmailKind.AUTOMATIC,
        dedupeKey: `ride-receipt:${receipt.id}:automatic`,
        recipientEmail,
        status: applicable ? TaxiRideReceiptEmailStatus.PENDING : TaxiRideReceiptEmailStatus.NOT_APPLICABLE,
        provider: applicable ? this.provider() : null
      }
    });
  }

  processPendingSoon() {
    if (!this.enabled()) return;
    const timer = setTimeout(() => void this.processPending(), 0);
    timer.unref?.();
  }

  async requestCustomerResend(userId: string, tripId: string) {
    if (!this.enabled()) throw new BadRequestException("Receipt email delivery is not configured.");
    const receipt = await this.prisma.taxiRideReceipt.findFirst({
      where: { tripId, trip: { customer: { userId } } },
      include: { trip: { include: { customer: { include: { user: { select: { email: true } } } } } } }
    });
    if (!receipt) throw new BadRequestException("Ride receipt not found.");
    const recipientEmail = receipt.trip.customer.user.email;
    if (!this.validEmail(recipientEmail)) throw new BadRequestException("Add a valid email address to your KariGO account before requesting a receipt email.");
    const cutoff = new Date(Date.now() - RESEND_WINDOW_MS);
    const recent = await this.prisma.taxiRideReceiptEmailDelivery.findFirst({
      where: { receiptId: receipt.id, kind: TaxiRideReceiptEmailKind.CUSTOMER_RESEND, createdAt: { gte: cutoff } }
    });
    if (recent) throw new HttpException("A receipt email was requested recently. Please wait before trying again.", HttpStatus.TOO_MANY_REQUESTS);
    const bucket = Math.floor(Date.now() / RESEND_WINDOW_MS);
    try {
      const delivery = await this.prisma.taxiRideReceiptEmailDelivery.create({
        data: {
          receiptId: receipt.id,
          tripId,
          kind: TaxiRideReceiptEmailKind.CUSTOMER_RESEND,
          dedupeKey: `ride-receipt:${receipt.id}:customer-resend:${bucket}`,
          recipientEmail: recipientEmail!.trim().toLowerCase(),
          status: TaxiRideReceiptEmailStatus.PENDING,
          provider: this.provider(),
          requestedByUserId: userId
        }
      });
      this.processPendingSoon();
      return this.deliverySummary([delivery], true);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpException("A receipt email was requested recently. Please wait before trying again.", HttpStatus.TOO_MANY_REQUESTS);
      }
      throw error;
    }
  }

  async retryFailed(adminUserId: string, tripId: string) {
    const sent = await this.prisma.taxiRideReceiptEmailDelivery.findFirst({ where: { tripId, status: TaxiRideReceiptEmailStatus.SENT } });
    if (!this.enabled()) throw new BadRequestException("Receipt email delivery is not configured.");
    if (sent) throw new ConflictException("A successful receipt email cannot be retried.");
    const failed = await this.prisma.taxiRideReceiptEmailDelivery.findFirst({
      where: { tripId, status: TaxiRideReceiptEmailStatus.FAILED },
      orderBy: { createdAt: "desc" }
    });
    if (!failed) throw new BadRequestException("There is no failed receipt email to retry.");
    if (failed.attemptCount >= MAX_ATTEMPTS) throw new ConflictException("The receipt email retry limit has been reached.");
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.taxiRideReceiptEmailDelivery.updateMany({
        where: { id: failed.id, status: TaxiRideReceiptEmailStatus.FAILED, attemptCount: { lt: MAX_ATTEMPTS } },
        data: { status: TaxiRideReceiptEmailStatus.PENDING, nextAttemptAt: new Date(), lastError: null }
      });
      if (claimed.count !== 1) throw new ConflictException("Receipt email state changed. Refresh and try again.");
      await tx.taxiTripEvent.create({
        data: {
          tripId,
          actorId: adminUserId,
          actorType: TaxiTripActorType.ADMIN,
          eventType: "RIDE_RECEIPT_EMAIL_RETRY_REQUESTED",
          note: "Authorized Admin requested a failed receipt email retry",
          metadata: { deliveryId: failed.id, attemptCount: failed.attemptCount } as Prisma.InputJsonValue
        }
      });
    });
    this.processPendingSoon();
    return { status: TaxiRideReceiptEmailStatus.PENDING, attemptCount: failed.attemptCount };
  }

  deliverySummary(deliveries: DeliveryForSummary[], canResend: boolean) {
    if (!deliveries.length) {
      return { status: "NOT_SENT_AUTOMATICALLY", maskedRecipientEmail: null, sentAt: null, attemptCount: 0, canResend };
    }
    const sent = deliveries.find((delivery) => delivery.status === TaxiRideReceiptEmailStatus.SENT);
    const delivery = sent ?? deliveries[0];
    return {
      status: delivery.status,
      maskedRecipientEmail: this.maskEmail(delivery.recipientEmail),
      sentAt: delivery.sentAt?.toISOString() ?? null,
      attemptCount: delivery.attemptCount,
      canResend
    };
  }

  render(receipt: ReceiptForEmail, recipientName: string) {
    const e = (value: unknown) => this.escapeHtml(value);
    const money = (kobo: number) => `NGN ${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const distance = receipt.actualDistanceKm ?? receipt.plannedDistanceKm;
    const duration = receipt.durationSeconds === null ? "Not recorded" : `${Math.max(1, Math.round(receipt.durationSeconds / 60))} minutes`;
    const waiting = receipt.billableWaitingSeconds > 0
      ? `${Math.ceil(receipt.billableWaitingSeconds / 60)} minutes — ${money(receipt.waitingChargeKobo)}`
      : `No paid waiting charge — ${money(receipt.waitingChargeKobo)}`;
    const minimumNote = receipt.minimumFareApplied ? "Category minimum fare applied" : "Metered category fare";
    const support = this.config.get<string>("EMAIL_REPLY_TO", "support@karigo.com.ng");
    const date = receipt.completedAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });
    const rows = [
      ["Ride reference", receipt.receiptNumber], ["Date", date], ["Category", receipt.rideCategory], ["City", receipt.city ?? "KariGO service area"],
      ["Pickup", receipt.pickupAddress], ["Destination", receipt.destinationAddress], ["Duration", duration], ["Distance", distance === null ? "Not recorded" : `${Number(distance).toFixed(2)} km`],
      ["Captain", receipt.captainName ?? "KariGO Ride Captain"], ["Vehicle", receipt.vehicleDescription ?? "Not recorded"], ["Registration", receipt.vehiclePlateNumber ?? "Not recorded"],
      ["Ride fare", money(receipt.rideFareKobo)], ["Fare policy", minimumNote], ["Waiting", waiting], ["Discount", money(receipt.discountKobo)], ["Total", money(receipt.totalFareKobo)], ["Payment method", receipt.paymentMethod]
    ];
    const rowHtml = rows.map(([label, value]) => `<tr><td style="padding:8px 0;color:#666;vertical-align:top">${e(label)}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#222">${e(value)}</td></tr>`).join("");
    const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    const subject = `Your KariGO Ride receipt — ${receipt.receiptNumber}`;
    const htmlBody = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#222"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:20px 10px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="background:#242424;padding:24px;color:#fff"><div style="font-size:30px;font-weight:800;color:#e31e24">KariGO</div><div style="margin-top:8px">Ride receipt</div></td></tr><tr><td style="padding:28px"><p>Hello ${e(recipientName)},</p><p>Thank you for riding with KariGO. Your finalized receipt is below.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowHtml}</table><p style="margin-top:24px;padding:14px;background:#fff5f5;border-radius:12px">Your in-app receipt remains available in Ride History. For help, open KariGO Support or email ${e(support)}.</p></td></tr><tr><td style="background:#171717;padding:18px 28px;color:#fff;font-size:12px">KariGO is owned by Zamkah Technologies Limited · ${e(support)}</td></tr></table></td></tr></table></body></html>`;
    const textBody = `KariGO Ride receipt\n\nHello ${recipientName},\n\nThank you for riding with KariGO.\n\n${textRows}\n\nYour receipt remains available in Ride History. For help, open KariGO Support or email ${support}.\n\nKariGO is owned by Zamkah Technologies Limited`;
    return { subject, htmlBody, textBody };
  }

  private async processPending() {
    if (!this.enabled() || this.processing) return;
    this.processing = true;
    try {
      const stale = new Date(Date.now() - PROCESSING_LEASE_MS);
      await this.prisma.taxiRideReceiptEmailDelivery.updateMany({
        where: { status: TaxiRideReceiptEmailStatus.PROCESSING, lastAttemptAt: { lte: stale } },
        data: { status: TaxiRideReceiptEmailStatus.FAILED, nextAttemptAt: new Date(), lastError: "worker_lease_recovered" }
      });
      const now = new Date();
      const candidates = await this.prisma.taxiRideReceiptEmailDelivery.findMany({
        where: {
          status: { in: [TaxiRideReceiptEmailStatus.PENDING, TaxiRideReceiptEmailStatus.FAILED] },
          attemptCount: { lt: MAX_ATTEMPTS },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
        },
        orderBy: { createdAt: "asc" },
        take: 10
      });
      for (const candidate of candidates) await this.processOne(candidate.id, candidate.status, candidate.attemptCount);
    } catch (error) {
      this.logger.error(`Ride receipt email worker failed reason=${this.safeError(error)}`);
    } finally {
      this.processing = false;
    }
  }

  private async processOne(id: string, expectedStatus: TaxiRideReceiptEmailStatus, previousAttempts: number) {
    const claimed = await this.prisma.taxiRideReceiptEmailDelivery.updateMany({
      where: { id, status: expectedStatus, attemptCount: previousAttempts },
      data: { status: TaxiRideReceiptEmailStatus.PROCESSING, attemptCount: { increment: 1 }, lastAttemptAt: new Date(), nextAttemptAt: null }
    });
    if (claimed.count !== 1) return;
    const delivery = await this.prisma.taxiRideReceiptEmailDelivery.findUnique({
      where: { id },
      include: { receipt: true, trip: { include: { customer: { include: { user: { select: { fullName: true } } } } } } }
    });
    if (!delivery) return;
    if (!delivery.recipientEmail) {
      await this.prisma.taxiRideReceiptEmailDelivery.update({ where: { id }, data: { status: TaxiRideReceiptEmailStatus.NOT_APPLICABLE, lastError: null } });
      return;
    }
    try {
      const rendered = this.render(delivery.receipt, delivery.trip.customer.user.fullName);
      const result = await this.send(delivery.recipientEmail, rendered, delivery.dedupeKey);
      await this.prisma.taxiRideReceiptEmailDelivery.update({
        where: { id },
        data: { status: TaxiRideReceiptEmailStatus.SENT, sentAt: new Date(), providerMessageId: result.providerMessageId ?? null, lastError: null, nextAttemptAt: null }
      });
      this.logger.log(`Ride receipt email sent recipient=${this.maskEmail(delivery.recipientEmail)} receipt=${delivery.receipt.receiptNumber}`);
    } catch (error) {
      const attempts = previousAttempts + 1;
      await this.prisma.taxiRideReceiptEmailDelivery.update({
        where: { id },
        data: {
          status: TaxiRideReceiptEmailStatus.FAILED,
          nextAttemptAt: attempts < MAX_ATTEMPTS ? new Date(Date.now() + RETRY_DELAYS_MS[attempts - 1]) : null,
          lastError: this.safeError(error)
        }
      });
      this.logger.warn(`Ride receipt email attempt failed delivery=${id} attempt=${attempts} reason=${this.safeError(error)}`);
    }
  }

  private async send(to: string, rendered: { subject: string; htmlBody: string; textBody: string }, idempotencyKey: string) {
    if (this.provider() === "mock") return { providerMessageId: `mock-${Date.now()}` };
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("RESEND_FROM_EMAIL") ?? this.config.get<string>("EMAIL_FROM");
    if (!apiKey || !from) throw new Error("provider_configuration_missing");
    const response = await fetch(`${this.config.get<string>("RESEND_BASE_URL", "https://api.resend.com").replace(/\/+$/, "")}/emails`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": idempotencyKey },
      body: JSON.stringify({ from, to: [to], reply_to: this.config.get<string>("RESEND_REPLY_TO") ?? this.config.get<string>("EMAIL_REPLY_TO"), subject: rendered.subject, html: rendered.htmlBody, text: rendered.textBody }),
      signal: AbortSignal.timeout(10_000)
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(`resend_http_${response.status}`);
    return { providerMessageId: typeof payload.id === "string" ? payload.id : undefined };
  }

  private enabled() {
    const value = this.config.get<unknown>("RIDE_RECEIPT_EMAIL_ENABLED", false);
    return value === true || (typeof value === "string" && ["true", "1", "yes"].includes(value.toLowerCase()));
  }

  private provider(): "mock" | "resend" {
    return this.config.get<string>("RIDE_RECEIPT_EMAIL_PROVIDER", "mock").toLowerCase() === "resend" ? "resend" : "mock";
  }

  private validEmail(value: unknown): value is string {
    return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private maskEmail(value?: string | null) {
    if (!value || !value.includes("@")) return null;
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}***@${domain}`;
  }

  private escapeHtml(value: unknown) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  private safeError(error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") return "provider_timeout";
    const message = error instanceof Error ? error.message : "provider_error";
    return /^(resend_http_\d{3}|provider_configuration_missing|provider_timeout|worker_lease_recovered)$/.test(message) ? message : "provider_error";
  }
}
