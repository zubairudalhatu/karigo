import Constants from "expo-constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  NativeAd,
  NativeAdChoicesPlacement,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView
} from "react-native-google-mobile-ads";
import { brand } from "@karigo/config";
import { useAdMobConsent } from "../contexts/admob-consent-context";
import { selectNativeAdUnitId, shouldRequestAdMob } from "../lib/admob-policy";

const LOAD_TIMEOUT_MS = 8_000;

export function AdMobNativeFallback({ eligible, firstPartyAdCount }: { eligible: boolean; firstPartyAdCount: number }) {
  const { canRequestAds, runtimeReady } = useAdMobConsent();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const currentAd = useRef<NativeAd | null>(null);
  const appEnvironment = String(Constants.expoConfig?.extra?.appEnvironment ?? "development");
  const testMode = process.env.EXPO_PUBLIC_ADMOB_TEST_MODE === "true";
  const unitId = useMemo(() => selectNativeAdUnitId({ isDevelopment: __DEV__, appEnvironment, testMode }), [appEnvironment, testMode]);
  const shouldLoad = shouldRequestAdMob({
    placementSource: eligible ? "ADMOB_FALLBACK" : "NONE",
    firstPartyAdCount,
    consentCanRequestAds: canRequestAds,
    runtimeReady
  });

  useEffect(() => {
    if (!shouldLoad) return;
    let active = true;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (currentAd.current) {
        currentAd.current.destroy();
        currentAd.current = null;
        setNativeAd(null);
      }
    }, LOAD_TIMEOUT_MS);

    void NativeAd.createForAdRequest(unitId, {
      adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
      aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
      requestNonPersonalizedAdsOnly: true
    }).then((loadedAd) => {
      if (!active || timedOut) {
        loadedAd.destroy();
        return;
      }
      currentAd.current = loadedAd;
      setNativeAd(loadedAd);
    }).catch(() => undefined).finally(() => clearTimeout(timer));

    return () => {
      active = false;
      clearTimeout(timer);
      currentAd.current?.destroy();
      currentAd.current = null;
    };
  }, [shouldLoad, unitId]);

  if (!nativeAd) return null;

  return <View style={styles.cardFrame}>
    <NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.attribution}>Ad</Text>
        <NativeAsset assetType={NativeAssetType.HEADLINE}><Text style={styles.headline} numberOfLines={2}>{nativeAd.headline}</Text></NativeAsset>
      </View>
      <NativeMediaView style={styles.media} resizeMode="cover" />
      <View style={styles.copy}>
        {nativeAd.icon ? <NativeAsset assetType={NativeAssetType.ICON}><Image source={{ uri: nativeAd.icon.url }} style={styles.icon} /></NativeAsset> : null}
        <View style={styles.copyText}>
          {nativeAd.advertiser ? <NativeAsset assetType={NativeAssetType.ADVERTISER}><Text style={styles.advertiser}>{nativeAd.advertiser}</Text></NativeAsset> : null}
          <NativeAsset assetType={NativeAssetType.BODY}><Text style={styles.body} numberOfLines={3}>{nativeAd.body}</Text></NativeAsset>
        </View>
      </View>
      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}><Text style={styles.cta}>{nativeAd.callToAction}</Text></NativeAsset>
    </NativeAdView>
  </View>;
}

const styles = StyleSheet.create({
  cardFrame: { backgroundColor: brand.colors.white, borderColor: brand.colors.border, borderRadius: 20, borderWidth: 1 },
  card: { gap: 10, overflow: "visible", padding: 14, paddingTop: 18 },
  header: { gap: 6, paddingRight: 56 },
  attribution: { alignSelf: "flex-start", backgroundColor: "#FFF4CC", borderColor: "#D69E00", borderRadius: 4, borderWidth: 1, color: "#614700", fontSize: 10, fontWeight: "900", paddingHorizontal: 5, paddingVertical: 2 },
  headline: { color: brand.colors.charcoal, fontSize: 17, fontWeight: "900" },
  media: { aspectRatio: 1.91, borderRadius: 14, width: "100%" },
  copy: { alignItems: "center", flexDirection: "row", gap: 10 },
  icon: { borderRadius: 10, height: 44, width: 44 },
  copyText: { flex: 1, gap: 3 },
  advertiser: { color: brand.colors.charcoal, fontSize: 12, fontWeight: "800" },
  body: { color: brand.colors.muted, fontSize: 13, lineHeight: 18 },
  cta: { alignSelf: "stretch", backgroundColor: brand.colors.primary, borderRadius: 12, color: brand.colors.white, fontSize: 14, fontWeight: "900", overflow: "hidden", paddingHorizontal: 14, paddingVertical: 11, textAlign: "center" }
});
