import { TaxiWaitlistEntry, TaxiWaitlistInput } from "@karigo/shared-types";
import { api } from "./client";

export const taxiApi = {
  joinWaitlist: (body: TaxiWaitlistInput) =>
    api.post<TaxiWaitlistEntry>("taxi/waitlist", body, { authenticated: false })
};
