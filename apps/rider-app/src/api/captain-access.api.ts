import { api } from "./client";
import type { DeliveryCaptainApplicationStatus } from "./delivery-captain-applications.api";
import type { RiderProfile } from "./rider.api";
import type { TaxiDriverApplicationStatus } from "@karigo/shared-types";

export type CaptainOperationalMode = "DELIVERY_CAPTAIN" | "RIDE_CAPTAIN";
export type CaptainAccessNextStep = "START_APPLICATION" | "APPLICATION_STATUS" | "ACTIVATION_STATUS" | "OPEN_DASHBOARD";
export type CaptainWorkMode = "DELIVERY" | "RIDE" | null;
export type CaptainWorkLockStage = "OFFERED" | "ASSIGNED" | "ACCEPTED" | "IN_PROGRESS" | null;
export type CaptainAvailabilityReasonCode =
  | "AVAILABLE"
  | "APPLICATION_NOT_APPROVED"
  | "ACTIVATION_PENDING"
  | "PROFILE_INACTIVE"
  | "LOCATION_STALE"
  | "ACTIVE_DELIVERY_LOCK"
  | "ACTIVE_RIDE_LOCK"
  | "SUSPENDED";

export interface CaptainWorkState {
  desiredDeliveryOnline: boolean;
  desiredRideOnline: boolean;
  effectiveDeliveryOnline: boolean;
  effectiveRideOnline: boolean;
  activeWorkMode: CaptainWorkMode;
  activeWorkReference?: string | null;
  activeDeliveryAssignmentId?: string | null;
  activeRideTripId?: string | null;
  lockStage: CaptainWorkLockStage;
  lockedAt?: string | null;
  lastAvailabilityChangeAt?: string | null;
  lastLocationAt?: string | null;
  deliveryEligibility: { eligible: boolean; reasonCode?: CaptainAvailabilityReasonCode; reason?: string | null };
  rideEligibility: { eligible: boolean; reasonCode?: CaptainAvailabilityReasonCode; reason?: string | null };
}

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
    lastKnownLatitude?: string | number | null;
    lastKnownLongitude?: string | number | null;
    lastSeenAt?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  operationalModes: CaptainOperationalMode[];
  nextStep: CaptainAccessNextStep;
  nextRoute: "/auth/apply" | "/application-status" | "/tabs/dashboard";
  message: string;
}

export const captainAccessApi = {
  resolve: () => api.get<CaptainAccess>("captain/access"),
  workState: () => api.get<CaptainWorkState>("captain/work-state"),
  updateAvailability: (body: {
    deliveryOnline?: boolean;
    rideOnline?: boolean;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number | null;
  }) => api.patch<CaptainWorkState>("captain/availability", body)
};
