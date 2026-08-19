const {
  APPROVED_AIRTIME_PROVIDERS,
  syncCatalogue
} = require("../../../scripts/sync-accelerate-live-catalogue.cjs") as {
  APPROVED_AIRTIME_PROVIDERS: Array<{ type: string; name: string; code: string }>;
  syncCatalogue: (prisma: unknown, options?: { dryRun?: boolean; confirmed?: boolean }) => Promise<{
    dryRun: boolean;
    mutated: number;
    plan: { actions: Array<{ status: string; approved: { code: string } }> };
  }>;
};

function fakePrisma(initialProviders: Array<Record<string, unknown>> = []) {
  const providers = initialProviders.map((item) => ({ ...item }));
  const upsert = jest.fn(async ({ where, update, create }) => {
    const index = providers.findIndex((item) => item.code === where.code);
    if (index === -1) {
      providers.push({ id: `provider-${providers.length + 1}`, ...create });
      return providers[providers.length - 1];
    }
    providers[index] = { ...providers[index], ...update };
    return providers[index];
  });
  const prisma = {
    utilityProvider: { findMany: jest.fn(async () => providers.map((item) => ({ ...item }))) },
    utilityProduct: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (callback) => callback({ utilityProvider: { upsert } }))
  };
  return { prisma, providers, upsert };
}

describe("Accelerate live catalogue sync", () => {
  it("uses only Airtime provider values published by the official merchant contract", () => {
    expect(APPROVED_AIRTIME_PROVIDERS.map((item) => item.code)).toEqual([
      "MTN", "GLO", "AIRTEL", "9MOBILE"
    ]);
    expect(APPROVED_AIRTIME_PROVIDERS.every((item) => !item.code.startsWith("DEMO_"))).toBe(true);
  });

  it("performs no mutation in dry-run mode", async () => {
    const { prisma, providers, upsert } = fakePrisma();

    const result = await syncCatalogue(prisma, { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.mutated).toBe(0);
    expect(providers).toHaveLength(0);
    expect(upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("is idempotent, preserves unknown live codes and never promotes demo records", async () => {
    const unknown = { id: "provider-existing", type: "AIRTIME", name: "Owner record", code: "OWNER_CODE", isActive: true, metadata: { ownerManaged: true } };
    const demo = { id: "provider-demo", type: "AIRTIME", name: "Demo", code: "DEMO_MTN_AIRTIME_PROVIDER", isActive: false, metadata: { demoOnly: true } };
    const { prisma, providers, upsert } = fakePrisma([unknown, demo]);

    const first = await syncCatalogue(prisma, { dryRun: false, confirmed: true });
    const second = await syncCatalogue(prisma, { dryRun: false, confirmed: true });

    expect(first.mutated).toBe(APPROVED_AIRTIME_PROVIDERS.length);
    expect(second.mutated).toBe(0);
    expect(providers).toHaveLength(APPROVED_AIRTIME_PROVIDERS.length + 2);
    expect(new Set(providers.map((item) => item.code)).size).toBe(providers.length);
    expect(providers.find((item) => item.code === "OWNER_CODE")).toEqual(unknown);
    expect(providers.find((item) => item.code === "DEMO_MTN_AIRTIME_PROVIDER")).toEqual(demo);
    expect(upsert).toHaveBeenCalledTimes(APPROVED_AIRTIME_PROVIDERS.length);
  });

  it("blocks rather than promoting an approved code marked as demo or staging", async () => {
    const demoMtn = { id: "provider-demo-mtn", type: "AIRTIME", name: "MTN staging", code: "MTN", isActive: false, metadata: { demoOnly: true, catalogueMode: "STAGING" } };
    const { prisma, providers, upsert } = fakePrisma([demoMtn]);

    await expect(syncCatalogue(prisma, { dryRun: false, confirmed: true })).rejects.toThrow("BLOCKED_DEMO_CONFLICT");

    expect(providers).toEqual([demoMtn]);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before mutation", async () => {
    const { prisma } = fakePrisma();
    await expect(syncCatalogue(prisma, { dryRun: false })).rejects.toThrow("CONFIRM_ACCELERATE_LIVE_CATALOGUE_SYNC=true");
  });
});
