const test = require("node:test"),
  assert = require("node:assert/strict");
const { assertPaymentSandbox } = require("./payment-sandbox-guard.cjs");
function config() {
  return {
    APP_ENV: "staging",
    PAYMENT_SANDBOX_ISOLATED: "true",
    DATABASE_URL: "postgresql://test@127.0.0.1:55443/karigo_pay02_sandbox",
    DIRECT_URL: "postgresql://test@127.0.0.1:55443/karigo_pay02_sandbox",
    PAYMENTS_LIVE_ENABLED: "false",
    SQUAD_MODE: "sandbox",
    SQUAD_BASE_URL: "https://sandbox-api-d.squadco.com",
    JWT_SECRET: "x".repeat(40),
    PAYMENT_SANDBOX_OPERATOR_SECRET: "x".repeat(40),
    OTP_PROVIDER: "mock",
    SMS_PROVIDER: "mock",
    EMAIL_PROVIDER: "mock",
    WHATSAPP_PROVIDER: "mock",
    PUSH_PROVIDER: "mock",
    NOTIFICATION_PROVIDER: "mock",
    UTILITIES_ENABLED: "false",
    RIDES_SERVICE_ENABLED: "false",
    RIDES_PRODUCTION_ENABLED: "false",
    PARTNER_ONBOARDING_PAYMENT_ENABLED: "false",
    WALLET_TOP_UP_ENABLED: "false",
    WALLET_PAYMENTS_ENABLED: "false",
    ORDER_PAYMENT_CHECKOUT_HOSTS: "sandbox-pay.squadco.com",
  };
}
test("isolated synthetic environment accepted without provider credentials", () =>
  assert.equal(assertPaymentSandbox(config()), true));
for (const [key, value] of Object.entries({
  APP_ENV: "production",
  PAYMENTS_LIVE_ENABLED: "true",
  SQUAD_MODE: "live",
  SQUAD_SECRET_KEY: "live-not-a-real-key",
  SQUAD_BASE_URL: "https://api-d.squadco.com",
  DATABASE_URL: "postgresql://test@127.0.0.1:55443/karigo",
  FLUTTERWAVE_SECRET_KEY: "not-a-real-key",
  WALLET_TOP_UP_ENABLED: "true",
  PUSH_PROVIDER: "expo",
  ORDER_PAYMENT_CHECKOUT_HOSTS: "pay.squadco.com",
}))
  test("rejects unsafe " + key, () =>
    assert.throws(() => assertPaymentSandbox({ ...config(), [key]: value })),
  );
