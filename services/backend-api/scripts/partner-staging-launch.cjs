const { assertStaging, installHttpBoundary } = require('./partner-staging-guard.cjs');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const identity = assertStaging(process.env);
  if (!fs.existsSync('/var/data')) throw Error('STAGING_PERSISTENT_DISK_REQUIRED');
  const backend = process.cwd();
  if ([".env","prisma/.env","../../.env"].some(file=>fs.existsSync(path.join(backend,file)))) throw Error("STAGING_DOTENV_FILE_FORBIDDEN");
  for (const dir of ['/var/data/partner-stage/private','/var/data/partner-stage/public']) fs.mkdirSync(dir,{recursive:true});
  const uploads = path.join(backend,'uploads');
  if (!fs.existsSync(uploads)) fs.symlinkSync('/var/data/partner-stage/public',uploads,'dir');
  if (fs.realpathSync(uploads) !== '/var/data/partner-stage/public') throw Error('STAGING_PUBLIC_STORAGE_MISMATCH');
  await require('./partner-staging-migrate.cjs').migrateStaging();
  installHttpBoundary(process.env);
  // Never forward arbitrary framework/provider log payloads to hosted logs.
  for (const key of ['log','warn','error','info','debug']) console[key] = () => {};
  const { seedStaging } = require('../dist/services/backend-api/src/partner-staging/seed.js');
  await seedStaging();
  const { startStaging } = require('../dist/services/backend-api/src/partner-staging/main.js');
  await startStaging(identity);
}
main().catch(() => { process.stderr.write('PARTNER_STAGING_BOOT_FAILED\n'); process.exitCode=1; });
