export const ANALYTICS_CONSENT_VERSION = 1 as const;
export const ANALYTICS_CONSENT_STORAGE_KEY = "karigo_analytics_consent";
export const ANALYTICS_CONSENT_OPEN_EVENT = "karigo:open-cookie-settings";
export const CANONICAL_ANALYTICS_ORIGIN = "https://karigo.com.ng";

export type AnalyticsConsentChoice = "accepted" | "rejected";

export type AnalyticsConsentRecord = {
  version: typeof ANALYTICS_CONSENT_VERSION;
  analytics: AnalyticsConsentChoice;
};

export function createGtagCommandQueue(dataLayer: unknown[]) {
  return function gtag() {
    dataLayer.push(arguments);
  };
}

type Placement = "header" | "hero" | "content" | "footer" | "download_section" | "navigation";
type FormVariant = "public_website";
type CaptainType = "delivery" | "ride";
type AppTarget = "customer_android";
type InquiryCategory = "customer" | "vendor" | "captain" | "sme" | "general";
type CtaId =
  | "download_customer_app"
  | "become_partner"
  | "partner_workspace"
  | "captain_details"
  | "ride_waitlist"
  | "apply_vendor";
type DestinationId = "google_play" | "partner_workspace" | "customer_app" | "vendor_application" | "captain_application";

export type AnalyticsEventParameters = {
  contact_submit: { source_path: string; inquiry_category: InquiryCategory };
  vendor_application_start: { source_path: string; form_variant: FormVariant };
  vendor_application_submit: { source_path: string; form_variant: FormVariant };
  captain_application_start: { source_path: string; captain_type: CaptainType; form_variant: FormVariant };
  captain_application_submit: { source_path: string; captain_type: CaptainType; form_variant: FormVariant };
  sme_application_start: { source_path: string; form_variant: FormVariant };
  sme_application_submit: { source_path: string; form_variant: FormVariant };
  google_play_click: { source_path: string; placement: Placement; app_target: AppTarget };
  partner_workspace_click: { source_path: string; placement: Placement };
  customer_app_entry: { source_path: string; placement: Placement };
  primary_cta_click: { source_path: string; placement: Placement; cta_id: CtaId; destination_id: DestinationId };
};

export type AnalyticsEventName = keyof AnalyticsEventParameters;

type ParameterRule = { kind: "path" } | { kind: "enum"; values: readonly string[] };
type EventRule = { required: readonly string[]; parameters: Readonly<Record<string, ParameterRule>> };

const placements: readonly Placement[] = ["header", "hero", "content", "footer", "download_section", "navigation"];
const formVariants: readonly FormVariant[] = ["public_website"];
const captainTypes: readonly CaptainType[] = ["delivery", "ride"];
const appTargets: readonly AppTarget[] = ["customer_android"];
const inquiryCategories: readonly InquiryCategory[] = ["customer", "vendor", "captain", "sme", "general"];
const ctaIds: readonly CtaId[] = [
  "download_customer_app",
  "become_partner",
  "partner_workspace",
  "captain_details",
  "ride_waitlist",
  "apply_vendor"
];
const destinationIds: readonly DestinationId[] = [
  "google_play",
  "partner_workspace",
  "customer_app",
  "vendor_application",
  "captain_application"
];

const pathRule: ParameterRule = { kind: "path" };
const enumRule = (values: readonly string[]): ParameterRule => ({ kind: "enum", values });

const eventRules: Readonly<Record<AnalyticsEventName, EventRule>> = {
  contact_submit: {
    required: ["source_path", "inquiry_category"],
    parameters: { source_path: pathRule, inquiry_category: enumRule(inquiryCategories) }
  },
  vendor_application_start: {
    required: ["source_path", "form_variant"],
    parameters: { source_path: pathRule, form_variant: enumRule(formVariants) }
  },
  vendor_application_submit: {
    required: ["source_path", "form_variant"],
    parameters: { source_path: pathRule, form_variant: enumRule(formVariants) }
  },
  captain_application_start: {
    required: ["source_path", "captain_type", "form_variant"],
    parameters: { source_path: pathRule, captain_type: enumRule(captainTypes), form_variant: enumRule(formVariants) }
  },
  captain_application_submit: {
    required: ["source_path", "captain_type", "form_variant"],
    parameters: { source_path: pathRule, captain_type: enumRule(captainTypes), form_variant: enumRule(formVariants) }
  },
  sme_application_start: {
    required: ["source_path", "form_variant"],
    parameters: { source_path: pathRule, form_variant: enumRule(formVariants) }
  },
  sme_application_submit: {
    required: ["source_path", "form_variant"],
    parameters: { source_path: pathRule, form_variant: enumRule(formVariants) }
  },
  google_play_click: {
    required: ["source_path", "placement", "app_target"],
    parameters: { source_path: pathRule, placement: enumRule(placements), app_target: enumRule(appTargets) }
  },
  partner_workspace_click: {
    required: ["source_path", "placement"],
    parameters: { source_path: pathRule, placement: enumRule(placements) }
  },
  customer_app_entry: {
    required: ["source_path", "placement"],
    parameters: { source_path: pathRule, placement: enumRule(placements) }
  },
  primary_cta_click: {
    required: ["source_path", "placement", "cta_id", "destination_id"],
    parameters: {
      source_path: pathRule,
      placement: enumRule(placements),
      cta_id: enumRule(ctaIds),
      destination_id: enumRule(destinationIds)
    }
  }
};

const MAX_PARAMETER_LENGTH = 96;
const explicitlySensitiveKey = /(?:^|_)(?:name|email|phone|address|message|text|payment|transaction|reference|token|otp|user|account|record|document|filename|content)(?:_|$)/i;

