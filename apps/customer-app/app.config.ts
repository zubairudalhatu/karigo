const easExtra = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const isStaging =
  process.env.APP_VARIANT === "staging" ||
  process.env.EAS_BUILD_PROFILE === "customer-staging" ||
  process.env.EAS_BUILD_PROFILE === "customer-staging-ios-simulator";

export default ({ config }: { config: Record<string, any> }) => ({
  ...config,
  name: isStaging ? "KariGO Customer Staging" : "KariGO",
  slug: "karigo-customer",
  scheme: isStaging ? "karigo-customer-staging" : "karigo-customer",
  plugins: [
    "expo-router",
    [
      "expo-image-picker",
      {
        photosPermission: "KariGO uses photo library access only when you choose a customer profile photo."
      }
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "KariGO uses your location only when you choose to detect a delivery or service address."
      }
    ]
  ],
  icon: "./assets/karigo-icon.png",
  splash: {
    image: "./assets/karigo-logo.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF"
  },
  updates: {
    ...config.updates,
    url: "https://u.expo.dev/467aa2f6-22b1-4a81-a9d6-c38f3ebe191d"
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      ...(config.android?.adaptiveIcon ?? {}),
      foregroundImage: "./assets/karigo-adaptive-icon.png",
      backgroundColor: "#FFFFFF"
    },
    package: isStaging ? "com.karigo.customer.staging" : "com.karigo.customer",
    versionCode: isStaging ? 1 : 4
  },
  ios: {
    ...config.ios,
    bundleIdentifier: isStaging ? "com.karigo.customer.staging" : "com.karigo.customer"
  },
  extra: {
    ...config.extra,
    router: {},
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
    eas: {
      ...easExtra(config.extra?.eas),
      projectId: "467aa2f6-22b1-4a81-a9d6-c38f3ebe191d"
    }
  }
});
