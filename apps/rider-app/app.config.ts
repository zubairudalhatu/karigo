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
    slug: "karigo-rider",
    scheme: isStaging ? "karigo-rider-staging" : "karigo-rider",
    plugins: ["expo-router"],
    icon: "./assets/karigo-logo.png",
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
      eas: safeEas
    }
  };
};
