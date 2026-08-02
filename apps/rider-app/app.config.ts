const isStaging =
  process.env.APP_VARIANT === "staging" ||
  process.env.EAS_BUILD_PROFILE === "rider-staging" ||
  process.env.EAS_BUILD_PROFILE === "rider-staging-ios-simulator";

const riderEasProjectId = "344a78dc-69d9-4daa-9616-f100b67f0910";

type ExpoConfigInput = {
  config: {
    android?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    ios?: Record<string, unknown>;
    updates?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

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

export default ({ config }: ExpoConfigInput) => {
  const extra = objectValue(config.extra);
  const existingEas = objectValue(extra.eas);
  const existingUpdates = objectValue(config.updates);
  const safeEas = { ...existingEas, projectId: riderEasProjectId };
  const safeUpdates = {
    ...existingUpdates,
    url: `https://u.expo.dev/${riderEasProjectId}`
  };

  return {
    ...config,
    name: isStaging ? "KariGO Captain Staging" : "KariGO Captain",
    version: "0.1.1",
    slug: "karigo-rider",
    scheme: isStaging ? "karigo-rider-staging" : "karigo-rider",
    plugins: [
      "expo-router",
      ["expo-location", {
        locationWhenInUsePermission: "KariGO Captain uses your location only while you are online or on an active delivery so dispatch can coordinate pickups and drop-offs."
      }],
      "@react-native-community/datetimepicker",
      ["expo-build-properties", androidApi36BuildProperties]
    ],
    icon: "./assets/karigo-icon.png",
    splash: {
      image: "./assets/karigo-logo.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF"
    },
    updates: safeUpdates,
    runtimeVersion: {
      policy: "appVersion"
    },
    android: {
      ...config.android,
      config: googleMapsAndroidApiKey
        ? {
          ...(objectValue(config.android?.config)),
          googleMaps: {
            ...(objectValue(objectValue(config.android?.config).googleMaps)),
            apiKey: googleMapsAndroidApiKey
          }
        }
        : config.android?.config,
      adaptiveIcon: {
        ...(objectValue(config.android?.adaptiveIcon)),
        foregroundImage: "./assets/karigo-adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: isStaging ? "com.karigo.rider.staging" : "com.karigo.rider",
      versionCode: isStaging ? 1 : 10
    },
    ios: {
      ...config.ios,
      bundleIdentifier: isStaging ? "com.karigo.rider.staging" : "com.karigo.rider"
    },
    extra: {
      ...extra,
      router: {},
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
      eas: safeEas
    }
  };
};
