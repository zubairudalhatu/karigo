import {
  TaxiDriverApplicationInput,
  TaxiDriverApplicationStatus,
  TaxiDriverProfile,
  TaxiTrip
} from "@karigo/shared-types";
import { api } from "./client";

export const taxiApi = {
  submitDriverApplication: (body: TaxiDriverApplicationInput) =>
    api.post<TaxiDriverApplicationStatus>("taxi/driver-applications", body, { authenticated: false }),
  applicationStatus: (phoneNumber: string) =>
    api.get<TaxiDriverApplicationStatus>(`taxi/driver-applications/status?phoneNumber=${encodeURIComponent(phoneNumber)}`, { authenticated: false }),
  profile: () => api.get<TaxiDriverProfile>("rider/taxi/profile"),
  updateAvailability: (body: { isAvailableForTaxi: boolean; latitude?: number; longitude?: number }) =>
    api.patch<TaxiDriverProfile>("rider/taxi/availability", body),
  availableTrips: () => api.get<TaxiTrip[]>("rider/taxi/trips/available"),
  acceptTrip: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/accept`),
  arrivedPickup: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/arrived-pickup`),
  startTrip: (tripId: string, tripPin: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/start`, { tripPin }),
  arrivedDestination: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/arrived-destination`),
  completeTrip: (tripId: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/complete`),
  cancelTrip: (tripId: string, reason?: string) => api.post<TaxiTrip>(`rider/taxi/trips/${tripId}/cancel`, { reason })
};
