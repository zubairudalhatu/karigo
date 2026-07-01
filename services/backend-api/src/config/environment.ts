const DEFAULT_JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7;
const JWT_DURATION_PATTERN = /^(\d+)([smhd])$/i;

function requireValue(config: Record<string, unknown>, key: string): string {
  const value = config[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function positiveInteger(value: unknown, key: string, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsed;
}

export function normalizeApiPrefix(prefix: string): string {
  const normalized = prefix.trim().replace(/^\/+|\/+$/g, "");
  return normalized || "api/v1";
}

function jwtExpirySeconds(value: unknown): number {
  if (value === undefined || value === "") {
    return DEFAULT_JWT_EXPIRY_SECONDS;
  }

  if (typeof value === "number") {
    return positiveInteger(value, "JWT_EXPIRES_IN", DEFAULT_JWT_EXPIRY_SECONDS);
  }

  if (typeof value !== "string") {
    throw new Error("JWT_EXPIRES_IN must be a positive number or duration such as 7d");
  }

  const match = JWT_DURATION_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error("JWT_EXPIRES_IN must use s, m, h or d, for example 7d");
  }

  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 60 * 60, d: 60 * 60 * 24 };
  return amount * multipliers[match[2].toLowerCase() as keyof typeof multipliers];
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const appEnvironment = typeof config.APP_ENV === "string" ? config.APP_ENV : "development";
  const otpProvider =
    typeof config.OTP_PROVIDER === "string"
      ? config.OTP_PROVIDER.toLowerCase()
      : typeof config.SMS_PROVIDER === "string"
        ? config.SMS_PROVIDER.toLowerCase()
        : "mock";
  if (!["mock", "termii", "africas_talking"].includes(otpProvider)) {
    throw new Error("OTP_PROVIDER must be mock, termii or africas_talking");
  }
  if (otpProvider === "termii") {
    requireValue(config, "TERMII_API_KEY");
    requireValue(config, "TERMII_SENDER_ID");
    const termiiBaseUrl = typeof config.TERMII_BASE_URL === "string" && config.TERMII_BASE_URL.trim()
      ? config.TERMII_BASE_URL.trim()
      : "https://api.ng.termii.com";
    if (!termiiBaseUrl.startsWith("https://")) throw new Error("TERMII_BASE_URL must use HTTPS");
    if (appEnvironment === "production") {
      throw new Error("Termii is restricted to sandbox preparation until production SMS approval");
    }
  }
  const paymentProvider =
    typeof config.PAYMENT_PROVIDER === "string" ? config.PAYMENT_PROVIDER.toLowerCase() : "mock";
  if (!["mock", "paystack", "flutterwave", "monnify", "squad"].includes(paymentProvider)) {
    throw new Error("PAYMENT_PROVIDER must be mock, paystack, flutterwave, monnify or squad");
  }
  if (paymentProvider === "paystack") {
    const secret = requireValue(config, "PAYSTACK_SECRET_KEY");
    if (!secret.startsWith("sk_test_")) {
      throw new Error("PAYSTACK_SECRET_KEY must be a Paystack test key while sandbox integration is enabled");
    }
    const baseUrl = typeof config.PAYSTACK_BASE_URL === "string" && config.PAYSTACK_BASE_URL.trim()
      ? config.PAYSTACK_BASE_URL.trim()
      : "https://api.paystack.co";
    if (!baseUrl.startsWith("https://")) throw new Error("PAYSTACK_BASE_URL must use HTTPS");
  }
  const notificationProvider =
    typeof config.NOTIFICATION_PROVIDER === "string" ? config.NOTIFICATION_PROVIDER.toLowerCase() : "mock";
  if (notificationProvider !== "mock") throw new Error("NOTIFICATION_PROVIDER must be mock");
  const emailProvider =
    typeof config.EMAIL_PROVIDER === "string" ? config.EMAIL_PROVIDER.toLowerCase() : "mock";
  if (!["mock", "smtp", "sendgrid", "mailgun", "ses"].includes(emailProvider)) {
    throw new Error("EMAIL_PROVIDER must be mock, smtp, sendgrid, mailgun or ses");
  }
  if (emailProvider !== "mock") {
    throw new Error("EMAIL_PROVIDER must remain mock until email sandbox testing is approved");
  }
  const whatsappProvider =
    typeof config.WHATSAPP_PROVIDER === "string" ? config.WHATSAPP_PROVIDER.toLowerCase() : "mock";
  if (!["mock", "meta_cloud"].includes(whatsappProvider)) {
    throw new Error("WHATSAPP_PROVIDER must be mock or meta_cloud");
  }
  if (whatsappProvider !== "mock") {
    throw new Error("WHATSAPP_PROVIDER must remain mock until WhatsApp sandbox testing is approved");
  }
  const pushProvider =
    typeof config.PUSH_PROVIDER === "string" ? config.PUSH_PROVIDER.toLowerCase() : "mock";
  if (!["mock", "expo", "firebase"].includes(pushProvider)) {
    throw new Error("PUSH_PROVIDER must be mock, expo or firebase");
  }
  if (pushProvider !== "mock") {
    throw new Error("PUSH_PROVIDER must remain mock until push sandbox testing is approved");
  }

  return {
    ...config,
    APP_NAME: typeof config.APP_NAME === "string" ? config.APP_NAME : "KariGO",
    APP_ENV: appEnvironment,
    APP_PORT: positiveInteger(config.APP_PORT ?? config.PORT, "APP_PORT", 4000),
    API_PREFIX: `/${normalizeApiPrefix(typeof config.API_PREFIX === "string" ? config.API_PREFIX : "/api/v1")}`,
    DATABASE_URL: requireValue(config, "DATABASE_URL"),
    JWT_SECRET: requireValue(config, "JWT_SECRET"),
    JWT_EXPIRES_IN_SECONDS: jwtExpirySeconds(config.JWT_EXPIRES_IN),
    OTP_EXPIRY_MINUTES: positiveInteger(config.OTP_EXPIRY_MINUTES, "OTP_EXPIRY_MINUTES", 10),
    OTP_LENGTH: positiveInteger(config.OTP_LENGTH, "OTP_LENGTH", 6),
    OTP_MAX_ATTEMPTS: positiveInteger(config.OTP_MAX_ATTEMPTS, "OTP_MAX_ATTEMPTS", 5),
    OTP_RESEND_COOLDOWN_SECONDS: positiveInteger(
      config.OTP_RESEND_COOLDOWN_SECONDS,
      "OTP_RESEND_COOLDOWN_SECONDS",
      60
    ),
    OTP_PROVIDER: otpProvider,
    SMS_PROVIDER: typeof config.SMS_PROVIDER === "string" ? config.SMS_PROVIDER.toLowerCase() : otpProvider,
    TERMII_BASE_URL: typeof config.TERMII_BASE_URL === "string" && config.TERMII_BASE_URL.trim()
      ? config.TERMII_BASE_URL.trim()
      : "https://api.ng.termii.com",
    STANDARD_DELIVERY_FEE: positiveInteger(config.STANDARD_DELIVERY_FEE, "STANDARD_DELIVERY_FEE", 1000),
    PARCEL_DELIVERY_FEE: positiveInteger(config.PARCEL_DELIVERY_FEE, "PARCEL_DELIVERY_FEE", 1500),
    PAYMENT_PROVIDER: paymentProvider,
    PAYSTACK_BASE_URL: typeof config.PAYSTACK_BASE_URL === "string" && config.PAYSTACK_BASE_URL.trim()
      ? config.PAYSTACK_BASE_URL.trim()
      : "https://api.paystack.co",
    NOTIFICATION_PROVIDER: notificationProvider,
    EMAIL_PROVIDER: emailProvider,
    EMAIL_FROM: typeof config.EMAIL_FROM === "string" && config.EMAIL_FROM.trim()
      ? config.EMAIL_FROM.trim()
      : "no-reply@karigo.com.ng",
    EMAIL_REPLY_TO: typeof config.EMAIL_REPLY_TO === "string" && config.EMAIL_REPLY_TO.trim()
      ? config.EMAIL_REPLY_TO.trim()
      : "support@karigo.com.ng",
    WHATSAPP_PROVIDER: whatsappProvider,
    WHATSAPP_BASE_URL: typeof config.WHATSAPP_BASE_URL === "string" && config.WHATSAPP_BASE_URL.trim()
      ? config.WHATSAPP_BASE_URL.trim()
      : "https://graph.facebook.com",
    WHATSAPP_API_VERSION: typeof config.WHATSAPP_API_VERSION === "string" && config.WHATSAPP_API_VERSION.trim()
      ? config.WHATSAPP_API_VERSION.trim()
      : "v20.0",
    PUSH_PROVIDER: pushProvider
  };
}
