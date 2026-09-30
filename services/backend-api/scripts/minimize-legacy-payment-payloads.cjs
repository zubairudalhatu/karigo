/*
 * Dry-run inventory / explicitly gated backfill for legacy provider JSON.
 * Never prints stored payloads. Production execution is intentionally outside Task 2P.
 */
const { PrismaClient } = require("@prisma/client");

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
}

function minimize(provider, payload, fallbackReference = null) {
  const response = record(payload);
  const data = record(response.data);
  return {
    schemaVersion: 1,
    provider,
    transactionReference: text(data.tx_ref) || text(response.tx_ref) || text(fallbackReference),
    providerTransactionReference: text(data.flw_ref) || text(data.id) || text(response.flw_ref) || text(response.id),
    paymentMethodCategory: text(data.payment_type) || text(data.payment_method) || text(response.payment_type),
    successful: null,
    verified: null,
    amountMinor: null,
    currency: text(data.currency) || text(response.currency),
    eventType: text(response.event)
  };
}

async function run() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (!apply && !dryRun) throw new Error("Choose --dry-run or --apply.");
  if (apply && process.env.CONFIRM_PAYMENT_PAYLOAD_MINIMIZATION !== "TASK209B-2P-APPROVED") {
    throw new Error("Apply mode requires the separate production change-window confirmation token.");
  }
  const prisma = new PrismaClient();
  try {
    const [payments, webhooks, onboarding] = await Promise.all([
      prisma.payment.findMany({ where: { gateway: "flutterwave" }, select: { id: true, transactionReference: true, gatewayResponse: true } }),
      prisma.paymentWebhookLog.findMany({ where: { gateway: "flutterwave" }, select: { id: true, transactionReference: true, payload: true } }),
      prisma.partnerOnboardingPayment.findMany({ where: { provider: "flutterwave" }, select: { id: true, transactionReference: true, providerResponse: true } })
    ]);
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", counts: { payments: payments.length, webhooks: webhooks.length, partnerOnboardingPayments: onboarding.length } }));
    if (!apply) return;
    await prisma.$transaction([
      ...payments.map((row) => prisma.payment.update({ where: { id: row.id }, data: { gatewayResponse: minimize("flutterwave", row.gatewayResponse, row.transactionReference) } })),
      ...webhooks.map((row) => prisma.paymentWebhookLog.update({ where: { id: row.id }, data: { payload: minimize("flutterwave", row.payload, row.transactionReference) } })),
      ...onboarding.map((row) => prisma.partnerOnboardingPayment.update({ where: { id: row.id }, data: { providerResponse: minimize("flutterwave", row.providerResponse, row.transactionReference) } }))
    ]);
    console.log(JSON.stringify({ mode: "apply", updated: payments.length + webhooks.length + onboarding.length }));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { minimize };
