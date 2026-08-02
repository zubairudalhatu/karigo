import type { PartnerProfile } from "../api/partner.api";

export function isInactivePartnerProfile(profile: PartnerProfile | null) {
  if (!profile) return false;
  const status = profile.status.toUpperCase();
  return ["CLOSED", "INACTIVE", "SUSPENDED", "DELETED", "TRASHED", "ARCHIVED"].includes(status);
}

export function isDemoPartnerProfile(profile: PartnerProfile | null) {
  if (!profile) return false;
  return /demo|sample|test|seed|staging/i.test(`${profile.businessName} ${profile.email ?? ""}`);
}

export function partnerProfileWarning(profile: PartnerProfile | null) {
  if (isDemoPartnerProfile(profile)) {
    return {
      title: "Partner record requires confirmation",
      body: "This profile requires KariGO Admin confirmation before it can handle live orders or customer service requests."
    };
  }

  if (isInactivePartnerProfile(profile)) {
    return {
      title: "Partner profile is closed or inactive",
      body: "This account can sign in, but the linked Partner profile is not approved for live operations. Contact KariGO Admin before accepting or preparing orders."
    };
  }

  return null;
}
