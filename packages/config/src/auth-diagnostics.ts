const BLOCKED_META_KEY_PATTERN = /(token|secret|password|credential|authorization|otp|key)/i;

export function logMobileAuthDiagnostic(
  appName: string,
  event: string,
  metadata: Record<string, unknown> = {}
): void {
  const safeMetadata = Object.entries(metadata).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (BLOCKED_META_KEY_PATTERN.test(key)) {
      return acc;
    }
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "string"
    ) {
      acc[key] = value;
    }
    return acc;
  }, {});

  console.info(`[KariGO auth] ${appName}:${event}`, safeMetadata);
}
