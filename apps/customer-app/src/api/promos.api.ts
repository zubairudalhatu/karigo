import type { PromoValidationResult, ValidatePromoRequest } from "@karigo/shared-types";
import { api } from "./client";

export const promosApi = {
  validate: (body: ValidatePromoRequest) => api.post<PromoValidationResult>("promos/validate", body)
};
