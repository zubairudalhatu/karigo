import * as SecureStore from "expo-secure-store";

const INTENT_KEY = "karigo_captain_application_intent";

export interface CaptainApplicationIntent {
  deliveryCaptainInterest?: boolean;
  rideCaptainReviewInterest?: boolean;
  city?: string;
  state?: string;
  residentialStateCode?: string;
  residentialCityCode?: string;
  operatingAreaIds?: string[];
  primaryOperatingAreaId?: string;
  address?: string;
  preferredZone?: string;
}

export async function saveCaptainApplicationIntent(intent: CaptainApplicationIntent) {
  await SecureStore.setItemAsync(INTENT_KEY, JSON.stringify(intent));
}

export async function loadCaptainApplicationIntent(): Promise<CaptainApplicationIntent | null> {
  const value = await SecureStore.getItemAsync(INTENT_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as CaptainApplicationIntent;
  } catch {
    await SecureStore.deleteItemAsync(INTENT_KEY);
    return null;
  }
}

export function clearCaptainApplicationIntent() {
  return SecureStore.deleteItemAsync(INTENT_KEY);
}
