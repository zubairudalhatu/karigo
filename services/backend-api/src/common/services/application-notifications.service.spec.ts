import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { ApplicationNotificationsService } from "./application-notifications.service";

describe("ApplicationNotificationsService", () => {
  afterEach(() => jest.restoreAllMocks());

  it("stays disabled unless application notifications are explicitly enabled", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const service = new ApplicationNotificationsService({
      get: jest.fn((_key, fallback) => fallback)
    } as unknown as ConfigService);

    await service.vendorApplicationSubmitted({
      reference: "KGO-APP-2026-ABC123",
      recipientName: "Demo Vendor",
      phoneNumber: "+2348030000000",
      email: "vendor@example.test"
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses mock SMS and email without network calls when enabled in mock mode", async () => {
    const fetchSpy = jest.spyOn(global, "fetch");
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        APPLICATION_NOTIFICATIONS_ENABLED: true,
        APPLICATION_NOTIFICATION_EMAIL_ENABLED: true,
        APPLICATION_NOTIFICATION_SMS_ENABLED: true,
        APPLICATION_NOTIFICATION_EMAIL_PROVIDER: "mock",
        APPLICATION_NOTIFICATION_SMS_PROVIDER: "mock"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.deliveryCaptainApplicationSubmitted({
      reference: "KGO-CAPTAIN-2026-ABC123",
      recipientName: "Demo Captain",
      phoneNumber: "+2348030000000",
      email: "captain@example.test"
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends application email through Resend and guarantor SMS through Termii when configured", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "email-1" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message_id: "sms-1" }) } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        APPLICATION_NOTIFICATIONS_ENABLED: true,
        APPLICATION_NOTIFICATION_EMAIL_ENABLED: true,
        APPLICATION_NOTIFICATION_SMS_ENABLED: true,
        APPLICATION_NOTIFICATION_EMAIL_PROVIDER: "resend",
        APPLICATION_NOTIFICATION_SMS_PROVIDER: "termii",
        RESEND_API_KEY: "resend-test-key-not-real",
        RESEND_FROM_EMAIL: "no-reply@example.test",
        RESEND_REPLY_TO: "support@example.test",
        RESEND_BASE_URL: "https://api.resend.com",
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com",
        EMAIL_REPLY_TO: "support@example.test",
        KARIGO_PILOT_EMAIL_LABEL: "Kano controlled early access"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.deliveryCaptainApplicationSubmitted({
      reference: "KGO-CAPTAIN-2026-ABC123",
      recipientName: "Demo Captain",
      phoneNumber: "+2348030000000",
      email: "captain@example.test"
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: expect.stringContaining("resend-test-key-not-real") })
      })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://api.ng.termii.com/api/sms/send",
      expect.objectContaining({ method: "POST" })
    );
    const smsBody = JSON.parse((fetch as jest.Mock).mock.calls[1][1].body);
    expect(smsBody.api_key).toBe("termii-test-key-not-real");
    expect(smsBody.sms).toContain("does not activate dispatch or payouts");
  });

  it("uses current Render application notification flags without requiring the legacy master flag", async () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "email-1" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message_id: "sms-1" }) } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        APPLICATION_EMAIL_NOTIFICATIONS_ENABLED: true,
        APPLICATION_SMS_NOTIFICATIONS_ENABLED: true,
        RESEND_API_KEY: "resend-test-key-not-real",
        RESEND_FROM_EMAIL: "no-reply@example.test",
        RESEND_BASE_URL: "https://api.resend.com",
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com",
        EMAIL_REPLY_TO: "support@example.test"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.vendorApplicationSubmitted({
      reference: "KGO-APP-2026-ABC123",
      recipientName: "Demo Vendor",
      phoneNumber: "+2348030000000",
      email: "vendor@example.test"
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, "https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    expect(fetch).toHaveBeenNthCalledWith(2, "https://api.ng.termii.com/api/sms/send", expect.objectContaining({ method: "POST" }));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Application notification decision type=vendor_application_received"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("smsProvider=termii emailProvider=resend result=sent"));
  });

  it("notifies Delivery Captain guarantors by SMS only", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ message_id: "sms-1" }) } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        APPLICATION_NOTIFICATIONS_ENABLED: true,
        APPLICATION_NOTIFICATION_SMS_ENABLED: true,
        APPLICATION_NOTIFICATION_SMS_PROVIDER: "termii",
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.deliveryCaptainGuarantorListed({
      reference: "KGO-CAPTAIN-2026-ABC123",
      applicantName: "Demo Captain",
      guarantorName: "Demo Guarantor",
      guarantorPhone: "+2348030000001"
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.to).toBe("+2348030000001");
    expect(body.sms).toContain("listed you as guarantor");
    expect(body.sms).toContain("Do not share OTPs or payment details");
  });

  it("uses the dedicated guarantor SMS flag for guarantor notifications", async () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ message_id: "sms-1" }) } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        GUARANTOR_SMS_NOTIFICATIONS_ENABLED: true,
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.deliveryCaptainGuarantorListed({
      reference: "KGO-CAPTAIN-2026-ABC123",
      applicantName: "Demo Captain",
      guarantorName: "Demo Guarantor",
      guarantorPhone: "+2348030000001"
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Application notification decision type=delivery_captain_guarantor_listed"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("smsEnabled=true emailEnabled=false"));
  });

  it("sends Ride Captain readiness notifications only when Ride application flags are enabled", async () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "email-ride-1" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message_id: "sms-ride-1", message: "Successfully Sent" }) } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        RIDE_APPLICATION_EMAIL_NOTIFICATIONS_ENABLED: true,
        RIDE_APPLICATION_SMS_NOTIFICATIONS_ENABLED: true,
        RESEND_API_KEY: "resend-test-key-not-real",
        RESEND_FROM_EMAIL: "no-reply@example.test",
        RESEND_BASE_URL: "https://api.resend.com",
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.rideCaptainApplicationSubmitted({
      reference: "KGO-TAXI-2026-ABC123",
      recipientName: "Ride Captain",
      phoneNumber: "+2348030000000",
      email: "captain@example.test"
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    const smsBody = JSON.parse((fetch as jest.Mock).mock.calls[1][1].body);
    expect(smsBody.sms).toContain("KariGO Rides remains readiness-only");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Application notification decision type=ride_captain_application_received"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("smsProvider=termii emailProvider=resend result=sent"));
  });

  it("sends Ride waitlist notifications only when waitlist flags are enabled", async () => {
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "email-waitlist-1" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message_id: "sms-waitlist-1" }) } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        RIDE_WAITLIST_EMAIL_NOTIFICATIONS_ENABLED: true,
        RIDE_WAITLIST_SMS_NOTIFICATIONS_ENABLED: true,
        RESEND_API_KEY: "resend-test-key-not-real",
        RESEND_FROM_EMAIL: "no-reply@example.test",
        RESEND_BASE_URL: "https://api.resend.com",
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.rideWaitlistJoined({
      reference: "00000000-0000-0000-0000-00000000b001",
      recipientName: "Waitlist Customer",
      phoneNumber: "+2348030000001",
      email: "waitlist@example.test"
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    const smsBody = JSON.parse((fetch as jest.Mock).mock.calls[1][1].body);
    expect(smsBody.sms).toContain("KariGO Rides is not live yet");
  });

  it("sends order-created transactional notifications only when order flags are enabled", async () => {
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "email-order-1" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message_id: "sms-order-1" }) } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        ORDER_EMAIL_NOTIFICATIONS_ENABLED: true,
        ORDER_SMS_NOTIFICATIONS_ENABLED: true,
        RESEND_API_KEY: "resend-test-key-not-real",
        RESEND_FROM_EMAIL: "no-reply@example.test",
        RESEND_BASE_URL: "https://api.resend.com",
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.orderCreated({
      reference: "KGO-ORDER-1",
      recipientName: "Demo Customer",
      phoneNumber: "+2348030000001",
      email: "customer@example.test"
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    const smsBody = JSON.parse((fetch as jest.Mock).mock.calls[1][1].body);
    expect(smsBody.sms).toContain("Mock payment remains selected");
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Application notification decision type=order_created"));
  });

  it("logs safe Termii rejection diagnostics without exposing full recipient data", async () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Rejected for +2348030000001" })
    } as Response);
    const service = new ApplicationNotificationsService({
      get: jest.fn((key: string, fallback: unknown) => ({
        ORDER_SMS_NOTIFICATIONS_ENABLED: true,
        TERMII_API_KEY: "termii-test-key-not-real",
        TERMII_SENDER_ID: "KariGO",
        TERMII_BASE_URL: "https://api.ng.termii.com"
      }[key] ?? fallback))
    } as unknown as ConfigService);

    await service.orderCreated({
      reference: "KGO-ORDER-1",
      recipientName: "Demo Customer",
      phoneNumber: "+2348030000001"
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Termii SMS rejected recipient=+234***001 status=400 message=Rejected for [phone]"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Application notification decision type=order_created"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("result=failed reason=provider_error"));
  });
});
