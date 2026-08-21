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
  residentialStateCode?: string;
  residentialCityCode?: string;
  operatingAreaIds?: string[];
  primaryOperatingAreaId?: string;
  address: string;
  driverLicenceNumber: string;
  driverLicenceDocumentUrl?: string;
  driverLicenceExpiry: string;
  vehicleMake: string;
  vehicleCustomMake?: string;
  vehicleModel: string;
  vehicleCustomModel?: string;
  vehicleYear: number;
  vehicleColour: string;
  vehicleCustomColour?: string;
  vehiclePlateNumber: string;
  vehicleType: TaxiVehicleType;
  vehicleOwnership: TaxiVehicleOwnership;
  vehicleParticularsDocumentUrl?: string;
  insuranceDocumentUrl?: string;
  documentIds?: string[];
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
  documentReview?: {
    stage: "DOCUMENTS_MISSING" | "DOCUMENTS_RECEIVED" | "DOCUMENTS_UNDER_REVIEW" | "CHANGES_REQUESTED" | "DOCUMENTS_APPROVED";
    message: string;
    requiredDocumentTypes: string[];
    missingRequiredDocumentTypes: string[];
    pendingRequiredDocumentTypes: string[];
    changesRequestedRequiredDocumentTypes: string[];
    rejectedRequiredDocumentTypes: string[];
    requiredDocumentsApproved: boolean;
    approvalReviewIncomplete: boolean;
  };
  readinessOnly: true;
}

