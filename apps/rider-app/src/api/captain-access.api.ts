import { api } from "./client";
import type { DeliveryCaptainApplicationStatus } from "./delivery-captain-applications.api";
import type { RiderProfile } from "./rider.api";
import type { TaxiDriverApplicationStatus } from "@karigo/shared-types";

export type CaptainOperationalMode = "DELIVERY_CAPTAIN" | "RIDE_CAPTAIN";
export type CaptainAccessNextStep = "START_APPLICATION" | "APPLICATION_STATUS" | "OPEN_DASHBOARD";

export interface CaptainAccess {
  account: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string | null;
    role: string;
    accountStatus: string;
    phoneVerified: boolean;
    profilePhotoUrl?: string | null;
  };
  supportedOnboardingModes: CaptainOperationalMode[];
  deliveryCaptainApplication: (DeliveryCaptainApplicationStatus & { exists: true }) | {
    exists: false;
    nextStep: "SUBMIT_APPLICATION";
    message: string;
  };
  rideCaptainApplication: (TaxiDriverApplicationStatus & { exists: true }) | {
    exists: false;
    nextStep: "SUBMIT_APPLICATION";
    message: string;
  };
  deliveryCaptainProfile: (Pick<RiderProfile, "id" | "riderCode" | "verificationStatus" | "availabilityStatus" | "totalDeliveries"> & {
    operationalAccess: boolean;
    createdAt: string;
    updatedAt: string;
  }) | null;
  rideCaptainProfile: {
    id: string;
    applicationId?: string | null;
    fullName: string;
    phoneNumber: string;
    city: string;
    state: string;
    vehicle?: string | null;
    vehicleColour?: string | null;
    vehiclePlateNumber?: string | null;
    vehicleType?: string | null;
    status: string;
    isAvailableForTaxi: boolean;
    operationalAccess: boolean;
    lastSeenAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  operationalModes: CaptainOperationalMode[];
  nextStep: CaptainAccessNextStep;
  nextRoute: "/auth/apply" | "/tabs/dashboard";
  message: string;
}

export const captainAccessApi = {
  resolve: () => api.get<CaptainAccess>("captain/access")
};
