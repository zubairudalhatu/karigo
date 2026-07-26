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

export default ({ config }: ExpoConfigInput) => {
  const extra = objectValue(config.extra);

  return {
    ...config,
    name: isStaging ? "KariGO Partner Staging" : "KariGO Partner",
    slug: "karigo-partner",
    scheme: isStaging ? "karigo-partner-staging" : "karigo-partner",
    plugins: ["expo-router"],
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
      adaptiveIcon: {
        ...(objectValue(config.android?.adaptiveIcon)),
        foregroundImage: "./assets/karigo-adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: isStaging ? "com.karigo.partner.staging" : "com.karigo.partner",
      versionCode: isStaging ? 1 : 1
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