export const taxiDriverProfileStatuses = ["PENDING_ACTIVATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
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

export const activeTaxiTripStatuses = [
  "REQUESTED",
  "DRIVER_ASSIGNED",
  "ACCEPTED",
  "ARRIVED_PICKUP",
  "STARTED",
  "ARRIVED_DESTINATION"
] as const satisfies readonly TaxiTripStatus[];

export const terminalTaxiTripStatuses = [
  "COMPLETED",
  "CANCELLED_BY_CUSTOMER",
  "CANCELLED_BY_DRIVER",
  "CANCELLED_BY_ADMIN",
  "EXPIRED"
] as const satisfies readonly TaxiTripStatus[];

export const customerCancellableTaxiTripStatuses = [
  "REQUESTED",
  "DRIVER_ASSIGNED",
  "ACCEPTED"
] as const satisfies readonly TaxiTripStatus[];

export function isActiveTaxiTripStatus(status: TaxiTripStatus): boolean {
  return (activeTaxiTripStatuses as readonly TaxiTripStatus[]).includes(status);
}

export function isTerminalTaxiTripStatus(status: TaxiTripStatus): boolean {
  return (terminalTaxiTripStatuses as readonly TaxiTripStatus[]).includes(status);
}

export interface TaxiTripLifecycleDefinition {
  status: TaxiTripStatus;
  order: number;
  active: boolean;
  terminal: boolean;
  customerTitle: string;
  customerCopy: string;
  captainVisible: boolean;
  vehicleVisible: boolean;
  pickupPinVisible: boolean;
  customerCancellationAllowed: boolean;
  pollingAllowed: boolean;
  pollingIntervalMs: number;
  receiptAvailable: boolean;
  bookAnotherAllowed: boolean;
}

export const taxiTripLifecycle: Record<TaxiTripStatus, TaxiTripLifecycleDefinition> = {
  REQUESTED: {
    status: "REQUESTED",
    order: 1,
    active: true,
    terminal: false,
    customerTitle: "Finding a KariGO Captain",
    customerCopy: "KariGO Operations is finding an available Ride Captain.",
    captainVisible: false,
    vehicleVisible: false,
    pickupPinVisible: false,
    customerCancellationAllowed: true,
    pollingAllowed: true,
    pollingIntervalMs: 12000,
    receiptAvailable: false,
    bookAnotherAllowed: false
  },
  DRIVER_ASSIGNED: {
    status: "DRIVER_ASSIGNED",
    order: 2,
    active: true,
    terminal: false,
    customerTitle: "Ride Captain assigned",
    customerCopy: "Your Ride Captain has been assigned and is preparing to accept the request.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: true,
    pollingAllowed: true,
    pollingIntervalMs: 8000,
    receiptAvailable: false,
    bookAnotherAllowed: false
  },
  ACCEPTED: {
    status: "ACCEPTED",
    order: 3,
    active: true,
    terminal: false,
    customerTitle: "Your Ride Captain is on the way",
    customerCopy: "Your Ride Captain accepted the request and is heading to pickup.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: true,
    pollingAllowed: true,
    pollingIntervalMs: 7000,
    receiptAvailable: false,
    bookAnotherAllowed: false
  },
  ARRIVED_PICKUP: {
    status: "ARRIVED_PICKUP",
    order: 4,
    active: true,
    terminal: false,
    customerTitle: "Your Ride Captain has arrived",
    customerCopy: "Meet your approved KariGO Ride Captain at pickup and share the protected PIN only when you are ready to start.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: true,
    customerCancellationAllowed: false,
    pollingAllowed: true,
    pollingIntervalMs: 10000,
    receiptAvailable: false,
    bookAnotherAllowed: false
  },
  STARTED: {
    status: "STARTED",
    order: 5,
    active: true,
    terminal: false,
    customerTitle: "Ride in progress",
    customerCopy: "Your KariGO Ride is in progress.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: false,
    pollingAllowed: true,
    pollingIntervalMs: 9000,
    receiptAvailable: false,
    bookAnotherAllowed: false
  },
  ARRIVED_DESTINATION: {
    status: "ARRIVED_DESTINATION",
    order: 6,
    active: true,
    terminal: false,
    customerTitle: "Destination reached",
    customerCopy: "Your Ride has reached the destination. KariGO will confirm completion once the Captain closes the trip.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: false,
    pollingAllowed: true,
    pollingIntervalMs: 10000,
    receiptAvailable: false,
    bookAnotherAllowed: false
  },
  COMPLETED: {
    status: "COMPLETED",
    order: 7,
    active: false,
    terminal: true,
    customerTitle: "Ride completed",
    customerCopy: "Thanks for riding with KariGO.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: false,
    pollingAllowed: false,
    pollingIntervalMs: 0,
    receiptAvailable: true,
    bookAnotherAllowed: true
  },
  CANCELLED_BY_CUSTOMER: {
    status: "CANCELLED_BY_CUSTOMER",
    order: 8,
    active: false,
    terminal: true,
    customerTitle: "Ride request cancelled",
    customerCopy: "This Ride request was cancelled by the customer.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: false,
    pollingAllowed: false,
    pollingIntervalMs: 0,
    receiptAvailable: true,
    bookAnotherAllowed: true
  },
  CANCELLED_BY_DRIVER: {
    status: "CANCELLED_BY_DRIVER",
    order: 8,
    active: false,
    terminal: true,
    customerTitle: "Ride request cancelled",
    customerCopy: "This Ride request was cancelled by the Ride Captain.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: false,
    pollingAllowed: false,
    pollingIntervalMs: 0,
    receiptAvailable: true,
    bookAnotherAllowed: true
  },
  CANCELLED_BY_ADMIN: {
    status: "CANCELLED_BY_ADMIN",
    order: 8,
    active: false,
    terminal: true,
    customerTitle: "Ride request cancelled",
    customerCopy: "This Ride request was closed by KariGO Operations.",
    captainVisible: true,
    vehicleVisible: true,
    pickupPinVisible: false,
    customerCancellationAllowed: false,
    pollingAllowed: false,
    pollingIntervalMs: 0,
    receiptAvailable: true,
    bookAnotherAllowed: true
  },
  EXPIRED: {
    status: "EXPIRED",
    order: 8,
    active: false,
    terminal: true,
    customerTitle: "Ride request expired",
    customerCopy: "No Ride Captain accepted before the request expired.",
    captainVisible: false,
    vehicleVisible: false,
    pickupPinVisible: false,
    customerCancellationAllowed: false,
    pollingAllowed: false,
    pollingIntervalMs: 0,
    receiptAvailable: true,
    bookAnotherAllowed: true
  }
};

export function taxiLifecycleForStatus(status: TaxiTripStatus): TaxiTripLifecycleDefinition {
  return taxiTripLifecycle[status];
}

export interface TaxiTripCaptainSummary {
  id: string;
  userId?: string | null;
  displayName: string;
  profilePhotoUrl?: string | null;
  verified: boolean;
  publicRating?: number | null;
  completedTripCount?: number | null;
  contactAvailable: boolean;
  contactPhoneNumber?: string | null;
  location?: {
    latitude: unknown;
    longitude: unknown;
    lastSeenAt?: string | null;
    freshness: "fresh" | "stale" | "unavailable";
  } | null;
}

export interface TaxiTripVehicleSummary {
  make?: string | null;
  model?: string | null;
  colour?: string | null;
  registrationNumber?: string | null;
  category?: TaxiVehicleType | null;
  seatCapacity?: number | null;
  photoUrl?: string | null;
}

export interface TaxiTripTimelineEvent {
  key: string;
  label: string;
  status: TaxiTripStatus;
  timestamp?: string | null;
  current?: boolean;
}

export interface TaxiFareEstimateInput {
  pickupAddress: string;
  destinationAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
  stopAddress?: string;
  stopLatitude?: number;
  stopLongitude?: number;
  estimatedDistanceKm?: number;
  estimatedDurationMin?: number;
  waitingMinutes?: number;
  rideCategory?: string;
}

export interface TaxiPlaceAutocompleteQuery {
  input: string;
  sessionToken?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: string;
  fieldType?: "pickup" | "destination" | "stop";
}

export interface TaxiPlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText?: string;
  description: string;
  distanceMeters?: number;
  types?: string[];
}

