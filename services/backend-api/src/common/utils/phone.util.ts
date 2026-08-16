export const NIGERIAN_PHONE_PATTERN = /^\+234[789]\d{9}$/;

export function normalizePhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber
    .trim()
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "");

  if (/^0\d{10}$/.test(normalized)) {
    return `+234${normalized.slice(1)}`;
  }

  if (/^234\d{10}$/.test(normalized)) {
    return `+${normalized}`;
  }

  return normalized;
}

export function nigerianPhoneSearchDigits(phoneNumber: string): string | null {
  const digits = phoneNumber.replace(/\D/g, "");
  if (/^[789]\d{9}$/.test(digits)) return digits;
  if (/^0[789]\d{9}$/.test(digits)) return digits.slice(1);
  if (/^234[789]\d{9}$/.test(digits)) return digits.slice(-10);
  return null;
}
