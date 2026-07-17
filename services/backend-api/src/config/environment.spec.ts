import { normalizeApiPrefix, validateEnvironment } from "./environment";

describe("environment configuration", () => {
  const testDatabaseUrl = "TEST_DATABASE_URL_PLACEHOLDER";
  const baseConfig = () => ({
    DATABASE_URL: testDatabaseUrl,
    JWT_SECRET: "test-secret"
  });
  const squadLiveConfig = (overrides: Record<string, unknown> = {}) => ({
    ...baseConfig(),
    PAYMENTS_LIVE_ENABLED: "true",
    PAYMENT_PROVIDER: "squad",
    SQUAD_MODE: "live",
    SQUAD_SECRET_KEY: "live-squad-secret-placeholder",
    SQUAD_BASE_URL: "https://api-d.squadco.com",
    SQUAD_CALLBACK_URL: "https://api.karigo.com.ng/api/v1/payments/callback/squad",
    SQUAD_WEBHOOK_SECRET: "live-webhook-secret-placeholder",
    SQUAD_LIVE_ACTIVATION_APPROVED: "true",
    ...overrides
  });

  it("normalizes the API prefix", () => {
    expect(normalizeApiPrefix("/api/v1/")).toBe("api/v1");
  });

  it("adds safe defaults while retaining required values", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret"
    });

    expect(result.APP_PORT).toBe(4000);
    expect(result.API_PREFIX).toBe("/api/v1");
    expect(result.JWT_EXPIRES_IN_SECONDS).toBe(604800);
    expect(result.OTP_LENGTH).toBe(6);
    expect(result.OTP_PROVIDER).toBe("mock");
    expect(result.OTP_MAX_ATTEMPTS).toBe(5);
    expect(result.EMAIL_PROVIDER).toBe("mock");
    expect(result.EMAIL_FROM).toBe("no-reply@karigo.com.ng");
    expect(result.ACCOUNT_ACTIVATION_EMAIL_ENABLED).toBe(false);
    expect(result.ACCOUNT_ACTIVATION_EMAIL_PROVIDER).toBe("mock");
    expect(result.RESEND_BASE_URL).toBe("https://api.resend.com");
    expect(result.KARIGO_EMAIL_LOGO_URL).toBe("");
    expect(result.KARIGO_PILOT_EMAIL_LABEL).toBe("Kano controlled early access");
    expect(result.PAYMENTS_LIVE_ENABLED).toBe(false);
    expect(result.PAYMENT_PROVIDER).toBe("mock");
    expect(result.PAYMENTS_PROVIDER).toBe("mock");
    expect(result.MONNIFY_BASE_URL).toBe("https://sandbox.monnify.com");
    expect(result.SQUAD_BASE_URL).toBe("https://sandbox-api-d.squadco.com");
    expect(result.APPLICATION_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.TRANSACTIONAL_EMAIL_NOTIFICATION_PROVIDER).toBe("mock");
    expect(result.TRANSACTIONAL_SMS_NOTIFICATION_PROVIDER).toBe("mock");
    expect(result.APPLICATION_EMAIL_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.APPLICATION_NOTIFICATION_EMAIL_ENABLED).toBe(false);
    expect(result.APPLICATION_EMAIL_NOTIFICATION_PROVIDER).toBe("mock");
    expect(result.APPLICATION_NOTIFICATION_EMAIL_PROVIDER).toBe("mock");
    expect(result.APPLICATION_SMS_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.APPLICATION_NOTIFICATION_SMS_ENABLED).toBe(false);
    expect(result.GUARANTOR_SMS_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.APPLICATION_SMS_NOTIFICATION_PROVIDER).toBe("mock");
    expect(result.APPLICATION_NOTIFICATION_SMS_PROVIDER).toBe("mock");
    expect(result.RIDE_APPLICATION_EMAIL_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.RIDE_APPLICATION_SMS_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.RIDE_WAITLIST_EMAIL_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.RIDE_WAITLIST_SMS_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.ORDER_EMAIL_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.ORDER_SMS_NOTIFICATIONS_ENABLED).toBe(false);
    expect(result.WHATSAPP_PROVIDER).toBe("mock");
    expect(result.WHATSAPP_API_VERSION).toBe("v20.0");
    expect(result.PUSH_PROVIDER).toBe("mock");
  });

  it("converts JWT duration strings to seconds", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "2h"
    });

    expect(result.JWT_EXPIRES_IN_SECONDS).toBe(7200);
  });

  it("rejects a missing database URL", () => {
    expect(() => validateEnvironment({ JWT_SECRET: "test-secret" })).toThrow(
      "Missing required environment variable: DATABASE_URL"
    );
  });

  it("allows Paystack sandbox selection with a test key", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "paystack",
      PAYSTACK_SECRET_KEY: "sk_test_not-a-real-key"
    });
    expect(result.PAYMENT_PROVIDER).toBe("paystack");
    expect(result.PAYSTACK_BASE_URL).toBe("https://api.paystack.co");
  });

  it("does not allow Paystack selection without a sandbox secret", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "paystack"
    })).toThrow("Missing required environment variable: PAYSTACK_SECRET_KEY");
  });

  it("rejects a live Paystack key while sandbox integration is enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "paystack",
      PAYSTACK_SECRET_KEY: "live-key-do-not-use"
    })).toThrow("PAYSTACK_SECRET_KEY must be a Paystack test key");
  });

  it("honors PAYMENTS_PROVIDER as the active payment provider alias", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENTS_PROVIDER: "mock"
    });

    expect(result.PAYMENT_PROVIDER).toBe("mock");
    expect(result.PAYMENTS_PROVIDER).toBe("mock");
  });

  it("allows Monnify sandbox selection with test-mode credentials", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "monnify",
      MONNIFY_MODE: "test",
      MONNIFY_API_KEY: "monnify-test-api-key-not-real",
      MONNIFY_SECRET_KEY: "monnify-test-secret-not-real",
      MONNIFY_CONTRACT_CODE: "1234567890"
    });

    expect(result.PAYMENT_PROVIDER).toBe("monnify");
    expect(result.MONNIFY_BASE_URL).toBe("https://sandbox.monnify.com");
  });

  it("does not allow Monnify selection without sandbox credentials", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "monnify",
      MONNIFY_MODE: "test"
    })).toThrow("Missing required environment variable: MONNIFY_API_KEY");
  });

  it("rejects Monnify unless sandbox mode is explicit", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "monnify",
      MONNIFY_API_KEY: "monnify-test-api-key-not-real",
      MONNIFY_SECRET_KEY: "monnify-test-secret-not-real",
      MONNIFY_CONTRACT_CODE: "1234567890"
    })).toThrow("MONNIFY_MODE must be test or sandbox");
  });

  it("allows Squad sandbox selection with a sandbox key", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "squad",
      SQUAD_MODE: "test",
      SQUAD_SECRET_KEY: "sandbox_sk_not-a-real-key"
    });

    expect(result.PAYMENT_PROVIDER).toBe("squad");
    expect(result.SQUAD_BASE_URL).toBe("https://sandbox-api-d.squadco.com");
  });

  it("rejects Squad live keys while sandbox integration is enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENT_PROVIDER: "squad",
      SQUAD_MODE: "test",
      SQUAD_SECRET_KEY: "non-sandbox-key-do-not-use"
    })).toThrow("SQUAD_SECRET_KEY must be a Squad sandbox key");
  });

  it("allows startup when live payments are disabled", () => {
    const result = validateEnvironment(squadLiveConfig({
      PAYMENTS_LIVE_ENABLED: "false",
      PAYMENT_PROVIDER: "mock"
    }));

    expect(result.PAYMENTS_LIVE_ENABLED).toBe(false);
    expect(result.PAYMENT_PROVIDER).toBe("mock");
    expect(result.PAYMENTS_PROVIDER).toBe("mock");
  });

  it("rejects live payments unless Squad is the selected provider", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENTS_LIVE_ENABLED: "true",
      PAYMENT_PROVIDER: "paystack"
    })).toThrow("Live payments require PAYMENT_PROVIDER=squad");
  });

  it("rejects live Squad payments unless Squad mode is live", () => {
    expect(() => validateEnvironment(squadLiveConfig({
      SQUAD_MODE: "sandbox"
    }))).toThrow("Live Squad payments require SQUAD_MODE=live");
  });

  it("rejects live Squad payments without a secret key", () => {
    expect(() => validateEnvironment(squadLiveConfig({
      SQUAD_SECRET_KEY: ""
    }))).toThrow("Live Squad payments require SQUAD_SECRET_KEY");
  });

  it("rejects live Squad payments without a webhook secret", () => {
    expect(() => validateEnvironment(squadLiveConfig({
      SQUAD_WEBHOOK_SECRET: ""
    }))).toThrow("Live Squad payments require SQUAD_WEBHOOK_SECRET");
  });

  it("rejects live Squad payments when the base URL is not HTTPS", () => {
    expect(() => validateEnvironment(squadLiveConfig({
      SQUAD_BASE_URL: "http://api-d.squadco.com"
    }))).toThrow("Live Squad payments require HTTPS SQUAD_BASE_URL");
  });

  it("rejects live Squad payments when the callback URL is not HTTPS", () => {
    expect(() => validateEnvironment(squadLiveConfig({
      SQUAD_CALLBACK_URL: "http://api.karigo.com.ng/api/v1/payments/callback/squad"
    }))).toThrow("Live Squad payments require HTTPS SQUAD_CALLBACK_URL");
  });

  it("rejects live Squad payments without explicit activation approval", () => {
    expect(() => validateEnvironment(squadLiveConfig({
      SQUAD_LIVE_ACTIVATION_APPROVED: "false"
    }))).toThrow("Live Squad payments require SQUAD_LIVE_ACTIVATION_APPROVED=true");
  });

  it("allows approved live Squad payment configuration", () => {
    const result = validateEnvironment(squadLiveConfig({
      PAYMENTS_PROVIDER: "squad",
      PAYMENT_PROVIDER: undefined
    }));

    expect(result.PAYMENTS_LIVE_ENABLED).toBe(true);
    expect(result.PAYMENT_PROVIDER).toBe("squad");
    expect(result.PAYMENTS_PROVIDER).toBe("squad");
    expect(result.SQUAD_BASE_URL).toBe("https://api-d.squadco.com");
  });

  it("allows Termii preparation only with configured non-production credentials", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      OTP_PROVIDER: "termii",
      TERMII_API_KEY: "test-key-not-real",
      TERMII_SENDER_ID: "KariGO"
    });
    expect(result.OTP_PROVIDER).toBe("termii");
    expect(result.TERMII_BASE_URL).toBe("https://api.ng.termii.com");
  });

  it("does not allow Termii selection without credentials", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      OTP_PROVIDER: "termii"
    })).toThrow("Missing required environment variable: TERMII_API_KEY");
  });

  it("does not expose the Termii preparation adapter in production", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "production",
      OTP_PROVIDER: "termii",
      TERMII_API_KEY: "test-key-not-real",
      TERMII_SENDER_ID: "KariGO"
    })).toThrow("Termii is restricted to sandbox preparation");
  });

  it("keeps real email providers disabled until sandbox approval", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      EMAIL_PROVIDER: "smtp"
    })).toThrow("EMAIL_PROVIDER must remain mock");
  });

  it("allows Resend only for explicitly enabled account activation email outside production", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      ACCOUNT_ACTIVATION_EMAIL_ENABLED: "true",
      ACCOUNT_ACTIVATION_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "resend-test-key-not-real",
      RESEND_FROM_EMAIL: "no-reply@example.test",
      KARIGO_EMAIL_LOGO_URL: "https://www.karigo.com.ng/karigo-logo.png"
    });

    expect(result.ACCOUNT_ACTIVATION_EMAIL_ENABLED).toBe(true);
    expect(result.ACCOUNT_ACTIVATION_EMAIL_PROVIDER).toBe("resend");
    expect(result.KARIGO_EMAIL_LOGO_URL).toBe("https://www.karigo.com.ng/karigo-logo.png");
    expect(result.EMAIL_PROVIDER).toBe("mock");
  });

  it("rejects non-HTTPS activation email logo URLs", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      KARIGO_EMAIL_LOGO_URL: "http://example.test/logo.png"
    })).toThrow("KARIGO_EMAIL_LOGO_URL must use HTTPS");
  });

  it("keeps Resend account activation email blocked without credentials when enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      ACCOUNT_ACTIVATION_EMAIL_ENABLED: "true",
      ACCOUNT_ACTIVATION_EMAIL_PROVIDER: "resend"
    })).toThrow("Missing required environment variable: RESEND_API_KEY");
  });

  it("does not expose Resend account activation email in production", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "production",
      ACCOUNT_ACTIVATION_EMAIL_PROVIDER: "resend"
    })).toThrow("Resend account activation email is restricted");
  });

  it("allows controlled application notification email and SMS only outside production", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      APPLICATION_EMAIL_NOTIFICATIONS_ENABLED: "true",
      APPLICATION_SMS_NOTIFICATIONS_ENABLED: "true",
      GUARANTOR_SMS_NOTIFICATIONS_ENABLED: "true",
      RESEND_API_KEY: "resend-test-key-not-real",
      RESEND_FROM_EMAIL: "no-reply@example.test",
      TERMII_API_KEY: "termii-test-key-not-real",
      TERMII_SENDER_ID: "KariGO"
    });

    expect(result.APPLICATION_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.APPLICATION_EMAIL_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.APPLICATION_NOTIFICATION_EMAIL_ENABLED).toBe(true);
    expect(result.APPLICATION_EMAIL_NOTIFICATION_PROVIDER).toBe("resend");
    expect(result.APPLICATION_NOTIFICATION_EMAIL_PROVIDER).toBe("resend");
    expect(result.APPLICATION_SMS_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.APPLICATION_NOTIFICATION_SMS_ENABLED).toBe(true);
    expect(result.GUARANTOR_SMS_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.APPLICATION_SMS_NOTIFICATION_PROVIDER).toBe("termii");
    expect(result.APPLICATION_NOTIFICATION_SMS_PROVIDER).toBe("termii");
  });

  it("keeps backward-compatible application notification flag aliases", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      APPLICATION_NOTIFICATIONS_ENABLED: "true",
      APPLICATION_NOTIFICATION_EMAIL_ENABLED: "true",
      APPLICATION_NOTIFICATION_EMAIL_PROVIDER: "mock",
      APPLICATION_NOTIFICATION_SMS_ENABLED: "true",
      APPLICATION_NOTIFICATION_SMS_PROVIDER: "mock"
    });

    expect(result.APPLICATION_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.APPLICATION_EMAIL_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.APPLICATION_NOTIFICATION_EMAIL_ENABLED).toBe(true);
    expect(result.APPLICATION_EMAIL_NOTIFICATION_PROVIDER).toBe("mock");
    expect(result.APPLICATION_SMS_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.APPLICATION_NOTIFICATION_SMS_ENABLED).toBe(true);
    expect(result.APPLICATION_SMS_NOTIFICATION_PROVIDER).toBe("mock");
  });

  it("keeps application notification email blocked without Resend credentials when enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      APPLICATION_EMAIL_NOTIFICATIONS_ENABLED: "true"
    })).toThrow("Missing required environment variable: RESEND_API_KEY");
  });

  it("keeps application notification SMS blocked without Termii credentials when enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      APPLICATION_SMS_NOTIFICATIONS_ENABLED: "true"
    })).toThrow("Missing required environment variable: TERMII_API_KEY");
  });

  it("keeps guarantor notification SMS blocked without Termii credentials when enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      GUARANTOR_SMS_NOTIFICATIONS_ENABLED: "true"
    })).toThrow("Missing required environment variable: TERMII_API_KEY");
  });

  it("does not expose application notification sending in production", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "production",
      APPLICATION_NOTIFICATIONS_ENABLED: "true"
    })).toThrow("Transactional notification sending is restricted");
  });

  it("allows controlled Ride readiness and order notification flags only outside production", () => {
    const result = validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      RIDE_APPLICATION_EMAIL_NOTIFICATIONS_ENABLED: "true",
      RIDE_APPLICATION_SMS_NOTIFICATIONS_ENABLED: "true",
      RIDE_WAITLIST_EMAIL_NOTIFICATIONS_ENABLED: "true",
      RIDE_WAITLIST_SMS_NOTIFICATIONS_ENABLED: "true",
      ORDER_EMAIL_NOTIFICATIONS_ENABLED: "true",
      ORDER_SMS_NOTIFICATIONS_ENABLED: "true",
      RESEND_API_KEY: "resend-test-key-not-real",
      RESEND_FROM_EMAIL: "no-reply@example.test",
      TERMII_API_KEY: "termii-test-key-not-real",
      TERMII_SENDER_ID: "KariGO"
    });

    expect(result.TRANSACTIONAL_EMAIL_NOTIFICATION_PROVIDER).toBe("resend");
    expect(result.TRANSACTIONAL_SMS_NOTIFICATION_PROVIDER).toBe("termii");
    expect(result.RIDE_APPLICATION_EMAIL_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.RIDE_APPLICATION_SMS_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.RIDE_WAITLIST_EMAIL_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.RIDE_WAITLIST_SMS_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.ORDER_EMAIL_NOTIFICATIONS_ENABLED).toBe(true);
    expect(result.ORDER_SMS_NOTIFICATIONS_ENABLED).toBe(true);
  });

  it("keeps order email blocked without Resend credentials when enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      ORDER_EMAIL_NOTIFICATIONS_ENABLED: "true"
    })).toThrow("Missing required environment variable: RESEND_API_KEY");
  });

  it("keeps Ride waitlist SMS blocked without Termii credentials when enabled", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      APP_ENV: "staging",
      RIDE_WAITLIST_SMS_NOTIFICATIONS_ENABLED: "true"
    })).toThrow("Missing required environment variable: TERMII_API_KEY");
  });

  it("keeps Meta WhatsApp Cloud disabled until sandbox approval", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      WHATSAPP_PROVIDER: "meta_cloud"
    })).toThrow("WHATSAPP_PROVIDER must remain mock");
  });

  it("keeps Expo and Firebase push disabled until sandbox approval", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PUSH_PROVIDER: "expo"
    })).toThrow("PUSH_PROVIDER must remain mock");
  });
});
