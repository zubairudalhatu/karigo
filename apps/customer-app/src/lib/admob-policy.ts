import type { CustomerAdPlacementSource } from "@karigo/shared-types";

export const ADMOB_ANDROID_APP_ID = "ca-app-pub-8797316301984037~1272004979";
export const ADMOB_PRODUCTION_NATIVE_UNIT_ID = "ca-app-pub-8797316301984037/9498727786";
export const ADMOB_TEST_NATIVE_UNIT_ID = "ca-app-pub-3940256099942544/2247696110";

export function selectNativeAdUnitId(input: { isDevelopment: boolean; appEnvironment: string; testMode?: boolean }) {
  return input.isDevelopment || input.appEnvironment !== "production" || input.testMode
    ? ADMOB_TEST_NATIVE_UNIT_ID
    : ADMOB_PRODUCTION_NATIVE_UNIT_ID;
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
