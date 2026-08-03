import { createContext, ReactNode, useContext, useState } from "react";
import type { PreferredContactMethod, VendorApplicationCategory } from "../api/registration.api";

export type PartnerAccountType = "PRODUCT_SELLER" | "SERVICE_PROVIDER" | "BOTH";

export interface PartnerRegistrationState {
  fullName: string;
  phoneNumber: string;
  email: string;
  otp: string;
  password: string;
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
  privacyAccepted: boolean;
  contactConsentAccepted: boolean;
  applicationReference: string;
}

const initialRegistration: PartnerRegistrationState = {
  fullName: "",
  phoneNumber: "",
  email: "",
  otp: "",
  password: "",
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

  return (
    <RegistrationContext.Provider
      value={{
        registration,
        updateRegistration: (patch) => setRegistration((current) => ({ ...current, ...patch })),
        hydrateRegistration: (nextState) => setRegistration((current) => ({ ...current, ...nextState })),
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