export interface TaxiPlaceAutocompleteResult {
  predictions: TaxiPlacePrediction[];
  googleAttributionRequired: boolean;
  sessionToken?: string | null;
}

export interface TaxiPlaceDetails {
  placeId: string;
  providerPlaceResource?: string | null;
  name: string;
  address: string;
  shortAddress: string;
  latitude: number;
  longitude: number;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  types?: string[];
}

export interface TaxiRoutePreviewInput {
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  pickupAddress?: string;
  destinationAddress?: string;
  stopLatitude?: number;
  stopLongitude?: number;
  stopAddress?: string;
  serviceArea?: string;
}

export interface TaxiRoutePreview {
  provider: "google_routes";
  routingPreference?: "TRAFFIC_AWARE" | "TRAFFIC_UNAWARE";
  durationSource?: "traffic_duration" | "static_duration";
  fallbackApplied?: boolean;
  serviceArea?: "Abuja" | "Kano";
  activeServiceAreas?: Array<"Abuja" | "Kano">;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMin: number;
  staticDurationSeconds?: number | null;
  encodedPolyline: string;
  routeLabels?: string[];
  routeEstimateAvailable: true;
}

export interface TaxiRideCategory {
  id: string;
  name: string;
  description: string;
  passengerCapacity: number;
  arrivalEstimateMinutes: number;
  fareEstimateKobo?: number;
  fareRangeKobo?: {
    min: number;
    max: number;
  };
  available: boolean;
  productionEnabled?: boolean;
  controlledPilotOnly?: boolean;
}

export interface TaxiFareEstimate {
  pickupAddress: string;
  destinationAddress: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  waitingMinutes?: number;
  billableWaitingMinutes?: number;
  distanceFareKobo?: number;
  waitingChargeKobo?: number;
  estimatedFareKobo: number;
  monetaryUnit: "KOBO";
  karigoCommissionKobo?: number;
  captainNetEstimateKobo?: number;
  currency: "NGN";
  selectedRideCategory?: TaxiRideCategory;
  rideCategories?: TaxiRideCategory[];
  formula?: {
    perKmKobo: number;
    waitingChargeKoboPerMinute: number;
    waitingGraceMinutes: number;
    karigoCommissionPercent: number;
    vatTaxKobo: number;
    vatTaxConfigured: boolean;
  };
  pricing?: TaxiRidePricingDefaults;
  launchNotice: string;
  testModeNotice?: string;
}

