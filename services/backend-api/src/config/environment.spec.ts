import { normalizeApiPrefix, validateEnvironment } from "./environment";

describe("environment configuration", () => {
  const testDatabaseUrl = "TEST_DATABASE_URL_PLACEHOLDER";
  const baseConfig = () => ({
    DATABASE_URL: testDatabaseUrl,
    JWT_SECRET: "test-secret"
  });
  const flutterwaveLiveConfig = (overrides: Record<string, unknown> = {}) => ({
    ...baseConfig(),
    PAYMENTS_LIVE_ENABLED: "true",
    PAYMENT_PROVIDER: "flutterwave",
    FLUTTERWAVE_ENVIRONMENT: "live",
    FLUTTERWAVE_API_MODE: "v3",
    FLUTTERWAVE_SECRET_KEY: "flutterwave-secret-key-placeholder",
    FLUTTERWAVE_BASE_URL: "https://api.flutterwave.com/v3",
    FLUTTERWAVE_REDIRECT_URL: "https://api.karigo.com.ng/api/v1/payments/callback/flutterwave",
    FLUTTERWAVE_SECRET_HASH: "live-flutterwave-webhook-secret-placeholder",
    FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED: "true",
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
    expect(result.KARIGO_PILOT_EMAIL_LABEL).toBe("Kano and Abuja launch onboarding");
    expect(result.CUSTOMER_APP_DEEP_LINK_BASE).toBe("karigo-customer:///profile/wallet");
    expect(result.CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL).toBe("karigo-customer:///profile/wallet");
    expect(result.CUSTOMER_WEB_PAYMENT_FALLBACK_URL).toBe("https://www.karigo.com.ng/payment/flutterwave/return");
    expect(result.DIRECT_URL).toBe("");
    expect(result.PRISMA_ACCELERATE_ENABLED).toBe(false);
    expect(result.PAYMENTS_LIVE_ENABLED).toBe(false);
    expect(result.PAYMENT_PROVIDER).toBe("mock");
    expect(result.PAYMENTS_PROVIDER).toBe("mock");
    expect(result.MONNIFY_BASE_URL).toBe("https://sandbox.monnify.com");
    expect(result.SQUAD_BASE_URL).toBe("https://sandbox-api-d.squadco.com");
    expect(result.UTILITIES_PROVIDER).toBe("mock");
    expect(result.UTILITIES_PROVIDER_NAME).toBe("mock");
    expect(result.UTILITIES_ENABLED).toBe(false);
    expect(result.UTILITIES_PROVIDER_ENABLED).toBe(false);
    expect(result.UTILITIES_TEST_MODE).toBe(true);
    expect(result.UTILITIES_CUSTOMER_PURCHASE_ENABLED).toBe(false);
    expect(result.UTILITIES_CUSTOMER_PURCHASES_ENABLED).toBe(false);
    expect(result.UTILITIES_WALLET_PAYMENT_ENABLED).toBe(false);
    expect(result.UTILITIES_LIVE_FULFILLMENT_ENABLED).toBe(false);
    expect(result.ACCELERATE_ENABLED).toBe(false);
    expect(result.ACCELERATE_UTILITIES_ENABLED).toBe(false);
    expect(result.ACCELERATE_BASE_URL).toBe("");
    expect(result.ACCELERATE_API_BASE_URL).toBe("");
    expect(result.ACCELERATE_ENV).toBe("sandbox");
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

  it("auto-enables Prisma Accelerate when DATABASE_URL is an Accelerate URL", () => {
    const result = validateEnvironment({
      DATABASE_URL: "prisma://accelerate.prisma-data.net/?api_key=placeholder",
      DIRECT_URL: "postgresql://user:password@db.example.test:5432/karigo",
      JWT_SECRET: "test-secret"
    });

    expect(result.PRISMA_ACCELERATE_ENABLED).toBe(true);
  });

  it("allows explicit Prisma Accelerate only with an Accelerate DATABASE_URL and DIRECT_URL", () => {
    const result = validateEnvironment({
      DATABASE_URL: "prisma://accelerate.prisma-data.net/?api_key=placeholder",
      DIRECT_URL: "postgresql://user:password@db.example.test:5432/karigo",
      JWT_SECRET: "test-secret",
      PRISMA_ACCELERATE_ENABLED: "true"
    });

    expect(result.DIRECT_URL).toBe("postgresql://user:password@db.example.test:5432/karigo");
    expect(result.PRISMA_ACCELERATE_ENABLED).toBe(true);
  });

  it("rejects explicit Prisma Accelerate with a direct DATABASE_URL", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: "postgresql://user:password@db.example.test:5432/karigo",
      DIRECT_URL: "postgresql://user:password@db.example.test:5432/karigo",
      JWT_SECRET: "test-secret",
      PRISMA_ACCELERATE_ENABLED: "true"
    })).toThrow("PRISMA_ACCELERATE_ENABLED=true requires DATABASE_URL to use Prisma Accelerate");
  });

  it("rejects explicit Prisma Accelerate without DIRECT_URL", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: "prisma://accelerate.prisma-data.net/?api_key=placeholder",
      JWT_SECRET: "test-secret",
      PRISMA_ACCELERATE_ENABLED: "true"
    })).toThrow("Prisma Accelerate requires DIRECT_URL for Prisma migrations");
  });

  it("rejects DIRECT_URL when it is not a direct PostgreSQL URL", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: "prisma://accelerate.prisma-data.net/?api_key=placeholder",
      JWT_SECRET: "test-secret"
    })).toThrow("DIRECT_URL must be a direct PostgreSQL URL");

    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      DIRECT_URL: "mysql://user:password@db.example.test:3306/karigo",
      JWT_SECRET: "test-secret"
    })).toThrow("DIRECT_URL must be a PostgreSQL connection string");
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
    const result = validateEnvironment(flutterwaveLiveConfig({
      PAYMENTS_LIVE_ENABLED: "false",
      PAYMENT_PROVIDER: "mock"
    }));

    expect(result.PAYMENTS_LIVE_ENABLED).toBe(false);
    expect(result.PAYMENT_PROVIDER).toBe("mock");
    expect(result.PAYMENTS_PROVIDER).toBe("mock");
  });

  it("rejects live payments unless Flutterwave is the selected provider", () => {
    expect(() => validateEnvironment({
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      PAYMENTS_LIVE_ENABLED: "true",
      PAYMENT_PROVIDER: "paystack"
    })).toThrow("Live payments require PAYMENT_PROVIDER=flutterwave");
  });

  it("rejects live Flutterwave payments unless Flutterwave environment is live", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_ENVIRONMENT: "test"
    }))).toThrow("Live Flutterwave payments require FLUTTERWAVE_ENVIRONMENT=live");
  });

  it("rejects live Flutterwave payments without an explicit API mode", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_API_MODE: ""
    }))).toThrow("Live Flutterwave payments require FLUTTERWAVE_API_MODE=v3 or v4");
  });

  it("rejects unsupported live Flutterwave API mode", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_API_MODE: "v2"
    }))).toThrow("FLUTTERWAVE_API_MODE must be v3 or v4");
  });

  it("rejects live Flutterwave v3 payments without the v3 secret key", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_SECRET_KEY: ""
    }))).toThrow("Live Flutterwave v3 checkout requires FLUTTERWAVE_SECRET_KEY");
  });

  it("rejects live Flutterwave v4 payments without v4 client credentials", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_API_MODE: "v4",
      FLUTTERWAVE_BASE_URL: "https://f4bexperience.flutterwave.com",
      FLUTTERWAVE_CLIENT_ID: ""
    }))).toThrow("Live Flutterwave v4 checkout requires FLUTTERWAVE_CLIENT_ID");
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_API_MODE: "v4",
      FLUTTERWAVE_BASE_URL: "https://f4bexperience.flutterwave.com",
      FLUTTERWAVE_CLIENT_ID: "flutterwave-client-id-placeholder",
      FLUTTERWAVE_CLIENT_SECRET: ""
    }))).toThrow("Live Flutterwave v4 checkout requires FLUTTERWAVE_CLIENT_SECRET");
  });

  it("rejects live Flutterwave payments without a webhook secret", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_SECRET_HASH: "",
      FLUTTERWAVE_WEBHOOK_SECRET: ""
    }))).toThrow("Live Flutterwave payments require FLUTTERWAVE_SECRET_HASH or FLUTTERWAVE_WEBHOOK_SECRET");
  });

  it("rejects live Flutterwave payments when the base URL is not HTTPS", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_BASE_URL: "http://api.flutterwave.com/v3"
    }))).toThrow("Live Flutterwave payments require HTTPS FLUTTERWAVE_BASE_URL");
  });

  it("rejects live Flutterwave payments when the token URL is not HTTPS", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_API_MODE: "v4",
      FLUTTERWAVE_BASE_URL: "https://f4bexperience.flutterwave.com",
      FLUTTERWAVE_CLIENT_ID: "flutterwave-client-id-placeholder",
      FLUTTERWAVE_CLIENT_SECRET: "flutterwave-client-secret-placeholder",
      FLUTTERWAVE_TOKEN_URL: "http://idp.flutterwave.com/token"
    }))).toThrow("Live Flutterwave v4 checkout requires HTTPS FLUTTERWAVE_TOKEN_URL");
  });

  it("rejects live Flutterwave v4 payments when the checkout path is the v3 payments endpoint", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_API_MODE: "v4",
      FLUTTERWAVE_BASE_URL: "https://f4bexperience.flutterwave.com",
      FLUTTERWAVE_CLIENT_ID: "flutterwave-client-id-placeholder",
      FLUTTERWAVE_CLIENT_SECRET: "flutterwave-client-secret-placeholder",
      FLUTTERWAVE_V4_CHECKOUT_PATH: "/payments"
    }))).toThrow("Live Flutterwave v4 checkout cannot use FLUTTERWAVE_V4_CHECKOUT_PATH=/payments");
  });

  it("rejects live Flutterwave payments when the redirect URL is not HTTPS", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_REDIRECT_URL: "http://api.karigo.com.ng/api/v1/payments/callback/flutterwave"
    }))).toThrow("Live Flutterwave payments require HTTPS FLUTTERWAVE_REDIRECT_URL or FLUTTERWAVE_CALLBACK_URL");
  });

  it("rejects live Flutterwave payments unless customer checkout is enabled", () => {
    expect(() => validateEnvironment(flutterwaveLiveConfig({
      FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED: "false"
    }))).toThrow("Live Flutterwave payments require FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED=true");
  });

  it("allows approved live Flutterwave payment configuration", () => {
    const result = validateEnvironment(flutterwaveLiveConfig({
      PAYMENTS_PROVIDER: "flutterwave",
      PAYMENT_PROVIDER: undefined
    }));

    expect(result.PAYMENTS_LIVE_ENABLED).toBe(true);
    expect(result.PAYMENT_PROVIDER).toBe("flutterwave");
    expect(result.PAYMENTS_PROVIDER).toBe("flutterwave");
    expect(result.FLUTTERWAVE_API_MODE).toBe("v3");
    expect(result.FLUTTERWAVE_BASE_URL).toBe("https://api.flutterwave.com/v3");
    expect(result.FLUTTERWAVE_CHECKOUT_PATH).toBe("/payments");
    expect(result.FLUTTERWAVE_V4_CHECKOUT_PATH).toBe("/orders");
    expect(result.FLUTTERWAVE_TOKEN_URL).toBe("https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token");
    expect(result.FLUTTERWAVE_CUSTOMER_CHECKOUT_ENABLED).toBe(true);
  });

  it("allows Accelerate utility readiness flags without enabling customer purchases", () => {
    const result = validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "false",
      UTILITIES_TEST_MODE: "true",
      UTILITIES_CUSTOMER_PURCHASE_ENABLED: "false",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_BASE_URL: "https://api.accelerate.example",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder"
    });

    expect(result.UTILITIES_PROVIDER).toBe("accelerate");
    expect(result.UTILITIES_ENABLED).toBe(false);
    expect(result.UTILITIES_TEST_MODE).toBe(true);
    expect(result.UTILITIES_CUSTOMER_PURCHASE_ENABLED).toBe(false);
    expect(result.ACCELERATE_ENABLED).toBe(true);
    expect(result.ACCELERATE_BASE_URL).toBe("https://api.accelerate.example");
    expect(result.ACCELERATE_API_KEY).toBe("accelerate-public-key-placeholder");
    expect(result.ACCELERATE_API_PUBLIC_KEY).toBe("accelerate-public-key-placeholder");
    expect(result.ACCELERATE_API_PRIVATE_KEY).toBe("accelerate-private-key-placeholder");
  });

  it("allows provider-backed utility purchases only with guarded Accelerate test-mode configuration", () => {
    const result = validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "true",
      UTILITIES_TEST_MODE: "true",
      UTILITIES_CUSTOMER_PURCHASE_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder",
      ACCELERATE_ENV: "sandbox"
    });

    expect(result.UTILITIES_PROVIDER).toBe("accelerate");
    expect(result.UTILITIES_ENABLED).toBe(true);
    expect(result.UTILITIES_CUSTOMER_PURCHASE_ENABLED).toBe(true);
    expect(result.ACCELERATE_ENV).toBe("sandbox");
  });

  it("rejects customer utility purchases without complete Accelerate configuration", () => {
    expect(() => validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "false",
      UTILITIES_CUSTOMER_PURCHASE_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_BASE_URL: "https://api.accelerate.example",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder"
    })).toThrow("UTILITIES_CUSTOMER_PURCHASE_ENABLED=true requires UTILITIES_ENABLED=true");

    expect(() => validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "true",
      UTILITIES_CUSTOMER_PURCHASE_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder"
    })).toThrow("UTILITIES_CUSTOMER_PURCHASE_ENABLED=true requires ACCELERATE_API_PUBLIC_KEY");

    expect(() => validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "true",
      UTILITIES_CUSTOMER_PURCHASE_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder"
    })).toThrow("UTILITIES_CUSTOMER_PURCHASE_ENABLED=true requires ACCELERATE_API_PRIVATE_KEY");

    expect(() => validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "true",
      UTILITIES_TEST_MODE: "false",
      UTILITIES_CUSTOMER_PURCHASE_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder"
    })).toThrow("UTILITIES_TEST_MODE=false requires UTILITIES_WALLET_PAYMENT_ENABLED=true");
  });

  it("allows live Accelerate utility purchases only with wallet-funded fulfilment gates", () => {
    const result = validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "true",
      UTILITIES_TEST_MODE: "false",
      UTILITIES_CUSTOMER_PURCHASES_ENABLED: "true",
      UTILITIES_WALLET_PAYMENT_ENABLED: "true",
      UTILITIES_LIVE_FULFILLMENT_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder",
      ACCELERATE_ENV: "live"
    });

    expect(result.UTILITIES_CUSTOMER_PURCHASE_ENABLED).toBe(true);
    expect(result.UTILITIES_CUSTOMER_PURCHASES_ENABLED).toBe(true);
    expect(result.UTILITIES_WALLET_PAYMENT_ENABLED).toBe(true);
    expect(result.UTILITIES_LIVE_FULFILLMENT_ENABLED).toBe(true);
    expect(result.UTILITIES_TEST_MODE).toBe(false);
    expect(result.ACCELERATE_ENV).toBe("live");
  });

  it("rejects utility wallet/live fulfilment flags unless customer purchases are enabled", () => {
    expect(() => validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "true",
      UTILITIES_WALLET_PAYMENT_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder"
    })).toThrow("UTILITIES_WALLET_PAYMENT_ENABLED=true requires UTILITIES_CUSTOMER_PURCHASE_ENABLED=true");

    expect(() => validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      UTILITIES_ENABLED: "true",
      UTILITIES_CUSTOMER_PURCHASE_ENABLED: "true",
      UTILITIES_LIVE_FULFILLMENT_ENABLED: "true",
      ACCELERATE_ENABLED: "true",
      ACCELERATE_API_PUBLIC_KEY: "accelerate-public-key-placeholder",
      ACCELERATE_API_PRIVATE_KEY: "accelerate-private-key-placeholder"
    })).toThrow("UTILITIES_LIVE_FULFILLMENT_ENABLED=true requires wallet-funded utility purchases to be enabled");
  });

  it("rejects non-HTTPS Accelerate provider base URLs", () => {
    expect(() => validateEnvironment({
      ...baseConfig(),
      UTILITIES_PROVIDER: "accelerate",
      ACCELERATE_BASE_URL: "http://accelerate.example"
    })).toThrow("ACCELERATE_BASE_URL must use HTTPS");
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

  it("allows approved Customer App wallet return deep links", () => {
    const result = validateEnvironment({
      ...baseConfig(),
      CUSTOMER_APP_DEEP_LINK_BASE: "karigo://",
      CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL: "karigo-customer:///profile/wallet",
      CUSTOMER_WEB_PAYMENT_FALLBACK_URL: "https://www.karigo.com.ng/payment/flutterwave/return"
    });

    expect(result.CUSTOMER_APP_DEEP_LINK_BASE).toBe("karigo://");
    expect(result.CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL).toBe("karigo-customer:///profile/wallet");
    expect(result.CUSTOMER_WEB_PAYMENT_FALLBACK_URL).toBe("https://www.karigo.com.ng/payment/flutterwave/return");
  });

  it("rejects unsafe Customer App wallet return URLs", () => {
    expect(() => validateEnvironment({
      ...baseConfig(),
      CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL: "javascript:alert(1)"
    })).toThrow("CUSTOMER_APP_WALLET_TOP_UP_RETURN_URL must use HTTPS or an approved KariGO app deep link");
    expect(() => validateEnvironment({
      ...baseConfig(),
      CUSTOMER_WEB_PAYMENT_FALLBACK_URL: "http://www.karigo.com.ng/payment/flutterwave/return"
    })).toThrow("CUSTOMER_WEB_PAYMENT_FALLBACK_URL must use HTTPS");
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
