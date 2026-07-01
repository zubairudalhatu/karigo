export const NIGERIAN_PHONE_PATTERN = /^\+234[789]\d{9}$/;

export function normalizePhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.trim().replace(/[\s()-]/g, "");

  if (/^0\d{10}$/.test(normalized)) {
    return `+234${normalized.slice(1)}`;
  }

  if (/^234\d{10}$/.test(normalized)) {
    return `+${normalized}`;
  }

  return normalized;
}