export class AnalyticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsValidationError";
  }
}

export function parseAnalyticsConsent(value: string | null): AnalyticsConsentRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AnalyticsConsentRecord>;
    if (parsed.version !== ANALYTICS_CONSENT_VERSION) return null;
    if (parsed.analytics !== "accepted" && parsed.analytics !== "rejected") return null;
    return { version: ANALYTICS_CONSENT_VERSION, analytics: parsed.analytics };
  } catch {
    return null;
  }
}

export function serializeAnalyticsConsent(choice: AnalyticsConsentChoice) {
  return JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, analytics: choice } satisfies AnalyticsConsentRecord);
}

export function normalizeAnalyticsPath(input: string) {
  let pathname = "/";
  try {
    pathname = new URL(input || "/", CANONICAL_ANALYTICS_ORIGIN).pathname;
  } catch {
    pathname = "/";
  }
  pathname = pathname.replace(/\/{2,}/g, "/");
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname.length > 1) pathname = pathname.replace(/\/$/, "");
  return pathname;
}

export function sanitizePageLocation(input: string) {
  return `${CANONICAL_ANALYTICS_ORIGIN}${normalizeAnalyticsPath(input)}`;
}

export function sanitizeInternalReferrer(input: string | null | undefined) {
  if (!input) return undefined;
  try {
    const referrer = new URL(input, CANONICAL_ANALYTICS_ORIGIN);
    if (referrer.origin !== CANONICAL_ANALYTICS_ORIGIN) return undefined;
    return sanitizePageLocation(referrer.pathname);
  } catch {
    return undefined;
  }
}

const excludedExactPaths = new Set(["/app", "/payment/flutterwave/return"]);
const excludedSegments = new Set([
  "auth",
  "callback",
  "forgot-password",
  "login",
  "oauth",
  "reset-password",
  "signup",
  "token",
  "verify"
]);

export function isAnalyticsRouteAllowed(input: string) {
  const pathname = normalizeAnalyticsPath(input);
  if (excludedExactPaths.has(pathname) || pathname.startsWith("/app/")) return false;
  if (pathname.startsWith("/payment/")) return false;
  if (/^\/careers\/[^/]+\/apply$/.test(pathname)) return false;
  const segments = pathname.toLowerCase().split("/").filter(Boolean);
  return !segments.some((segment) => excludedSegments.has(segment));
}

export function isValidMeasurementId(value: string | null | undefined) {
  return /^G-[A-Z0-9]{6,20}$/.test(value?.trim() ?? "");
}

export function isAnalyticsRuntimeEligible({
  environment,
  isAutomatedTest,
  measurementId,
  consent,
  pathname
}: {
  environment: string | undefined;
  isAutomatedTest: boolean;
  measurementId: string | null | undefined;
  consent: AnalyticsConsentChoice | null;
  pathname: string;
}) {
  return environment === "production"
    && !isAutomatedTest
    && isValidMeasurementId(measurementId)
    && consent === "accepted"
    && isAnalyticsRouteAllowed(pathname);
}

export function nextCanonicalPageView(previousPath: string | null, candidatePath: string) {
  if (!isAnalyticsRouteAllowed(candidatePath)) return null;
  const normalized = normalizeAnalyticsPath(candidatePath);
  return previousPath === normalized ? null : normalized;
}

export function prepareAnalyticsEvent(name: string, parameters: unknown) {
  if (!Object.prototype.hasOwnProperty.call(eventRules, name)) {
    throw new AnalyticsValidationError(`Analytics event is not allowlisted: ${name}`);
  }
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    throw new AnalyticsValidationError("Analytics parameters must be a plain object");
  }

  const rule = eventRules[name as AnalyticsEventName];
  const entries = Object.entries(parameters as Record<string, unknown>);
  const safe: Record<string, string> = {};

  for (const [key, value] of entries) {
    const parameterRule = rule.parameters[key];
    if (!parameterRule) {
      const reason = explicitlySensitiveKey.test(key) ? "sensitive" : "unknown";
      throw new AnalyticsValidationError(`Rejected ${reason} analytics parameter: ${key}`);
    }
    if (typeof value !== "string") {
      throw new AnalyticsValidationError(`Analytics parameter must be a string: ${key}`);
    }
    if (value.length === 0 || value.length > MAX_PARAMETER_LENGTH) {
      throw new AnalyticsValidationError(`Analytics parameter has invalid length: ${key}`);
    }
    if (parameterRule.kind === "enum" && !parameterRule.values.includes(value)) {
      throw new AnalyticsValidationError(`Analytics parameter is outside its allowlist: ${key}`);
    }
    safe[key] = parameterRule.kind === "path" ? normalizeAnalyticsPath(value) : value;
  }

  for (const required of rule.required) {
    if (!Object.prototype.hasOwnProperty.call(safe, required)) {
      throw new AnalyticsValidationError(`Missing required analytics parameter: ${required}`);
    }
  }

  return { name: name as AnalyticsEventName, parameters: safe };
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __KARIGO_ANALYTICS_READY__?: boolean;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export function trackAnalyticsEvent<K extends AnalyticsEventName>(name: K, parameters: AnalyticsEventParameters[K]) {
  if (typeof window === "undefined" || !window.__KARIGO_ANALYTICS_READY__ || typeof window.gtag !== "function") {
    return false;
  }
  try {
    const prepared = prepareAnalyticsEvent(name, parameters);
    window.gtag("event", prepared.name, prepared.parameters);
    return true;
  } catch {
    return false;
  }
}
