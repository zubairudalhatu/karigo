const easExtra = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const isStaging =
  process.env.APP_VARIANT === "staging" ||
  process.env.EAS_BUILD_PROFILE === "customer-staging" ||
  process.env.EAS_BUILD_PROFILE === "customer-staging-ios-simulator";

const androidApi36BuildProperties = {
  android: {
    compileSdkVersion: 36,
    targetSdkVersion: 36,
    buildToolsVersion: "36.0.0"
  }
};

const googleMapsAndroidApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;

const customerAppVersion = "1.1.0";
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  "";

export default ({ config }: { config: Record<string, any> }) => ({
  ...config,
  name: isStaging ? "KariGO Customer Staging" : "KariGO",
  version: customerAppVersion,
  owner: "zamkah",
  slug: "karigo-customer",
  scheme: isStaging ? "karigo-customer-staging" : "karigo-customer",
  plugins: [
    "expo-router",
    "expo-web-browser",
    [
      "expo-image-picker",
      {
        photosPermission: "KariGO uses photo library access only when you choose a customer profile photo."
      }
    ],
    [
      "expo-notifications",
      {
        color: "#D90000",
        defaultChannel: "ride-messages",
        sounds: ["./assets/sounds/karigo-ride-call.wav", "./assets/sounds/karigo-message.wav"]
      }
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "KariGO uses your location only when you choose to detect a delivery or service address."
      }
    ],
    ["expo-build-properties", androidApi36BuildProperties],
    "../../scripts/with-approved-android-launcher-icons.cjs"
  ],
  icon: "./assets/icon.png",
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
    permissions: [
      ...new Set([
        ...(config.android?.permissions ?? []),
        "android.permission.RECORD_AUDIO"
      ])
    ],
    blockedPermissions: [
      ...new Set([
        ...(config.android?.blockedPermissions ?? []),
        "android.permission.CAMERA",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ])
    ],
    allowBackup: false,
    icon: "./assets/icon.png",
    config: googleMapsAndroidApiKey
      ? {
        ...(config.android?.config ?? {}),
        googleMaps: {
          ...(config.android?.config?.googleMaps ?? {}),
          apiKey: googleMapsAndroidApiKey
        }
      }
      : config.android?.config,
    adaptiveIcon: {
      ...(config.android?.adaptiveIcon ?? {}),
      foregroundImage: "./assets/adaptive-icon-foreground.png",
      backgroundColor: "#D90000",
      monochromeImage: "./assets/adaptive-icon-monochrome.png"
    },
    package: isStaging ? "com.karigo.customer.staging" : "com.karigo.customer",
    versionCode: isStaging ? 1 : 17
  },
  ios: {
    ...config.ios,
    bundleIdentifier: isStaging ? "com.karigo.customer.staging" : "com.karigo.customer",
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      NSMicrophoneUsageDescription: "KariGO uses your microphone only when you make or receive an in-app Ride call."
    }
  },
  extra: {
    ...config.extra,
    router: {},
    apiBaseUrl,
    appEnvironment: process.env.APP_VARIANT ?? "development",
    updateChannel: isStaging ? "customer-staging" : "customer-production",
    runtimeVersion: customerAppVersion,
    eas: {
      ...easExtra(config.extra?.eas),
      projectId: "467aa2f6-22b1-4a81-a9d6-c38f3ebe191d"
    }
  }
});
