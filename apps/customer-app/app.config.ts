import type { ConfigContext, ExpoConfig } from "expo/config";

const isStaging =
  process.env.APP_VARIANT === "staging" ||
  process.env.EAS_BUILD_PROFILE === "customer-staging" ||
  process.env.EAS_BUILD_PROFILE === "customer-staging-ios-simulator";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isStaging ? "KariGO Customer Staging" : "KariGO Customer",
  slug: "karigo-customer",
  scheme: isStaging ? "karigo-customer-staging" : "karigo-customer",
  plugins: ["expo-router"],
  icon: "./assets/karigo-logo.png",
  splash: {
    image: "./assets/karigo-logo.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF"
  },
  android: {
    ...config.android,
    package: isStaging ? "com.karigo.customer.staging" : "com.karigo.customer"
  },
  ios: {
    ...config.ios,
    bundleIdentifier: isStaging ? "com.karigo.customer.staging" : "com.karigo.customer"
  },
  extra: {
    ...config.extra,
    router: {},
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? ""
  }
});
