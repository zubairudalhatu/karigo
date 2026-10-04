import Constants from "expo-constants";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import mobileAds, { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } from "react-native-google-mobile-ads";

type AdMobConsentContextValue = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  runtimeReady: boolean;
  showPrivacyOptions: () => Promise<void>;
};

const AdMobConsentContext = createContext<AdMobConsentContextValue>({
  canRequestAds: false,
  privacyOptionsRequired: false,
  runtimeReady: false,
  showPrivacyOptions: async () => undefined
});

export function AdMobConsentProvider({ children }: { children: ReactNode }) {
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const initialized = useRef(false);
  const appEnvironment = String(Constants.expoConfig?.extra?.appEnvironment ?? "development");
  const testMode = process.env.EXPO_PUBLIC_ADMOB_TEST_MODE === "true";
  const productionReady = process.env.EXPO_PUBLIC_ADMOB_PRODUCTION_READY === "true";
  const configurationReady = __DEV__ || appEnvironment !== "production" || testMode || productionReady;

  useEffect(() => {
    let active = true;
    async function initializeConsent() {
      try {
        const info = await AdsConsent.gatherConsent();
        if (!active) return;
        setCanRequestAds(info.canRequestAds);
        setPrivacyOptionsRequired(info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
      } catch {
        try {
          const previous = await AdsConsent.getConsentInfo();
          if (!active) return;
          setCanRequestAds(previous.canRequestAds);
          setPrivacyOptionsRequired(previous.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
        } catch {
          if (active) setCanRequestAds(false);
        }
      }
    }
    void initializeConsent();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!configurationReady || !canRequestAds || initialized.current) return;
    initialized.current = true;
    void mobileAds().initialize()
      .then(() => { if (active) setSdkReady(true); })
      .catch(() => { if (active) setSdkReady(false); });
    return () => { active = false; };
  }, [canRequestAds, configurationReady]);

  const value = useMemo<AdMobConsentContextValue>(() => ({
    canRequestAds,
    privacyOptionsRequired,
    runtimeReady: sdkReady,
    showPrivacyOptions: async () => {
      const info = await AdsConsent.showPrivacyOptionsForm();
      setCanRequestAds(info.canRequestAds);
      setPrivacyOptionsRequired(info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
    }
  }), [canRequestAds, privacyOptionsRequired, sdkReady]);

  return <AdMobConsentContext.Provider value={value}>{children}</AdMobConsentContext.Provider>;
}

export function useAdMobConsent() {
  return useContext(AdMobConsentContext);
}
