import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";

export type PaymentAuthorizationLike = {
  authorizationUrl?: string | null;
  checkoutUrl?: string | null;
  paymentUrl?: string | null;
  url?: string | null;
};

export type ExternalPaymentOpenResult =
  | { opened: true; method: "linking" | "web-browser" | "web-window" }
  | { opened: false; message: string };

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

function paymentHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-host";
  }
}

function logPaymentOpenDiagnostic(message: string, url: string): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(`[payment-checkout] ${message} host=${paymentHost(url)}`);
  }
}

export async function openExternalPaymentUrl(url: string): Promise<ExternalPaymentOpenResult> {
  if (!isExternalPaymentUrl(url)) {
    return { opened: false, message: "Payment provider returned an invalid checkout link." };
  }
  const normalizedUrl = url.trim();
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const opened = window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      return { opened: false, message: "Payment checkout could not be opened. Please allow browser pop-ups and try again." };
    }
    return { opened: true, method: "web-window" };
  }
  try {
    const canOpen = await Linking.canOpenURL(normalizedUrl);
    if (canOpen) {
      await Linking.openURL(normalizedUrl);
      return { opened: true, method: "linking" };
    }
    logPaymentOpenDiagnostic("Linking cannot open payment URL; falling back to WebBrowser", normalizedUrl);
  } catch (error) {
    // Some Android environments do not resolve a browser directly. Fall back to Expo's external browser helper.
    logPaymentOpenDiagnostic(error instanceof Error ? error.message : "Linking failed; falling back to WebBrowser", normalizedUrl);
  }
  try {
    await WebBrowser.openBrowserAsync(normalizedUrl);
    return { opened: true, method: "web-browser" };
  } catch {
    return { opened: false, message: "Payment checkout could not be opened. Please try again." };
  }
}

export async function openExternalPaymentAuthorization(url: string): Promise<ExternalPaymentOpenResult> {
  return openExternalPaymentUrl(url);
}
