import { isPrismaAccelerateUrl, prismaAccelerateFlagEnabled, shouldUsePrismaAccelerate } from "./prisma-accelerate";

describe("Prisma Accelerate helpers", () => {
  it("detects Prisma Accelerate URLs", () => {
    expect(isPrismaAccelerateUrl("prisma://accelerate.prisma-data.net/?api_key=placeholder")).toBe(true);
    expect(isPrismaAccelerateUrl("postgresql://user:password@db.example.test:5432/karigo")).toBe(false);
    expect(isPrismaAccelerateUrl(undefined)).toBe(false);
  });

  it("parses explicit Accelerate flags", () => {
    expect(prismaAccelerateFlagEnabled("true")).toBe(true);
    expect(prismaAccelerateFlagEnabled("1")).toBe(true);
    expect(prismaAccelerateFlagEnabled("yes")).toBe(true);
    expect(prismaAccelerateFlagEnabled("false")).toBe(false);
    expect(prismaAccelerateFlagEnabled(undefined)).toBe(false);
  });

  it("enables Accelerate from either flag or DATABASE_URL", () => {
    expect(shouldUsePrismaAccelerate({ PRISMA_ACCELERATE_ENABLED: "true" })).toBe(true);
    expect(shouldUsePrismaAccelerate({ DATABASE_URL: "prisma://accelerate.prisma-data.net/?api_key=placeholder" })).toBe(true);
    expect(shouldUsePrismaAccelerate({ DATABASE_URL: "postgresql://user:password@db.example.test:5432/karigo" })).toBe(false);
  });
});