export interface TaxiRidePricingDefaults {
  launchCities: string[];
  perKmKobo: number;
  karigoCommissionPercent: number;
  waitingChargeKoboPerMinute: number;
  waitingGraceMinutes: number;
  vatTaxKobo: number;
  vatTaxConfigured: boolean;
  dispatchEnabled: boolean;
  dispatchMode?: "MANUAL" | "ASSISTED" | "AUTOMATIC";
  paymentMode?: "CASH" | "WALLET" | "ONLINE";
}

export interface TaxiTripInput extends TaxiFareEstimateInput {
  customerNote?: string;
  paymentMethod?: string;
  scheduledPickupAt?: string;
  pickupInstruction?: string;
  clientRequestId?: string;
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
  locationFreshness?: "fresh" | "stale" | "unavailable";
  productionEnabled?: boolean;
  testModeOnly?: boolean;
}

export interface TaxiTrip {
  id: string;
  tripReference: string;
  pickupAddress: string;
  pickupLatitude?: unknown;
  pickupLongitude?: unknown;
  destinationAddress: string;
  destinationLatitude?: unknown;
  destinationLongitude?: unknown;
  estimatedDistanceKm?: unknown;
  estimatedDurationMin?: number | null;
  estimatedFareKobo: number;
  monetaryUnit: "KOBO";
  finalFareKobo?: number | null;
  status: TaxiTripStatus;
  tripPinLastFour?: string | null;
  tripPin?: string;
  lifecycle?: TaxiTripLifecycleDefinition;
  captain?: TaxiTripCaptainSummary | null;
  vehicle?: TaxiTripVehicleSummary | null;
  assignmentIncomplete?: boolean;
  timeline?: TaxiTripTimelineEvent[];
  lifecycleTimestamps?: {
    requestedAt?: string | null;
    assignedAt?: string | null;
    acceptedAt?: string | null;
    arrivedAtPickupAt?: string | null;
    startedAt?: string | null;
    arrivedAtDestinationAt?: string | null;
    completedAt?: string | null;
    cancelledAt?: string | null;
    expiredAt?: string | null;
  };
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
  createdAt: string;
  updatedAt?: string | null;
  driver?: TaxiDriverProfile | null;
  conversationSummary?: RideConversationSummary;
  callSessionSummary?: RideCallSessionSummary;
  events?: Array<{
    id: string;
    actorType: "CUSTOMER" | "DRIVER" | "ADMIN" | "SYSTEM";
    actorId?: string | null;
    eventType: string;
    note?: string | null;
    createdAt: string;
  }>;
  launchNotice: string;
  testModeNotice?: string;
}

export type RideMessageSenderRole = "CUSTOMER" | "CAPTAIN";
export interface RideMessage {
  id: string;
  rideId: string;
  senderRole: RideMessageSenderRole;
  senderLabel: string;
  message: string;
  deliveryState: "DELIVERED";
  readAt?: string | null;
  createdAt: string;
}

export interface RideConversationSummary {
  exists: boolean;
  messageCount: number;
  lastMessageAt?: string | null;
  readOnly: boolean;
}

export interface RideConversationPage extends RideConversationSummary {
  rideId: string;
  rideReference: string;
  participantLabel: string;
  messages: RideMessage[];
  nextBefore?: string | null;
  retentionEndsAt?: string | null;
}

export interface RideContactOptions {
  rideId: string;
  chatAvailable: boolean;
  inAppCall: RideCallSessionSummary;
  phoneFallbackAvailable: boolean;
  phoneNumber?: string | null;
  phoneFallbackLabel: "Call by phone";
  maskedNumberProviderRequiredForPublicLaunch: boolean;
}

export interface RideCallSessionSummary {
  enabled: boolean;
  requestedEnabled?: boolean;
  provider?: string | null;
  state?: "DISABLED" | "AVAILABLE" | "ACTIVE" | "ENDED";
  recordingEnabled: boolean;
  reason: string;
  providerRequirements?: string[];
}
