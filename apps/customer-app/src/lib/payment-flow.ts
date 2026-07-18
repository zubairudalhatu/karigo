import { Linking, Platform } from "react-native";

export function isMockAuthorizationUrl(url?: string | null): boolean {
  return typeof url === "string" && url.startsWith("mock://");
}

export function isExternalPaymentAuthorizationUrl(url?: string | null): url is string {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export async function openExternalPaymentAuthorization(url: string): Promise<void> {
  if (!isExternalPaymentAuthorizationUrl(url)) {
    throw new Error("Payment authorization link was not accepted.");
  }
  const normalizedUrl = url.trim();
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const canOpen = await Linking.canOpenURL(normalizedUrl);
  if (!canOpen) {
    throw new Error("Payment authorization link could not be opened.");
  }
  await Linking.openURL(normalizedUrl);
}
