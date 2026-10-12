import type { CustomerAdPlacementSource } from "@karigo/shared-types";

export const ADMOB_ANDROID_APP_ID = "ca-app-pub-8797316301984037~1272004979";
export const ADMOB_PRODUCTION_NATIVE_UNIT_ID = "ca-app-pub-8797316301984037/9498727786";
export const ADMOB_TEST_NATIVE_UNIT_ID = "ca-app-pub-3940256099942544/2247696110";
export const ADMOB_IOS_APP_ID = "ca-app-pub-8797316301984037~8850716285";
export const ADMOB_IOS_PRODUCTION_NATIVE_UNIT_ID = "ca-app-pub-8797316301984037/1519021173";
export const ADMOB_IOS_TEST_NATIVE_UNIT_ID = "ca-app-pub-3940256099942544/3986624511";

export function selectNativeAdUnitId(input: { platform?: string; isDevelopment: boolean; appEnvironment: string; testMode?: boolean; qaRealUnitTest?: boolean }) {
  const productionUnit = input.platform === "ios" ? ADMOB_IOS_PRODUCTION_NATIVE_UNIT_ID : ADMOB_PRODUCTION_NATIVE_UNIT_ID;
  const testUnit = input.platform === "ios" ? ADMOB_IOS_TEST_NATIVE_UNIT_ID : ADMOB_TEST_NATIVE_UNIT_ID;
  if (input.qaRealUnitTest) return productionUnit;
  return input.isDevelopment || input.appEnvironment !== "production" || input.testMode
    ? testUnit
    : productionUnit;
}

export function isAdMobConfigurationReady(input: {
  platform: string; isDevelopment: boolean; appEnvironment: string;
  testMode: boolean; productionReady: boolean; iosProductionReady: boolean; iosAppId?: string;
}) {
  if (input.platform === "ios") {
    if (!/^ca-app-pub-\d{16}~\d{10}$/.test(input.iosAppId ?? "")) return false;
    return input.isDevelopment || input.appEnvironment !== "production" || input.testMode || input.iosProductionReady;
  }
  return input.isDevelopment || input.appEnvironment !== "production" || input.testMode || input.productionReady;
}

export function shouldRequestAdMob(input: {
  placementSource: CustomerAdPlacementSource;
  firstPartyAdCount: number;
  consentCanRequestAds: boolean;
  runtimeReady: boolean;
}) {
  return input.placementSource === "ADMOB_FALLBACK"
    && input.firstPartyAdCount === 0
    && input.consentCanRequestAds
    && input.runtimeReady;
}
