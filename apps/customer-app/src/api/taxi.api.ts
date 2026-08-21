import {
  RideContactOptions,
  RideCallSessionSummary,
  RideConversationPage,
  RideMessage,
  RideReceipt,
  TaxiFareEstimate,
  TaxiFareEstimateInput,
  TaxiPlaceAutocompleteQuery,
  TaxiPlaceAutocompleteResult,
  TaxiPlaceDetails,
  TaxiRideCategory,
  TaxiRoutePreview,
  TaxiRoutePreviewInput,
  TaxiTrip,
  TaxiTripInput,
  TaxiWaitlistEntry,
  TaxiWaitlistInput
} from "@karigo/shared-types";
import { api } from "./client";

function queryString(params: object) {
  const query = new URLSearchParams();
  Object.entries(params as Record<string, string | number | undefined>).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export const taxiApi = {
  joinWaitlist: (body: TaxiWaitlistInput) =>
    api.post<TaxiWaitlistEntry>("taxi/waitlist", body, { authenticated: false }),
  rideCategories: (city?: string) =>
    api.get<TaxiRideCategory[]>(`customer/taxi/ride-categories${city ? `?city=${encodeURIComponent(city)}` : ""}`),
  placesAutocomplete: (query: TaxiPlaceAutocompleteQuery) =>
    api.get<TaxiPlaceAutocompleteResult>(`customer/taxi/places/autocomplete${queryString(query)}`),
  placeDetails: (placeId: string, sessionToken?: string) =>
    api.get<TaxiPlaceDetails>(`customer/taxi/places/details/${encodeURIComponent(placeId)}${queryString({ sessionToken })}`),
  routePreview: (body: TaxiRoutePreviewInput) =>
    api.post<TaxiRoutePreview>("customer/taxi/routes/preview", body),
  fareEstimate: (body: TaxiFareEstimateInput) =>
    api.post<TaxiFareEstimate>("customer/taxi/fare-estimate", body),
  createTrip: (body: TaxiTripInput) =>
    api.post<TaxiTrip>("customer/taxi/trips", body),
  trips: () => api.get<TaxiTrip[]>("customer/taxi/trips"),
  trip: (tripId: string) => api.get<TaxiTrip>(`customer/taxi/trips/${tripId}`),
  receipt: (tripId: string) => api.get<RideReceipt>(`customer/taxi/trips/${tripId}/receipt`),
  messages: (tripId: string, before?: string) => api.get<RideConversationPage>(`customer/taxi/trips/${tripId}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`),
  sendMessage: (tripId: string, message: string) => api.post<RideMessage>(`customer/taxi/trips/${tripId}/messages`, { message }),
  markMessagesRead: (tripId: string, lastMessageId: string) => api.post<{ readAt: string }>(`customer/taxi/trips/${tripId}/messages/read`, { lastMessageId }),
  contactOptions: (tripId: string) => api.get<RideContactOptions>(`customer/taxi/trips/${tripId}/contact-options`),
  callSession: (tripId: string) => api.post<RideCallSessionSummary>(`customer/taxi/trips/${tripId}/call-session`),
  cancelTrip: (tripId: string, reason?: string) => api.post<TaxiTrip>(`customer/taxi/trips/${tripId}/cancel`, { reason })
};
