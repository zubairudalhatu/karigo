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
      ["expo-build-properties", androidApi36BuildProperties],
      "../../scripts/with-approved-android-launcher-icons.cjs"
    ],
    icon: "./assets/icon.png",
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
        ...new Set([
          ...(Array.isArray(config.android?.blockedPermissions) ? config.android.blockedPermissions : []),
          "android.permission.CAMERA",
          "android.permission.RECORD_AUDIO",
          "android.permission.SYSTEM_ALERT_WINDOW",
          "android.permission.WRITE_EXTERNAL_STORAGE"
        ])
      ],
      allowBackup: false,
      icon: "./assets/icon.png",
      adaptiveIcon: {
        ...(objectValue(config.android?.adaptiveIcon)),
        foregroundImage: "./assets/adaptive-icon-foreground.png",
        backgroundColor: "#FAF7F3",
        monochromeImage: "./assets/adaptive-icon-monochrome.png"
      },
      package: isStaging ? "com.karigo.partner.staging" : "com.karigo.partner",
      versionCode: isStaging ? 1 : 6
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
