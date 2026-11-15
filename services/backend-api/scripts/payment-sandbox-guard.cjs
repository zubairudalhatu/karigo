const assert = require("node:assert/strict");
function assertPaymentSandbox(env) {
  assert.equal(env.APP_ENV, "staging");
  assert.equal(env.PAYMENT_SANDBOX_ISOLATED, "true");
  const allowedSecrets = new Set([
    "SQUAD_SECRET_KEY",
    "JWT_SECRET",
    "PAYMENT_SANDBOX_OPERATOR_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
  ]);
  for (const [key, value] of Object.entries(env))
    if (
      value &&
      /(?:SECRET|API_KEY|ACCESS_KEY|ACCESS_TOKEN|PRIVATE_KEY|CREDENTIALS?|PASSWORD|DATABASE_URL|DIRECT_URL|CONNECTION_STRING|SERVICE_ACCOUNT_JSON|SERVICE_ACCOUNT_BASE64)$/.test(
        key,
      ) &&
      !allowedSecrets.has(key)
    )
      throw Error("PAYMENT_SANDBOX_UNEXPECTED_CREDENTIAL");
  const url = new URL(env.DATABASE_URL);
  assert.equal(env.DIRECT_URL, env.DATABASE_URL);
  assert.equal(
    true,
    /^\/karigo_pay02_sandbox(?:_[a-z0-9]+)?$/.test(url.pathname),
  );
  assert.ok(
    ["127.0.0.1", "localhost"].includes(url.hostname) ||
      (url.hostname.startsWith("dpg-") && !url.hostname.includes(".")),
  );
  assert.equal(env.PAYMENTS_LIVE_ENABLED, "false");
  assert.equal(env.SQUAD_MODE, "sandbox");
  assert.equal(env.SQUAD_BASE_URL, "https://sandbox-api-d.squadco.com");
  for (const name of Object.keys(env))
    if (
      /^(FLUTTERWAVE|PAYSTACK|MONNIFY|ACCELERATE)_.*(KEY|SECRET|TOKEN|CLIENT)/.test(
        name,
      ) &&
      env[name]
    )
      throw Error("UNRELATED_PROVIDER_CREDENTIAL_FORBIDDEN");
  if (env.SQUAD_SECRET_KEY)
    assert.ok(env.SQUAD_SECRET_KEY.startsWith("sandbox_sk_"));
  for (const key of ["JWT_SECRET", "PAYMENT_SANDBOX_OPERATOR_SECRET"])
    assert.ok(env[key]?.length >= 32);
  for (const key of [
    "OTP_PROVIDER",
    "SMS_PROVIDER",
    "EMAIL_PROVIDER",
    "WHATSAPP_PROVIDER",
    "PUSH_PROVIDER",
    "NOTIFICATION_PROVIDER",
  ])
    assert.equal(env[key], "mock");
  for (const key of [
    "UTILITIES_ENABLED",
    "RIDES_SERVICE_ENABLED",
    "RIDES_PRODUCTION_ENABLED",
    "PARTNER_ONBOARDING_PAYMENT_ENABLED",
  ])
    assert.equal(env[key], "false");
  assert.equal(env.ORDER_PAYMENT_CHECKOUT_HOSTS, "sandbox-pay.squadco.com");
  assert.equal(env.WALLET_TOP_UP_ENABLED, "false");
  assert.equal(env.WALLET_PAYMENTS_ENABLED, "false");
  return true;
}
function installHttpBoundary(env) {
  const permitted = new Set(
    [
      "sandbox-api-d.squadco.com",
      "127.0.0.1",
      "localhost",
      env.RENDER_EXTERNAL_HOSTNAME,
    ].filter(Boolean),
  );
  const original = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    if (
      !permitted.has(url.hostname) ||
      url.username ||
      url.password ||
      (!["localhost", "127.0.0.1"].includes(url.hostname) &&
        url.protocol !== "https:")
    )
      return Promise.reject(Error("PAYMENT_SANDBOX_EXTERNAL_HTTP_BLOCKED"));
    return original(input, { ...init, redirect: "error" });
  };
  for (const protocol of ["http", "https"]) {
    const mod = require("node:" + protocol),
      request = mod.request;
    mod.request = function (url, ...args) {
      const host =
        typeof url === "object" && !(url instanceof URL)
          ? (url.hostname || url.host || "localhost").split(":")[0]
          : new URL(url).hostname;
      if (!permitted.has(host))
        throw Error("PAYMENT_SANDBOX_EXTERNAL_HTTP_BLOCKED");
      return request.call(this, url, ...args);
    };
    mod.get = function (...args) {
      const req = mod.request(...args);
      req.end();
      return req;
    };
  }
}
module.exports = { assertPaymentSandbox, installHttpBoundary };
