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
