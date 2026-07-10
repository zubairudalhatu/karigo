const isStaging =
  process.env.APP_VARIANT === "staging" ||
  process.env.EAS_BUILD_PROFILE === "rider-staging" ||
  process.env.EAS_BUILD_PROFILE === "rider-staging-ios-simulator";

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

export default ({ config }: ExpoConfigInput) => {
  const extra = objectValue(config.extra);
  const existingEas = objectValue(extra.eas);
  const { projectId: _projectId, ...safeEas } = existingEas;
  const existingUpdates = objectValue(config.updates);
  const { url: _updatesUrl, ...safeUpdates } = existingUpdates;
  const hasSafeUpdates = Object.keys(safeUpdates).length > 0;

  return {
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
    ...(hasSafeUpdates ? { updates: safeUpdates } : {}),
    runtimeVersion: {
      policy: "appVersion"
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
      ...extra,
      router: {},
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
      ...(Object.keys(safeEas).length > 0 ? { eas: safeEas } : {})
    }
  };
};
