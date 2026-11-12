import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { partnerDraft } from "@karigo/shared-types";
import { useAuth } from "./auth-context";
import type { PreferredContactMethod, VendorApplicationCategory } from "../api/registration.api";

export type PartnerAccountType = "PRODUCT_SELLER" | "SERVICE_PROVIDER" | "BOTH";

export interface PartnerRegistrationState {
  fullName: string;
  phoneNumber: string;
  email: string;
  verificationTicket: string;
  accountType: PartnerAccountType;
  businessCategory: VendorApplicationCategory;
  businessName: string;
  tradingName: string;
  businessDescription: string;
  businessAddress: string;
  city: "Kano" | "Abuja";
  state: "Kano" | "FCT";
  area: string;
  serviceAreas: string;
  operatingHours: string;
  businessPhoneNumber: string;
  businessEmail: string;
  websiteOrSocialLink: string;
  contactFullName: string;
  contactRole: string;
  contactPhoneNumber: string;
  contactEmail: string;
  preferredContactMethod: PreferredContactMethod;
  deliveryReadiness: string;
  deliveryPreference: string;
  averagePreparationTime: string;
  numberOfStaff: string;
  catalogueCategory: string;
  estimatedCatalogueSize: string;
  existingDelivery: string;
  businessRegistrationNumber: string;
  businessRegistrationDocumentReady: boolean;
  identityDocumentReady: boolean;
  serviceEvidenceReady: boolean;
  declarationAccepted: boolean;
  commercialPolicyId: string;
  commercialTermsVersion: string;
  commercialTermsAccepted: boolean;
  privacyAccepted: boolean;
  contactConsentAccepted: boolean;
  applicationReference: string;
}

const initialRegistration: PartnerRegistrationState = {
  fullName: "",
  phoneNumber: "",
  email: "",
  verificationTicket: "",
  accountType: "PRODUCT_SELLER",
  businessCategory: "RESTAURANT",
  businessName: "",
  tradingName: "",
  businessDescription: "",
  businessAddress: "",
  city: "Kano",
  state: "Kano",
  area: "",
  serviceAreas: "",
  operatingHours: "",
  businessPhoneNumber: "",
  businessEmail: "",
  websiteOrSocialLink: "",
  contactFullName: "",
  contactRole: "Owner/Manager",
  contactPhoneNumber: "",
  contactEmail: "",
  preferredContactMethod: "PHONE",
  deliveryReadiness: "",
  deliveryPreference: "",
  averagePreparationTime: "",
  numberOfStaff: "",
  catalogueCategory: "",
  estimatedCatalogueSize: "",
  existingDelivery: "",
  businessRegistrationNumber: "",
  businessRegistrationDocumentReady: false,
  identityDocumentReady: false,
  serviceEvidenceReady: false,
  declarationAccepted: false,
  commercialPolicyId: "",
  commercialTermsVersion: "",
  commercialTermsAccepted: false,
  privacyAccepted: false,
  contactConsentAccepted: false,
  applicationReference: ""
};

interface RegistrationContextValue {
  registration: PartnerRegistrationState;
  updateRegistration(patch: Partial<PartnerRegistrationState>): void;
  hydrateRegistration(nextState: Partial<PartnerRegistrationState>): void;
  resetRegistration(): void;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

export function PartnerRegistrationProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<PartnerRegistrationState>(initialRegistration);
  const { user } = useAuth();
  useEffect(() => { setRegistration(initialRegistration); }, [user?.id]);

  return (
    <RegistrationContext.Provider
      value={{
        registration,
        updateRegistration: (patch) => setRegistration((current) => ({ ...current, ...patch })),
        hydrateRegistration: (nextState) => setRegistration((current) => {
          const draft = partnerDraft(nextState);
          return { ...current, ...draft,
            accountType: draft.accountType === "PRODUCT_SELLER" || draft.accountType === "SERVICE_PROVIDER" || draft.accountType === "BOTH" ? draft.accountType : current.accountType,
            businessCategory: nextState.businessCategory && ["RESTAURANT", "GROCERIES", "MARKET_ITEMS", "PHARMACY", "PARCEL_LOGISTICS_PARTNER", "SME_SERVICES", "OTHER_MARKETPLACE_VENDOR"].includes(nextState.businessCategory) ? nextState.businessCategory : current.businessCategory,
            city: draft.city === "Kano" || draft.city === "Abuja" ? draft.city : current.city,
            state: draft.state === "Kano" || draft.state === "FCT" ? draft.state : current.state,
            preferredContactMethod: draft.preferredContactMethod === "PHONE" || draft.preferredContactMethod === "EMAIL" || draft.preferredContactMethod === "WHATSAPP" ? draft.preferredContactMethod : current.preferredContactMethod
          };
        }),
        resetRegistration: () => setRegistration(initialRegistration)
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export function usePartnerRegistration() {
  const value = useContext(RegistrationContext);
  if (!value) throw new Error("usePartnerRegistration must be used inside PartnerRegistrationProvider");
  return value;
}
