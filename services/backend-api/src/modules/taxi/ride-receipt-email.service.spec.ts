import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma, TaxiRideReceiptEmailKind, TaxiRideReceiptEmailStatus } from "@prisma/client";
import { RideReceiptEmailService } from "./ride-receipt-email.service";

const receipt: any = {
  id: "10000000-0000-4000-8000-000000000001",
  tripId: "20000000-0000-4000-8000-000000000001",
  receiptNumber: "KGR-RIDE-209B",
  currency: "NGN",
  pickupAddress: "<script>Pickup</script>",
  destinationAddress: "Central Area",
  city: "Abuja",
  rideCategory: "STANDARD",
  captainName: "Captain Safe",
  vehicleDescription: "Red Toyota Corolla",
  vehiclePlateNumber: "ABC-123-XY",
  plannedDistanceKm: new Prisma.Decimal("12.5"),
  actualDistanceKm: new Prisma.Decimal("12.2"),
  durationSeconds: 1800,
  rideFareKobo: 500000,
  minimumFareApplied: true,
  totalWaitingSeconds: 420,
  freeWaitingSeconds: 300,
  billableWaitingSeconds: 120,
  waitingChargeKobo: 1000,
  platformFeeKobo: 0,
  discountKobo: 500,
  totalFareKobo: 500500,
  paymentMethod: "CASH",
  completedAt: new Date("2026-08-23T12:00:00.000Z"),
  createdAt: new Date("2026-08-23T12:00:00.000Z"),
  updatedAt: new Date("2026-08-23T12:00:00.000Z")
};

