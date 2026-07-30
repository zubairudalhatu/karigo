import Constants from "expo-constants";
import * as Updates from "expo-updates";

export type CustomerUpdateCheckResult = {
  status: "idle" | "checking" | "no-update" | "downloaded" | "unavailable" | "failed" | "skipped";
  message: string;
  checkedAt?: string;
};

export type CustomerUpdateDiagnostics = {
  appVersion: string;
  androidVersionCode: string;
  runtimeVersion: string;
  channel: string;
  updateId: string;
  createdAt: string;
  source: "embedded" | "downloaded OTA" | "unknown";
  apiHost: string;
  appEnvironment: string;
  task206lMarker: string;
  updateAvailable: boolean;
  recentlyDownloaded: boolean;
  lastCheckResult: string;
  lastCheckAt: string;
  lastUpdateError: string;
  emergencyLaunch: boolean;
};

const updateConstants = Updates as typeof Updates & {
  channel?: string | null;
  createdAt?: Date | string | null;
  emergencyLaunchReason?: string | null;
  isEmbeddedLaunch?: boolean | null;
  isEmergencyLaunch?: boolean | null;
  isEnabled?: boolean;
  runtimeVersion?: string | null;
  updateId?: string | null;
};

const blockedAutoUpdateRoutePrefixes = [
  "/checkout",
  "/profile/wallet",
  "/utilities",
  "/taxi/request",
  "/orders",
  "/auth",
  "/vendor",
  "/captain"
];

let autoCheckStarted = false;
let checkInFlight = false;
let updateAvailable = false;
let recentlyDownloaded = false;
let lastCheckResult = "Not checked in this session.";
let lastCheckAt = "";
let lastUpdateError = "";

function safeText(value: unknown, fallback = "Unavailable") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function safeDate(value: unknown) {
  if (!value) return "Unavailable";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toISOString();
}

function apiHostFromConfig() {
  const configured =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    Constants.expoConfig?.extra?.apiBaseUrl;
  try {
    return new URL(String(configured)).host;
  } catch {
    return "Unavailable";
  }
}

function safeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "Unknown update error");
  return raw
    .replace(/([?&](?:token|key|secret|signature|authorization)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]")
    .slice(0, 180);
}

export function isSensitiveCustomerUpdateRoute(pathname: string) {
  return blockedAutoUpdateRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function getCustomerUpdateDiagnostics(): CustomerUpdateDiagnostics {
  const expoExtra = Constants.expoConfig?.extra ?? {};
  const androidVersionCode =
    Constants.expoConfig?.android?.versionCode ??
    Constants.nativeBuildVersion ??
    "Unavailable";

  return {
    appVersion: safeText(Constants.expoConfig?.version ?? Constants.nativeAppVersion),
    androidVersionCode: safeText(androidVersionCode),
    runtimeVersion: safeText(updateConstants.runtimeVersion ?? expoExtra.runtimeVersion),
    channel: safeText(updateConstants.channel ?? expoExtra.updateChannel),
    updateId: safeText(updateConstants.updateId),
    createdAt: safeDate(updateConstants.createdAt),
    source: updateConstants.isEmbeddedLaunch === true
      ? "embedded"
      : updateConstants.isEmbeddedLaunch === false
        ? "downloaded OTA"
        : "unknown",
    apiHost: apiHostFromConfig(),
    appEnvironment: safeText(expoExtra.appEnvironment),
    task206lMarker: safeText(expoExtra.task206lVerificationMarker),
    updateAvailable,
    recentlyDownloaded,
    lastCheckResult,
    lastCheckAt,
    lastUpdateError,
    emergencyLaunch: Boolean(updateConstants.isEmergencyLaunch)
  };
}

export async function checkForCustomerUpdate(): Promise<CustomerUpdateCheckResult> {
  if (checkInFlight) {
    return { status: "checking", message: "An app update check is already running.", checkedAt: lastCheckAt };
  }
  if (updateConstants.isEnabled === false) {
    lastCheckAt = new Date().toISOString();
    lastCheckResult = "Expo Updates is not enabled in this environment.";
    updateAvailable = false;
    return { status: "unavailable", message: lastCheckResult, checkedAt: lastCheckAt };
  }

  checkInFlight = true;
  lastCheckAt = new Date().toISOString();
  lastCheckResult = "Checking for a compatible app update...";
  lastUpdateError = "";

  try {
    const check = await Updates.checkForUpdateAsync();
    updateAvailable = Boolean(check.isAvailable);
    if (!check.isAvailable) {
      recentlyDownloaded = false;
      lastCheckResult = "No compatible update is available.";
      return { status: "no-update", message: lastCheckResult, checkedAt: lastCheckAt };
    }

    const fetched = await Updates.fetchUpdateAsync();
    recentlyDownloaded = Boolean(fetched.isNew);
    lastCheckResult = fetched.isNew
      ? "A compatible update has been downloaded. Restart the app to apply it."
      : "The latest compatible update is already downloaded.";
    return { status: "downloaded", message: lastCheckResult, checkedAt: lastCheckAt };
  } catch (error) {
    updateAvailable = false;
    recentlyDownloaded = false;
    lastUpdateError = safeErrorMessage(error);
    lastCheckResult = "App update check failed safely.";
    return { status: "failed", message: lastUpdateError, checkedAt: lastCheckAt };
  } finally {
    checkInFlight = false;
  }
}

export async function checkForCustomerUpdateAtStartup(pathname: string) {
  if (autoCheckStarted) return { status: "skipped", message: "Startup update check already ran." } satisfies CustomerUpdateCheckResult;
  if (isSensitiveCustomerUpdateRoute(pathname)) {
    return { status: "skipped", message: "Startup update check skipped on a protected active workflow." } satisfies CustomerUpdateCheckResult;
  }
  autoCheckStarted = true;
  return checkForCustomerUpdate();
}

export async function reloadCustomerAppForUpdate() {
  if (!recentlyDownloaded) {
    lastCheckResult = "No downloaded update is waiting to be applied.";
    return { ready: false, message: lastCheckResult };
  }
  await Updates.reloadAsync();
  return { ready: true, message: "Restarting to apply the downloaded update." };
}
