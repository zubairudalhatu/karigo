import { Linking } from "react-native";

export function isMockAuthorizationUrl(url?: string | null): boolean {
  return typeof url === "string" && url.startsWith("mock://");
}

export function isExternalPaymentAuthorizationUrl(url?: string | null): url is string {
  return typeof url === "string" && /^https:\/\/\S+$/i.test(url);
}

export async function openExternalPaymentAuthorization(url: string): Promise<void> {
  if (!isExternalPaymentAuthorizationUrl(url)) {
    throw new Error("Payment authorization link was not accepted.");
  }
  await Linking.openURL(url);
}