describe("RideReceiptEmailService", () => {
  const prisma: any = {
    taxiRideReceipt: { findFirst: jest.fn() },
    taxiRideReceiptEmailDelivery: {
      upsert: jest.fn(), create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn()
    },
    taxiTripEvent: { create: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(prisma))
  };
  const values: Record<string, unknown> = {
    RIDE_RECEIPT_EMAIL_ENABLED: true,
    RIDE_RECEIPT_EMAIL_PROVIDER: "mock",
    EMAIL_REPLY_TO: "support@karigo.com.ng"
  };
  const config: any = { get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback) };
  const service = new RideReceiptEmailService(prisma, config);

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback: unknown) => values[key] ?? fallback);
  });

  it("creates one idempotent automatic delivery boundary for the correct receipt and Customer email", async () => {
    prisma.taxiRideReceiptEmailDelivery.upsert.mockResolvedValue({ status: TaxiRideReceiptEmailStatus.PENDING });
    await service.enqueueAutomatic(prisma, receipt, "Customer@Example.com");
    expect(prisma.taxiRideReceiptEmailDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { dedupeKey: `ride-receipt:${receipt.id}:automatic` },
      create: expect.objectContaining({
        receiptId: receipt.id,
        tripId: receipt.tripId,
        kind: TaxiRideReceiptEmailKind.AUTOMATIC,
        recipientEmail: "customer@example.com",
        status: TaxiRideReceiptEmailStatus.PENDING
      })
    }));
  });

  it("marks automatic delivery not applicable when the Customer has no usable email", async () => {
    await service.enqueueAutomatic(prisma, receipt, null);
    expect(prisma.taxiRideReceiptEmailDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ recipientEmail: null, status: TaxiRideReceiptEmailStatus.NOT_APPLICABLE })
    }));
  });

  it("renders escaped HTML and immutable fare/waiting data without private Ride communication material", () => {
    const rendered = service.render(receipt, "Amina <Admin>");
    expect(rendered.subject).toContain(receipt.receiptNumber);
    expect(rendered.htmlBody).toContain("Amina &lt;Admin&gt;");
    expect(rendered.htmlBody).toContain("&lt;script&gt;Pickup&lt;/script&gt;");
    expect(rendered.textBody).toContain("Total: NGN 5,005.00");
    expect(rendered.textBody).toContain("Waiting: 2 minutes — NGN 10.00");
    for (const forbidden of ["Ride PIN", "tripPin", "Agora", "RTC", "providerChannel", "+234", "tracePoint"]) {
      expect(JSON.stringify(rendered)).not.toContain(forbidden);
    }
  });

  it("stores a successful provider result once and routine processing cannot claim it again", async () => {
    prisma.taxiRideReceiptEmailDelivery.updateMany.mockResolvedValue({ count: 1 });
    prisma.taxiRideReceiptEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery", recipientEmail: "customer@example.com", receipt,
      trip: { customer: { user: { fullName: "Amina Customer" } } }
    });
    prisma.taxiRideReceiptEmailDelivery.update.mockResolvedValue({});
    await (service as any).processOne("delivery", TaxiRideReceiptEmailStatus.PENDING, 0);
    expect(prisma.taxiRideReceiptEmailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "delivery" }, data: expect.objectContaining({ status: TaxiRideReceiptEmailStatus.SENT, lastError: null })
    }));
    prisma.taxiRideReceiptEmailDelivery.updateMany.mockResolvedValue({ count: 0 });
    await (service as any).processOne("delivery", TaxiRideReceiptEmailStatus.SENT, 1);
    expect(prisma.taxiRideReceiptEmailDelivery.findUnique).toHaveBeenCalledTimes(1);
  });

  it("passes the persistent delivery key to the provider for crash-safe idempotency", async () => {
    prisma.taxiRideReceiptEmailDelivery.updateMany.mockResolvedValue({ count: 1 });
    prisma.taxiRideReceiptEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery", dedupeKey: "ride-receipt:receipt:automatic", recipientEmail: "customer@example.com", receipt,
      trip: { customer: { user: { fullName: "Amina Customer" } } }
    });
    const send = jest.spyOn(service as any, "send").mockResolvedValueOnce({ providerMessageId: "email-1" });
    await (service as any).processOne("delivery", TaxiRideReceiptEmailStatus.PENDING, 0);
    expect(send).toHaveBeenCalledWith("customer@example.com", expect.any(Object), "ride-receipt:receipt:automatic");
  });

  it("recovers a stale final-attempt lease as terminal failed instead of leaving it processing", async () => {
    prisma.taxiRideReceiptEmailDelivery.updateMany.mockResolvedValue({ count: 1 });
    prisma.taxiRideReceiptEmailDelivery.findMany.mockResolvedValue([]);
    await (service as any).processPending();
    expect(prisma.taxiRideReceiptEmailDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: TaxiRideReceiptEmailStatus.PROCESSING, lastAttemptAt: { lte: expect.any(Date) } },
      data: expect.objectContaining({ status: TaxiRideReceiptEmailStatus.FAILED, lastError: "worker_lease_recovered" })
    }));
  });

  it("records provider failure with bounded backoff without throwing into Ride completion", async () => {
    prisma.taxiRideReceiptEmailDelivery.updateMany.mockResolvedValue({ count: 1 });
    prisma.taxiRideReceiptEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery", recipientEmail: "customer@example.com", receipt,
      trip: { customer: { user: { fullName: "Amina Customer" } } }
    });
    jest.spyOn(service as any, "send").mockRejectedValueOnce(new Error("resend_http_503"));
    await expect((service as any).processOne("delivery", TaxiRideReceiptEmailStatus.PENDING, 0)).resolves.toBeUndefined();
    expect(prisma.taxiRideReceiptEmailDelivery.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaxiRideReceiptEmailStatus.FAILED, lastError: "resend_http_503", nextAttemptAt: expect.any(Date) })
    }));
  });

  it("prevents Customer access to another Customer's receipt and guards resend duplication", async () => {
    prisma.taxiRideReceipt.findFirst.mockResolvedValueOnce(null);
    await expect(service.requestCustomerResend("other-user", receipt.tripId)).rejects.toBeInstanceOf(BadRequestException);
    prisma.taxiRideReceipt.findFirst.mockResolvedValueOnce({ ...receipt, trip: { customer: { user: { email: "customer@example.com" } } } });
    prisma.taxiRideReceiptEmailDelivery.findFirst.mockResolvedValueOnce({ id: "recent" });
    await expect(service.requestCustomerResend("customer-user", receipt.tripId)).rejects.toMatchObject({ status: 429 });
  });

  it("atomically audits an authorized failed-delivery retry", async () => {
    prisma.taxiRideReceiptEmailDelivery.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "failed", attemptCount: 1 });
    prisma.taxiRideReceiptEmailDelivery.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.retryFailed("30000000-0000-4000-8000-000000000001", receipt.tripId)).resolves.toMatchObject({ status: "PENDING" });
    expect(prisma.taxiRideReceiptEmailDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "failed", status: TaxiRideReceiptEmailStatus.FAILED })
    }));
    expect(prisma.taxiTripEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ eventType: "RIDE_RECEIPT_EMAIL_RETRY_REQUESTED", actorType: "ADMIN" })
    }));
  });

  it("rejects Admin retry after success and after the bounded retry limit", async () => {
    prisma.taxiRideReceiptEmailDelivery.findFirst.mockResolvedValueOnce({ id: "sent" });
    await expect(service.retryFailed("admin-user", receipt.tripId)).rejects.toBeInstanceOf(ConflictException);
    prisma.taxiRideReceiptEmailDelivery.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "failed", attemptCount: 3 });
    await expect(service.retryFailed("admin-user", receipt.tripId)).rejects.toBeInstanceOf(ConflictException);
  });
});
