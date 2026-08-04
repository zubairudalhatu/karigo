type ExpoConfigInput = {
  config: {
    android?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    ios?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

const isStaging =
  process.env.APP_VARIANT === "staging" ||
  process.env.EAS_BUILD_PROFILE === "partner-staging" ||
  process.env.EAS_BUILD_PROFILE === "partner-staging-ios-simulator";

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const androidApi36BuildProperties = {
  android: {
    compileSdkVersion: 36,
    targetSdkVersion: 36,
    buildToolsVersion: "36.0.0"
  }
};

export default ({ config }: ExpoConfigInput) => {
  const extra = objectValue(config.extra);

  return {
    ...config,
    name: isStaging ? "KariGO Partner Staging" : "KariGO Partner",
    version: "1.0.0",
    slug: "karigo-partner",
    scheme: isStaging ? "karigo-partner-staging" : "karigo-partner",
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "KariGO Partner uses photo access only when you choose product images, business logo or cover images to upload.",
          microphonePermission: false
        }
      ],
      "expo-document-picker",
      ["expo-build-properties", androidApi36BuildProperties]
    ],
    icon: "./assets/karigo-icon.png",
    splash: {
      image: "./assets/karigo-logo.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    android: {
      ...config.android,
      blockedPermissions: [
        ...new Set([...(Array.isArray(config.android?.blockedPermissions) ? config.android.blockedPermissions : []), "android.permission.RECORD_AUDIO"])
      ],
      adaptiveIcon: {
        ...(objectValue(config.android?.adaptiveIcon)),
        foregroundImage: "./assets/karigo-adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: isStaging ? "com.karigo.partner.staging" : "com.karigo.partner",
      versionCode: isStaging ? 1 : 4
    },
    ios: {
      ...config.ios,
      bundleIdentifier: isStaging ? "com.karigo.partner.staging" : "com.karigo.partner"
    },
    extra: {
      ...extra,
      router: {},
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? ""
    }
  };
};
