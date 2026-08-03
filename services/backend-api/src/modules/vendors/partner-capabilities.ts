import { AccountStatus, VendorApplicationStatus, VendorStatus } from "@prisma/client";

export type PartnerType = "PRODUCT_SELLER" | "SERVICE_PROVIDER" | "BOTH";

export interface PartnerCapabilitySource {
  businessCategory?: string | null;
  businessType?: string | null;
  catalogueCategory?: string | null;
  status?: string | null;
}

export interface PartnerCapabilityVendor {
  id?: string | null;
  status?: string | null;
  deletedAt?: Date | string | null;
  businessCategory?: string | null;
  sourceApplication?: PartnerCapabilitySource | null;
  user?: {
    accountStatus?: string | null;
    deletedAt?: Date | string | null;
  } | null;
}

export interface PartnerCapabilities {
  vendorId: string | null;
  partnerType: PartnerType | null;
  profileStatus: string | null;
  operationalStatus: string;
  canAccessWorkspace: boolean;
  canManageProducts: boolean;
  canManageServices: boolean;
  message: string;
}

const productCategories = new Set(["RESTAURANT", "GROCERIES", "MARKET_ITEMS", "OTHER_MARKETPLACE_VENDOR", "PHARMACY", "PARCEL_LOGISTICS_PARTNER"]);
const serviceCategories = new Set(["SME_SERVICES", "SERVICE_PROVIDER"]);

function normalized(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}

function words(value?: string | null) {
  return normalized(value).replace(/[_-]+/g, " ");
}

function sourceText(vendor: PartnerCapabilityVendor, application?: PartnerCapabilitySource | null) {
  const source = application ?? vendor.sourceApplication;
  return [
    vendor.businessCategory,
    source?.businessCategory,
    source?.businessType,
    source?.catalogueCategory
  ].map(words).filter(Boolean).join(" ");
}

export function resolvePartnerType(vendor: PartnerCapabilityVendor, application?: PartnerCapabilitySource | null): PartnerType {
  const source = application ?? vendor.sourceApplication;
  const text = sourceText(vendor, source);
  const explicitBoth = text.includes("BOTH") || (text.includes("PRODUCT") && text.includes("SERVICE"));
  if (explicitBoth) return "BOTH";

  const categoryValues = [
    normalized(vendor.businessCategory),
    normalized(source?.businessCategory),
    normalized(source?.catalogueCategory)
  ];
  const serviceByCategory = categoryValues.some((value) => serviceCategories.has(value));
  const serviceByText = text.includes("SERVICE PROVIDER") || text.includes("SME SERVICES");
  if (serviceByCategory || serviceByText) return "SERVICE_PROVIDER";

  const productByCategory = categoryValues.some((value) => productCategories.has(value));
  const productByText = text.includes("PRODUCT SELLER") || text.includes("MARKETPLACE") || text.includes("RESTAURANT");
  return productByCategory || productByText ? "PRODUCT_SELLER" : "PRODUCT_SELLER";
}

export function resolvePartnerCapabilities(
  vendor: PartnerCapabilityVendor | null | undefined,
  application?: PartnerCapabilitySource | null
): PartnerCapabilities {
  if (!vendor?.id) {
    const appStatus = application?.status ?? null;
    const message = appStatus === VendorApplicationStatus.SUBMITTED || appStatus === VendorApplicationStatus.UNDER_REVIEW
      ? "Your Partner application is still under review."
      : appStatus === VendorApplicationStatus.CHANGES_REQUESTED
        ? "KariGO requested changes on your Partner application."
        : appStatus === VendorApplicationStatus.REJECTED
          ? "Your Partner application was not approved."
          : "No active Partner profile is linked to this KariGO account.";
    return {
      vendorId: null,
      partnerType: application ? resolvePartnerType({}, application) : null,
      profileStatus: null,
      operationalStatus: appStatus ?? "NO_PARTNER_PROFILE",
      canAccessWorkspace: false,
      canManageProducts: false,
      canManageServices: false,
      message
    };
  }

  const partnerType = resolvePartnerType(vendor, application);
  const accountActive = vendor.user?.accountStatus === AccountStatus.ACTIVE && !vendor.user?.deletedAt;
  const profileActive = vendor.status === VendorStatus.ACTIVE && !vendor.deletedAt;
  const canAccessWorkspace = Boolean(accountActive && profileActive);
  const profileStatus = vendor.status ?? null;
  const operationalStatus = canAccessWorkspace
    ? "ACTIVE"
    : vendor.deletedAt
      ? "DELETED"
      : vendor.status === VendorStatus.SUSPENDED
        ? "SUSPENDED"
        : vendor.status === VendorStatus.CLOSED
          ? "CLOSED"
          : vendor.status === VendorStatus.PENDING_APPROVAL
            ? "ACTIVATION_PENDING"
            : accountActive
              ? profileStatus ?? "UNKNOWN"
              : "ACCOUNT_INACTIVE";

  const message = canAccessWorkspace
    ? "Partner Workspace access is active."
    : operationalStatus === "SUSPENDED"
      ? "This Partner profile is suspended. Contact KariGO support."
      : operationalStatus === "CLOSED" || operationalStatus === "DELETED"
        ? "This Partner profile is closed. Contact KariGO support."
        : operationalStatus === "ACTIVATION_PENDING"
          ? "Partner activation is pending."
          : "This KariGO account is not active for Partner Workspace access.";

  return {
    vendorId: vendor.id,
    partnerType,
    profileStatus,
    operationalStatus,
    canAccessWorkspace,
    canManageProducts: canAccessWorkspace && (partnerType === "PRODUCT_SELLER" || partnerType === "BOTH"),
    canManageServices: canAccessWorkspace && (partnerType === "SERVICE_PROVIDER" || partnerType === "BOTH"),
    message
  };
}
