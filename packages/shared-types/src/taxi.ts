export const taxiApplicationStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "PROVISIONALLY_APPROVED",
  "APPROVED",
  "REJECTED"
] as const;
export type TaxiApplicationStatus = (typeof taxiApplicationStatuses)[number];

export const taxiWaitlistStatuses = [
  "SUBMITTED",
  "CONTACTED",
  "INTERESTED",
  "NOT_INTERESTED",
  "CONVERTED"
] as const;
export type TaxiWaitlistStatus = (typeof taxiWaitlistStatuses)[number];

export const taxiVehicleTypes = ["SEDAN", "SUV", "MINI_BUS", "TRICYCLE", "OTHER"] as const;
export type TaxiVehicleType = (typeof taxiVehicleTypes)[number];

export const taxiVehicleOwnershipTypes = ["OWNER", "LEASED", "COMPANY_ASSIGNED", "OTHER"] as const;
export type TaxiVehicleOwnership = (typeof taxiVehicleOwnershipTypes)[number];

export interface TaxiWaitlistInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  city: string;
  state: string;
  pickupArea?: string;
  note?: string;
}

export interface TaxiWaitlistEntry {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  city: string;
  state: string;
  pickupArea?: string | null;
  note?: string | null;
  status: TaxiWaitlistStatus;
  createdAt: string;
  updatedAt?: string;
  readinessOnly?: true;
}

export interface TaxiDriverApplicationInput {
  fullName: string;
  phoneNumber: string;
  email?: string;
  city: string;
  state: string;
  address?: string;
  driverLicenceNumber?: string;
  driverLicenceExpiry?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColour?: string;
  vehiclePlateNumber?: string;
  vehicleType?: TaxiVehicleType;
  vehicleOwnership?: TaxiVehicleOwnership;
  notes?: string;
}

export interface TaxiDriverApplicationStatus {
  applicationReference: string;
  fullName: string;
  phoneNumber: string;
  status: TaxiApplicationStatus;
  applicantVisibleNote?: string | null;
  message: string;
  submittedAt: string;
  reviewedAt?: string | null;
  readinessOnly: true;
}

export const taxiDriverProfileStatuses = ["PENDING_ACTIVATION", "ACTIVE_TEST", "SUSPENDED", "DEACTIVATED"] as const;
export type TaxiDriverProfileStatus = (typeof taxiDriverProfileStatuses)[number];

export const taxiTripStatuses = [
  "REQUESTED",
  "DRIVER_ASSIGNED",
  "ACCEPTED",
  "ARRIVED_PICKUP",
  "STARTED",
  "ARRIVED_DESTINATION",
  "COMPLETED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_DRIVER",
  "CANCELLED_BY_ADMIN",
  "EXPIRED"
] as const;
export type TaxiTripStatus = (typeof taxiTripStatuses)[number];

export interface TaxiFareEstimateInput {
  pickupAddress: string;
  destinationAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
}

export interface TaxiFareEstimate {
  pickupAddress: string;
  destinationAddress: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedFareKobo: number;
  currency: "NGN";
  testModeNotice: string;
}

export interface TaxiTripInput extends TaxiFareEstimateInput {
  customerNote?: string;
}

export interface TaxiDriverProfile {
  id: string;
  userId?: string | null;
  applicationId?: string | null;
  fullName: string;
  phoneNumber: string;
  city: string;
  state: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  vehicleColour?: string | null;
  vehiclePlateNumber?: string | null;
  vehicleType?: TaxiVehicleType | null;
  status: TaxiDriverProfileStatus;
  isAvailableForTaxi: boolean;
  lastKnownLatitude?: unknown;
  lastKnownLongitude?: unknown;
  lastSeenAt?: string | null;
  testModeOnly: true;
}

export interface TaxiTrip {
  id: string;
  tripReference: string;
  pickupAddress: string;
  destinationAddress: string;
  estimatedDistanceKm?: unknown;
  estimatedDurationMin?: number | null;
  estimatedFareKobo: number;
  finalFareKobo?: number | null;
  status: TaxiTripStatus;
  tripPinLastFour?: string | null;
  tripPin?: string;
  cancellationReason?: string | null;
  customerNote?: string | null;
  driverNote?: string | null;
  isTestMode: boolean;
  requestedAt: string;
  acceptedAt?: string | null;
  arrivedAtPickupAt?: string | null;
  startedAt?: string | null;
  arrivedAtDestinationAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  driver?: TaxiDriverProfile | null;
  events?: Array<{
    id: string;
    actorType: "CUSTOMER" | "DRIVER" | "ADMIN" | "SYSTEM";
    actorId?: string | null;
    eventType: string;
    note?: string | null;
    createdAt: string;
  }>;
  testModeNotice: string;
}
