export function normalizeNigerianPhoneNumber(value: string) {
  const phone = value
    .trim()
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "");
  if (phone.startsWith("+")) return phone;
  if (phone.startsWith("0")) return `+234${phone.slice(1)}`;
  if (phone.startsWith("234")) return `+${phone}`;
  return phone;
}
