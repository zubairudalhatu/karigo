// Read-only preparation: never creates or activates catalogue records.
require('reflect-metadata');
const { PrismaClient } = require('@prisma/client');
const { ConfigService } = require('@nestjs/config');
const { PaybetaUtilityProvider } = require('../dist/services/backend-api/src/modules/utilities/providers/paybeta-utility.provider');
const db = new PrismaClient();
async function main() {
  if (process.argv.includes('--apply')) throw new Error('READ_ONLY_PREPARATION_ONLY');
  const adapter = new PaybetaUtilityProvider(new ConfigService(process.env));
  if (!adapter.isConfigured('production')) throw new Error('PRODUCTION_CONFIGURATION_REQUIRED');
  const supported = await adapter.listProviders('CABLE_TV');
  const existing = await db.utilityProvider.findMany({ where: { type: 'CABLE_TV' }, include: { products: true } });
  const plan = [];
  for (const code of ['dstv', 'gotv', 'startimes']) {
    const provider = supported.find(item => item.code === code && item.active);
    if (!provider) throw new Error('LIVE_PROVIDER_MISSING');
    const products = await adapter.listProducts('CABLE_TV', code);
    if (!products.length) throw new Error('LIVE_PRODUCTS_MISSING');
    const row = existing.find(item => item.code === code);
    plan.push({ provider: { code, name: provider.name, existingId: row?.id, proposedActive: false },
      products: products.map(product => ({ code: `PAYBETA_CABLE_${code}_${product.code}`, providerProductCode: product.code,
        name: product.name, amountKobo: product.amountKobo, proposedActive: false })),
      metadata: { integration: 'PAYBETA', catalogueMode: 'LIVE', demoOnly: false, providerEnvironment: 'PRODUCTION' } });
  }
  console.log(JSON.stringify({ mode: 'DRY_RUN', existingRows: existing.length, historicalRowsUntouched: true, plan, writes: 0, readinessChanged: false }));
}
main().catch(error => { console.error(JSON.stringify({ safeError: /^[A-Z_]+$/.test(error.message) ? error.message : 'CATALOGUE_PREPARATION_FAILED' })); process.exitCode = 1; }).finally(() => db.$disconnect());
