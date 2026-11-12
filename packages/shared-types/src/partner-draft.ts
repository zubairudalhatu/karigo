/** Business draft contract. Authentication material has no representation here. */
export const partnerDraftTextFields = [
  "fullName", "phoneNumber", "email", "accountType", "businessCategory", "businessName", "tradingName",
  "businessDescription", "businessAddress", "city", "state", "area", "serviceAreas", "operatingHours",
  "businessPhoneNumber", "businessEmail", "websiteOrSocialLink", "contactFullName", "contactRole",
  "contactPhoneNumber", "contactEmail", "preferredContactMethod", "deliveryReadiness", "deliveryPreference",
  "averagePreparationTime", "numberOfStaff", "catalogueCategory", "estimatedCatalogueSize", "existingDelivery",
  "businessRegistrationNumber", "commercialPolicyId", "commercialTermsVersion"
] as const;
export const partnerDraftBooleanFields = [
  "businessRegistrationDocumentReady", "identityDocumentReady", "serviceEvidenceReady", "declarationAccepted",
  "commercialTermsAccepted", "privacyAccepted", "contactConsentAccepted"
] as const;
export type PartnerDraft = Partial<Record<typeof partnerDraftTextFields[number], string> & Record<typeof partnerDraftBooleanFields[number], boolean>>;

export function partnerDraft(input: unknown, rejectUnknown = false): PartnerDraft {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid business draft.");
  const source = input as Record<string, unknown>;
  const allowed = new Set<string>([...partnerDraftTextFields, ...partnerDraftBooleanFields]);
  if (rejectUnknown && Object.keys(source).some(key => !allowed.has(key))) throw new Error("Unsupported business draft field.");
  const result: Record<string, string | boolean> = {};
  for (const key of partnerDraftTextFields) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (typeof source[key] !== "string" || source[key].length > (key === "businessDescription" ? 4000 : 1000)) {
      if (rejectUnknown) throw new Error("Invalid business draft field.");
      continue;
    }
    result[key] = source[key];
  }
  for (const key of partnerDraftBooleanFields) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (typeof source[key] !== "boolean") {
      if (rejectUnknown) throw new Error("Invalid business draft field.");
      continue;
    }
    result[key] = source[key];
  }
  return result;
}
