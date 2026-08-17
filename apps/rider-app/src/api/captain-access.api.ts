import { api } from "./client";
import type {
  CaptainCurrentProfileLocation,
  CaptainLocationSummary,
  CaptainOperatingAreaSummary,
  DeliveryCaptainApplicationStatus
} from "./delivery-captain-applications.api";
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
  currentGpsArea?: CaptainOperatingAreaSummary | null;
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
    phoneNumber?: string | null;
    photoUrl?: string | null;
    vehicleType?: string | null;
    plateNumber?: string | null;
    licenseNumber?: string | null;
    currentLatitude?: string | number | null;
    currentLongitude?: string | number | null;
    currentLocationUpdatedAt?: string | null;
    preferredServiceAreas?: string[] | null;
    approvedOperatingAreas?: CaptainOperatingAreaSummary[];
    primaryOperatingArea?: CaptainOperatingAreaSummary | null;
    residentialLocation?: CaptainLocationSummary | null;
    currentGpsArea?: CaptainOperatingAreaSummary | null;
    operatingAreasRequireReview?: boolean;
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
    vehicleMake?: string | null;
    vehicleMakeLabel?: string | null;
    vehicleModel?: string | null;
    vehicleModelLabel?: string | null;
    vehicleColour?: string | null;
    vehicleColourLabel?: string | null;
    vehiclePlateNumber?: string | null;
    vehicleType?: string | null;
    vehicleTypeLabel?: string | null;
    status: string;
    isAvailableForTaxi: boolean;
    approvedOperatingAreas?: CaptainOperatingAreaSummary[];
    primaryOperatingArea?: CaptainOperatingAreaSummary | null;
    residentialLocation?: CaptainLocationSummary | null;
    currentGpsArea?: CaptainOperatingAreaSummary | null;
    operatingAreasRequireReview?: boolean;
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

export type CaptainApplicationWithLocation = {
  residentialLocation?: CaptainLocationSummary | null;
  operatingAreas?: CaptainOperatingAreaSummary[];
  primaryOperatingArea?: CaptainOperatingAreaSummary | null;
  currentProfileLocation?: CaptainCurrentProfileLocation | null;
  pilotCity?: string | null;
};

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
