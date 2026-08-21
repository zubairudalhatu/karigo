import {
  RideContactOptions,
  RideCallSessionSummary,
  RideConversationPage,
  RideMessage,
  TaxiDriverApplicationInput,
  TaxiDriverApplicationStatus,
  TaxiDriverProfile,
  TaxiTrip
} from "@karigo/shared-types";
import { api } from "./client";

export const taxiApi = {
  submitDriverApplication: (body: TaxiDriverApplicationInput) =>
    api.post<TaxiDriverApplicationStatus>("taxi/driver-applications", body, { authenticated: false }),
  submitDriverApplicationForCurrentUser: (body: TaxiDriverApplicationInput) =>
    api.post<TaxiDriverApplicationStatus>("taxi/driver-applications/me", body),
  applicationStatus: (phoneNumber: string) =>
    api.get<TaxiDriverApplicationStatus>(`taxi/driver-applications/status?phoneNumber=${encodeURIComponent(phoneNumber)}`, { authenticated: false }),
  currentUserApplicationStatus: () => api.get<TaxiDriverApplicationStatus & { exists?: boolean; nextStep?: string }>("taxi/driver-applications/me"),
  profile: () => api.get<TaxiDriverProfile>("rider/taxi/profile"),
  updateAvailability: (body: { isAvailableForTaxi: boolean; latitude?: number; longitude?: number; accuracyMeters?: number | null }) =>
    api.patch<TaxiDriverProfile>("rider/taxi/availability", body),
  availableTrips: () => api.get<TaxiTrip[]>("rider/taxi/trips/available"),
  trips: () => api.get<TaxiTrip[]>("rider/taxi/trips"),
  messages: (tripId: string, before?: string) => api.get<RideConversationPage>(`rider/taxi/trips/${tripId}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`),
  sendMessage: (tripId: string, message: string) => api.post<RideMessage>(`rider/taxi/trips/${tripId}/messages`, { message }),
  markMessagesRead: (tripId: string, lastMessageId: string) => api.post<{ readAt: string }>(`rider/taxi/trips/${tripId}/messages/read`, { lastMessageId }),
  contactOptions: (tripId: string) => api.get<RideContactOptions>(`rider/taxi/trips/${tripId}/contact-options`),
  callSession: (tripId: string) => api.post<RideCallSessionSummary>(`rider/taxi/trips/${tripId}/call-session`),
  acceptTrip: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/accept`),
  declineTrip: (tripId: string, reason: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/decline`, { reason }),
  arrivedPickup: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/arrived-pickup`),
  startTrip: (tripId: string, tripPin: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/start`, { tripPin }),
  arrivedDestination: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/arrived-destination`),
  completeTrip: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/complete`),
  cancelTrip: (tripId: string, reason?: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/cancel`, { reason })
};
