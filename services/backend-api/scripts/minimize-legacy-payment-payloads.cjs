/* Safe inventory and explicitly gated minimization for legacy provider JSON. */
const { PrismaClient } = require("@prisma/client");

const ALLOWED_KEYS = ["schemaVersion", "provider", "transactionReference", "providerTransactionReference", "paymentMethodCategory", "successful", "verified", "amountMinor", "currency", "eventType"];
const SENSITIVE_FIELD_PATTERNS = {
  cardOrAccountNumber: /(^|_)(card|account|acct|pan|number)(_|$)|card_number|account_number/i,
  authorization: /authori[sz]ation|auth_model|authorization_code/i,
  customerOrProviderProfile: /customer|profile|beneficiary|recipient/i,
  bankDetails: /bank|routing|sort_code|swift|iban/i,
  nestedMetadata: /metadata|meta|device_fingerprint|ip_address/i
};

function record(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : null; }
function text(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
}
function fieldNames(value, into = new Set(), depth = 0) {
  if (depth > 12 || value === null || typeof value !== "object") return into;
  if (Array.isArray(value)) { for (const item of value) fieldNames(item, into, depth + 1); return into; }
  for (const [key, child] of Object.entries(value)) { into.add(key); fieldNames(child, into, depth + 1); }
  return into;
}
function structuralCategories(value) {
  const names = [...fieldNames(value)].sort();
  const categories = Object.entries(SENSITIVE_FIELD_PATTERNS).filter(([, pattern]) => names.some((name) => pattern.test(name))).map(([name]) => name);
  return { fieldNames: names, categories };
}
function isCompliant(value) {
  const row = record(value);
  return !!row && row.schemaVersion === 1 && Object.keys(row).every((key) => ALLOWED_KEYS.includes(key));
}
function minimize(provider, payload, fallbackReference = null) {
  const response = record(payload);
  if (!response) return null;
  const data = record(response.data) || {};
  return {
    schemaVersion: 1,
    provider,
    transactionReference: text(data.tx_ref) || text(response.tx_ref) || text(fallbackReference),
    providerTransactionReference: text(data.flw_ref) || text(data.id) || text(response.flw_ref) || text(response.id),
    paymentMethodCategory: text(data.payment_type) || text(data.payment_method) || text(response.payment_type),
    successful: typeof data.status === "string" ? data.status.toLowerCase() === "successful" : null,
    verified: null,
    amountMinor: null,
    currency: text(data.currency) || text(response.currency),
    eventType: text(response.event)
  };
}
function classify(payload) {
  if (!record(payload)) return { state: "unableToClassify", ...structuralCategories(payload) };
  if (isCompliant(payload)) return { state: "compliant", ...structuralCategories(payload) };
  return { state: "needsMinimization", ...structuralCategories(payload) };
}
function planRows(groups) {
  const summary = { inspected: 0, compliant: 0, needsMinimization: 0, unableToClassify: 0, failures: 0, structuralCategories: {}, fieldNames: new Set() };
  const updates = [];
  for (const group of groups) for (const row of group.rows) {
    summary.inspected += 1;
    try {
      const result = classify(row[group.field]);
      summary[result.state] += 1;
      for (const category of result.categories) summary.structuralCategories[category] = (summary.structuralCategories[category] || 0) + 1;
      for (const name of result.fieldNames) summary.fieldNames.add(name);
      if (result.state === "needsMinimization") updates.push({ group, row, value: minimize("flutterwave", row[group.field], row.transactionReference) });
    } catch { summary.failures += 1; }
  }
  return { summary: { ...summary, fieldNames: [...summary.fieldNames].sort() }, updates };
}
async function run() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  if (apply === dryRun) throw new Error("Choose exactly one of --dry-run or --apply.");
  if (apply && process.env.CONFIRM_PAYMENT_PAYLOAD_MINIMIZATION !== "TASK209B-CONTROLLED-WINDOW") throw new Error("Apply mode requires the controlled change-window confirmation token.");
  const prisma = new PrismaClient();
  try {
    const groups = [
      { model: "payment", field: "gatewayResponse", rows: await prisma.payment.findMany({ where: { gateway: "flutterwave" }, select: { id: true, transactionReference: true, gatewayResponse: true } }) },
      { model: "paymentWebhookLog", field: "payload", rows: await prisma.paymentWebhookLog.findMany({ where: { gateway: "flutterwave" }, select: { id: true, transactionReference: true, payload: true } }) },
      { model: "partnerOnboardingPayment", field: "providerResponse", rows: await prisma.partnerOnboardingPayment.findMany({ where: { provider: "flutterwave" }, select: { id: true, transactionReference: true, providerResponse: true } }) }
    ];
    const plan = planRows(groups);
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...plan.summary }));
    if (!apply) return;
    const operations = plan.updates.map(({ group, row, value }) => prisma[group.model].update({ where: { id: row.id }, data: { [group.field]: value } }));
    if (operations.length) await prisma.$transaction(operations);
    console.log(JSON.stringify({ mode: "apply", updated: operations.length }));
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { ALLOWED_KEYS, classify, fieldNames, isCompliant, minimize, planRows, structuralCategories };
