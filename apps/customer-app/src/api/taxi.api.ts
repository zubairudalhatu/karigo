import { TaxiFareEstimate, TaxiFareEstimateInput, TaxiTrip, TaxiTripInput, TaxiWaitlistEntry, TaxiWaitlistInput } from "@karigo/shared-types";
import { api } from "./client";

export const taxiApi = {
  joinWaitlist: (body: TaxiWaitlistInput) =>
    api.post<TaxiWaitlistEntry>("taxi/waitlist", body, { authenticated: false }),
  fareEstimate: (body: TaxiFareEstimateInput) =>
    api.post<TaxiFareEstimate>("customer/taxi/fare-estimate", body),
  createTrip: (body: TaxiTripInput) =>
    api.post<TaxiTrip>("customer/taxi/trips", body),
  trips: () => api.get<TaxiTrip[]>("customer/taxi/trips"),
  trip: (tripId: string) => api.get<TaxiTrip>(`customer/taxi/trips/${tripId}`),
  cancelTrip: (tripId: string, reason?: string) => api.post<TaxiTrip>(`customer/taxi/trips/${tripId}/cancel`, { reason })
};
