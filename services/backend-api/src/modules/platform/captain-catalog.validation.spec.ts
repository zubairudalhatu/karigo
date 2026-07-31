import { BadRequestException } from "@nestjs/common";
import { assertFutureLicenceDate, resolveCaptainLocation, resolveVehicleDetails } from "./captain-catalog.validation";

describe("Captain catalog validation", () => {
  it("resolves active Kano and Abuja service areas with a primary operating area", () => {
    expect(resolveCaptainLocation({
      residentialStateCode: "KANO",
      residentialCityCode: "KANO",
      operatingAreaIds: ["kano-kano", "fct-abuja"],
      primaryOperatingAreaId: "kano-kano"
    })).toMatchObject({
      residentialStateCode: "KANO",
      residentialCityCode: "KANO",
      city: "Kano",
      state: "Kano",
      operatingAreaIds: ["kano-kano", "fct-abuja"],
      primaryOperatingAreaId: "kano-kano"
    });
  });

  it("rejects a primary area that was not selected as an operating area", () => {
    expect(() => resolveCaptainLocation({
      residentialStateCode: "FCT",
      residentialCityCode: "ABUJA",
      operatingAreaIds: ["fct-abuja"],
      primaryOperatingAreaId: "kano-kano"
    })).toThrow(BadRequestException);
  });

  it("normalizes guided vehicle make, model, year and colour values", () => {
    expect(resolveVehicleDetails({
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      vehicleYear: 2018,
      vehicleColour: "Black"
    })).toMatchObject({
      vehicleMake: "TOYOTA",
      vehicleModel: "COROLLA",
      vehicleYear: 2018,
      vehicleColour: "BLACK",
      vehicleMakeLabel: "Toyota",
      vehicleModelLabel: "Corolla",
      vehicleColourLabel: "Black"
    });
  });

  it("rejects a vehicle model that does not belong to the selected make", () => {
    expect(() => resolveVehicleDetails({
      vehicleMake: "Toyota",
      vehicleModel: "Accord",
      vehicleYear: 2018,
      vehicleColour: "Black"
    })).toThrow(BadRequestException);
  });

  it("requires licence expiry to be a future date", () => {
    expect(assertFutureLicenceDate("2030-12-31")).toBeInstanceOf(Date);
    expect(() => assertFutureLicenceDate("2020-01-01")).toThrow(BadRequestException);
  });
});
