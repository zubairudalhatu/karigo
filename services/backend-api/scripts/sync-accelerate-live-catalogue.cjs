#!/usr/bin/env node

const { PrismaClient, UtilityServiceType } = require("@prisma/client");

const AIRTIME_CONTRACT_URL = "https://istrategytech.gitbook.io/accelerate/api-merchants/editor";
const APPROVED_AIRTIME_PROVIDERS = Object.freeze([
  { type: UtilityServiceType.AIRTIME, name: "MTN", code: "MTN" },
  { type: UtilityServiceType.AIRTIME, name: "Glo", code: "GLO" },
  { type: UtilityServiceType.AIRTIME, name: "Airtel", code: "AIRTEL" },
  { type: UtilityServiceType.AIRTIME, name: "9mobile", code: "9MOBILE" }
]);

function jsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function liveMetadata(current) {
  return {
    ...jsonObject(current),
    catalogueMode: "LIVE",
    integration: "ACCELERATE",
    demoOnly: false,
    packageRequired: false,
    source: AIRTIME_CONTRACT_URL
  };
}

function isDemo(record) {
  return record.code.startsWith("DEMO_") || jsonObject(record.metadata).demoOnly === true;
}

function isStaging(record) {
  const metadata = jsonObject(record.metadata);
  return metadata.stagingOnly === true || metadata.catalogueMode === "STAGING";
}

function summariseCatalogue(providers, products) {
  return {
    providers: {
      total: providers.length,
      active: providers.filter((item) => item.isActive).length,
      inactive: providers.filter((item) => !item.isActive).length,
      demo: providers.filter(isDemo).length,
      staging: providers.filter(isStaging).length,
      liveAccelerate: providers.filter((item) => {
        const metadata = jsonObject(item.metadata);
        return !isDemo(item) && metadata.catalogueMode === "LIVE" && metadata.integration === "ACCELERATE";
      }).length
    },
    products: {
      total: products.length,
      active: products.filter((item) => item.isActive).length,
      inactive: products.filter((item) => !item.isActive).length,
      demo: products.filter(isDemo).length,
      staging: products.filter(isStaging).length,
      liveAccelerate: products.filter((item) => {
        const metadata = jsonObject(item.metadata);
        return !isDemo(item) && metadata.catalogueMode === "LIVE" && metadata.integration === "ACCELERATE";
      }).length
    }
  };
}

async function planCatalogueSync(prisma) {
  const [providers, products] = await Promise.all([
    prisma.utilityProvider.findMany({
      select: { id: true, type: true, name: true, code: true, isActive: true, metadata: true },
      orderBy: [{ type: "asc" }, { code: "asc" }]
    }),
    prisma.utilityProduct.findMany({
      select: { id: true, providerId: true, type: true, name: true, code: true, isActive: true, metadata: true },
      orderBy: [{ type: "asc" }, { code: "asc" }]
    })
  ]);
  const existingByCode = new Map(providers.map((item) => [item.code, item]));
  const actions = APPROVED_AIRTIME_PROVIDERS.map((approved) => {
    const existing = existingByCode.get(approved.code);
    if (existing && existing.type !== approved.type) {
      return { status: "BLOCKED_TYPE_CONFLICT", approved, existing };
    }
    if (existing && isDemo(existing)) return { status: "BLOCKED_DEMO_CONFLICT", approved, existing };
    if (existing && isStaging(existing)) return { status: "BLOCKED_STAGING_CONFLICT", approved, existing };
    const metadata = liveMetadata(existing?.metadata);
    if (!existing) return { status: "CREATE", approved, metadata };
    const current = jsonObject(existing.metadata);
    const metadataReady = current.catalogueMode === "LIVE" && current.integration === "ACCELERATE" &&
      current.demoOnly === false && current.packageRequired === false && current.source === AIRTIME_CONTRACT_URL;
    return {
      status: existing.isActive && metadataReady ? "NO_CHANGE" : "UPDATE",
      approved,
      existing,
      metadata
    };
  });
  return { snapshot: summariseCatalogue(providers, products), actions };
}

async function applyCataloguePlan(prisma, plan) {
  const conflicts = plan.actions.filter((action) => action.status.startsWith("BLOCKED_"));
  if (conflicts.length) {
    throw new Error(`Accelerate catalogue sync blocked by provider record conflicts: ${conflicts.map((item) => `${item.approved.code} (${item.status})`).join(", ")}`);
  }
  const mutations = plan.actions.filter((action) => action.status === "CREATE" || action.status === "UPDATE");
  if (!mutations.length) return 0;
  await prisma.$transaction(async (tx) => {
    for (const action of mutations) {
      const { approved, metadata } = action;
      await tx.utilityProvider.upsert({
        where: { code: approved.code },
        update: {
          isActive: true,
          metadata,
          ...(action.existing?.name?.trim() ? {} : { name: approved.name })
        },
        create: {
          type: approved.type,
          name: approved.name,
          code: approved.code,
          isActive: true,
          metadata
        }
      });
    }
  });
  return mutations.length;
}

async function syncCatalogue(prisma, options = {}) {
  const dryRun = options.dryRun !== false;
  if (!dryRun && options.confirmed !== true) {
    throw new Error("Live catalogue mutation requires CONFIRM_ACCELERATE_LIVE_CATALOGUE_SYNC=true.");
  }
  const plan = await planCatalogueSync(prisma);
  if (dryRun) return { dryRun: true, mutated: 0, plan };
  return { dryRun: false, mutated: await applyCataloguePlan(prisma, plan), plan };
}

function printResult(result) {
  console.log(`Accelerate live catalogue sync mode: ${result.dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log(`Existing providers: ${result.plan.snapshot.providers.total} (${result.plan.snapshot.providers.demo} demo, ${result.plan.snapshot.providers.staging} staging, ${result.plan.snapshot.providers.inactive} inactive, ${result.plan.snapshot.providers.liveAccelerate} live Accelerate)`);
  console.log(`Existing products: ${result.plan.snapshot.products.total} (${result.plan.snapshot.products.demo} demo, ${result.plan.snapshot.products.staging} staging, ${result.plan.snapshot.products.inactive} inactive, ${result.plan.snapshot.products.liveAccelerate} live Accelerate)`);
  for (const action of result.plan.actions) console.log(`- ${action.approved.type} ${action.approved.code}: ${action.status}`);
  console.log(`Provider records mutated: ${result.mutated}`);
  if (result.dryRun) console.log("Dry-run complete. No provider or product records were changed.");
  console.log("Data, Electricity and Cable TV are intentionally unchanged until provider/owner-confirmed live codes are supplied.");
}

async function run(argv = process.argv.slice(2), env = process.env) {
  const execute = argv.includes("--execute");
  const explicitDryRun = argv.includes("--dry-run");
  if (execute && explicitDryRun) throw new Error("Choose either --dry-run or --execute.");
  const prisma = new PrismaClient();
  try {
    const result = await syncCatalogue(prisma, {
      dryRun: !execute,
      confirmed: env.CONFIRM_ACCELERATE_LIVE_CATALOGUE_SYNC === "true"
    });
    printResult(result);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`Accelerate live catalogue sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  });
}

module.exports = {
  AIRTIME_CONTRACT_URL,
  APPROVED_AIRTIME_PROVIDERS,
  applyCataloguePlan,
  planCatalogueSync,
  syncCatalogue
};
