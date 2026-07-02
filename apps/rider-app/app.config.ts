import type { ConfigContext, ExpoConfig } from "expo/config";

const isStaging =
  process.env.APP_VARIANT === "staging" ||
  process.env.EAS_BUILD_PROFILE === "rider-staging" ||
  process.env.EAS_BUILD_PROFILE === "rider-staging-ios-simulator";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isStaging ? "KariGO Rider Staging" : "KariGO Rider",
  slug: "karigo-rider",
  scheme: isStaging ? "karigo-rider-staging" : "karigo-rider",
  plugins: ["expo-router"],
  icon: "./assets/karigo-logo.png",
  splash: {
    image: "./assets/karigo-logo.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF"
  },
  android: {
    ...config.android,
    package: isStaging ? "com.karigo.rider.staging" : "com.karigo.rider"
  },
  ios: {
    ...config.ios,
    bundleIdentifier: isStaging ? "com.karigo.rider.staging" : "com.karigo.rider"
  },
  extra: {
    ...config.extra,
    router: {},
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? ""
  }
});
