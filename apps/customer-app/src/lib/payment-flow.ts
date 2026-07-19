import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";

export type PaymentAuthorizationLike = {
  authorizationUrl?: string | null;
  checkoutUrl?: string | null;
  paymentUrl?: string | null;
  url?: string | null;
};

export function paymentAuthorizationUrlFrom(authorization?: PaymentAuthorizationLike | null): string | null {
  const candidates = [
    authorization?.authorizationUrl,
    authorization?.checkoutUrl,
    authorization?.paymentUrl,
    authorization?.url
  ];
  return candidates.find((candidate) => typeof candidate === "string" && candidate.trim())?.trim() ?? null;
}

export function isMockAuthorizationUrl(url?: string | null): boolean {
  return typeof url === "string" && url.startsWith("mock://");
}

export function isExternalPaymentUrl(url?: string | null): url is string {
  if (typeof url !== "string" || !url.trim()) return false;
  const normalizedUrl = url.trim();
  if (normalizedUrl.startsWith("/") || normalizedUrl.startsWith("./") || normalizedUrl.startsWith("../")) return false;
  try {
    const parsed = new URL(normalizedUrl);
    return ["http:", "https:"].includes(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export const isExternalPaymentAuthorizationUrl = isExternalPaymentUrl;

export async function openExternalPaymentUrl(url: string): Promise<void> {
  if (!isExternalPaymentUrl(url)) {
    throw new Error("Payment provider returned an invalid checkout link.");
  }
  const normalizedUrl = url.trim();
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const opened = window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      throw new Error("Payment checkout could not be opened. Please allow browser pop-ups and try again.");
    }
    return;
  }
  try {
    await Linking.openURL(normalizedUrl);
    return;
  } catch {
    // Some Android environments do not resolve a browser directly. Fall back to Expo's external browser helper.
  }
  try {
    await WebBrowser.openBrowserAsync(normalizedUrl);
  } catch {
    throw new Error("Payment checkout could not be opened. Please try again.");
  }
}

export async function openExternalPaymentAuthorization(url: string): Promise<void> {
  return openExternalPaymentUrl(url);
}
