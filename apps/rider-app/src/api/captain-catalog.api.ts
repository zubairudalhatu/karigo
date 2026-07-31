import {
  captainServiceAreaCatalog,
  CaptainServiceAreaCatalog,
  VehicleCatalog,
  vehicleCatalog
} from "@karigo/shared-types";
import { api } from "./client";

export const fallbackVehicleCatalog = vehicleCatalog();
export const fallbackServiceAreaCatalog = captainServiceAreaCatalog();

export const captainCatalogApi = {
  vehicleCatalog: async () => {
    try {
      return await api.get<VehicleCatalog>("platform/vehicle-catalog", { authenticated: false });
    } catch {
      return fallbackVehicleCatalog;
    }
  },
  serviceAreas: async () => {
    try {
      return await api.get<CaptainServiceAreaCatalog>("platform/captain-service-areas", { authenticated: false });
    } catch {
      return fallbackServiceAreaCatalog;
    }
  }
};
