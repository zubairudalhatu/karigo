const fs = require("node:fs"),
  path = require("node:path");
async function main() {
  require("./payment-sandbox-guard.cjs").assertPaymentSandbox(process.env);
  if (
    [".env", "prisma/.env", "../../.env"].some((p) =>
      fs.existsSync(path.resolve(p)),
    )
  )
    throw Error("DOTENV_FORBIDDEN");
  await require("./payment-sandbox-migrate.cjs").migrateStaging();
  require("./payment-sandbox-guard.cjs").installHttpBoundary(process.env);
  for (const key of ["log", "warn", "error", "info", "debug"])
    console[key] = () => {};
  await require("../dist/services/backend-api/src/payment-sandbox/main.js").startPaymentSandbox();
}
main().catch(() => {
  process.stderr.write("PAYMENT_SANDBOX_BOOT_FAILED\n");
  process.exitCode = 1;
});
