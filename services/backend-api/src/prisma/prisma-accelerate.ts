const TRUE_ENV_VALUES = new Set(["true", "1", "yes"]);

export function isPrismaAccelerateUrl(databaseUrl: string | undefined): boolean {
  const normalized = databaseUrl?.trim().toLowerCase() ?? "";
  return normalized.startsWith("prisma://") || normalized.includes("accelerate.prisma-data.net");
}

export function prismaAccelerateFlagEnabled(value: string | undefined): boolean {
  return TRUE_ENV_VALUES.has(value?.trim().toLowerCase() ?? "");
}

export function shouldUsePrismaAccelerate(env: NodeJS.ProcessEnv = process.env): boolean {
  return prismaAccelerateFlagEnabled(env.PRISMA_ACCELERATE_ENABLED) || isPrismaAccelerateUrl(env.DATABASE_URL);
}
