import { TaxiDriverApplicationInput, TaxiDriverApplicationStatus } from "@karigo/shared-types";
import { api } from "./client";

export const taxiApi = {
  submitDriverApplication: (body: TaxiDriverApplicationInput) =>
    api.post<TaxiDriverApplicationStatus>("taxi/driver-applications", body, { authenticated: false }),
  applicationStatus: (phoneNumber: string) =>
    api.get<TaxiDriverApplicationStatus>(`taxi/driver-applications/status?phoneNumber=${encodeURIComponent(phoneNumber)}`, { authenticated: false })
};
