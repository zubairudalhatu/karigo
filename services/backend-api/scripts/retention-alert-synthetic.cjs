// Explicit owner approval required. This script cannot send a second synthetic notification.
require('reflect-metadata');
const { PrismaClient } = require('@prisma/client');
const { DatabaseAlertStore } = require('../dist/services/backend-api/src/modules/retention-alerts/alert-store');
const { RetentionAlertEngine } = require('../dist/services/backend-api/src/modules/retention-alerts/retention-alerts.service');
async function main() {
  if (process.argv[2] !== '--approved-single-synthetic' || process.env.RETENTION_ALERT_EMAIL_MODE !== 'synthetic-only') throw new Error('GATE_CLOSED');
  const db = new PrismaClient();
  try {
    const engine = new RetentionAlertEngine(new DatabaseAlertStore(db, new Date()), () => process.env.RESEND_API_KEY, fetch, () => 'synthetic-only');
    if (!process.env.RESEND_API_KEY) throw new Error('SENDER_NOT_CONFIGURED');
    const incidentId = await engine.synthetic();
    await engine.dispatch();
    console.log(JSON.stringify({ incidentId, submittedOnce: true }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('SYNTHETIC_CHECK_REQUIRED_NO_AUTOMATIC_RESEND'); process.exitCode=1; });
