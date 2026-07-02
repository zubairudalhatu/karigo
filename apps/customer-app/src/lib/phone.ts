export function normalizeNigerianPhoneNumber(value: string): string {
  const normalized = value.trim().replace(/[\s()-]/g, "");

  if (/^0\d{10}$/.test(normalized)) {
    return `+234${normalized.slice(1)}`;
  }

  if (/^234\d{10}$/.test(normalized)) {
    return `+${normalized}`;
  }

  return normalized;
}
