import { Injectable } from "@nestjs/common";
import {
  captainServiceAreaCatalog,
  CaptainServiceArea,
  VehicleCatalog,
  vehicleCatalog
} from "./captain-catalog";

@Injectable()
export class PlatformCatalogService {
  vehicleCatalog(): VehicleCatalog {
    return vehicleCatalog();
  }

  captainServiceAreas() {
    return captainServiceAreaCatalog();
  }

  activeServiceAreas(): CaptainServiceArea[] {
    return this.captainServiceAreas().areas.filter((area) => area.isActive);
  }
}
