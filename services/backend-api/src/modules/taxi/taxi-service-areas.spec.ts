import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  activeRideServiceAreas,
  assertSameActiveRideServiceArea,
  INTERCITY_RIDES_UNAVAILABLE_MESSAGE,
  resolveRideServiceArea,
  rideCityFromText,
  serviceAreaCenter
} from "./taxi-service-areas";

function config(values: Record<string, unknown>) {
  return {
    get: jest.fn((key: string, fallback?: unknown) => values[key] ?? fallback)
  } as unknown as ConfigService;
}

describe("taxi service areas", () => {
  it("parses plural service areas with whitespace, duplicates and case differences", () => {
    const areas = activeRideServiceAreas(config({ RIDES_ACTIVE_SERVICE_AREAS: " Abuja, kano, KANO " }));
    expect(areas.map((area) => area.city)).toEqual(["Abuja", "Kano"]);
  });

  it("uses the plural service area setting before the singular fallback", () => {
    const areas = activeRideServiceAreas(config({
      RIDES_ACTIVE_SERVICE_AREAS: "Kano",
      RIDES_ACTIVE_SERVICE_AREA: "Abuja"
    }));
    expect(areas.map((area) => area.city)).toEqual(["Kano"]);
  });

  it("falls back to the singular service area when plural config is malformed", () => {
    const areas = activeRideServiceAreas(config({
      RIDES_ACTIVE_SERVICE_AREAS: "Lagos, Ibadan",
      RIDES_ACTIVE_SERVICE_AREA: "Abuja"
    }));
    expect(areas.map((area) => area.city)).toEqual(["Abuja"]);
  });

  it("resolves Abuja, Kano and unsupported coordinates safely", () => {
    const activeConfig = config({ RIDES_ACTIVE_SERVICE_AREAS: "Abuja,Kano" });
    expect(resolveRideServiceArea(activeConfig, 9.0765, 7.3986)).toMatchObject({ city: "Abuja", active: true });
    expect(resolveRideServiceArea(activeConfig, 12.0022, 8.592)).toMatchObject({ city: "Kano", active: true });
    expect(resolveRideServiceArea(activeConfig, 6.5244, 3.3792)).toBeNull();
  });

  it("rejects cross-city and inactive-city route selections", () => {
    const activeConfig = config({ RIDES_ACTIVE_SERVICE_AREAS: "Abuja,Kano" });
    expect(() => assertSameActiveRideServiceArea(
      activeConfig,
      { latitude: 9.0765, longitude: 7.3986 },
      { latitude: 12.0022, longitude: 8.592 }
    )).toThrow(INTERCITY_RIDES_UNAVAILABLE_MESSAGE);

    const abujaOnly = config({ RIDES_ACTIVE_SERVICE_AREA: "Abuja" });
    expect(() => assertSameActiveRideServiceArea(
      abujaOnly,
      { latitude: 12.0022, longitude: 8.592 },
      { latitude: 12.01, longitude: 8.61 }
    )).toThrow(BadRequestException);
  });

  it("resolves text aliases and service-area centers for future cities", () => {
    const activeConfig = config({ RIDES_ACTIVE_SERVICE_AREAS: "Abuja,Kano" });
    expect(rideCityFromText(activeConfig, "Federal Capital Territory")).toBe("Abuja");
    expect(rideCityFromText(activeConfig, "Kano State")).toBe("Kano");
    expect(serviceAreaCenter(activeConfig, "kano")).toEqual({ latitude: 12.0022, longitude: 8.592 });
  });
});
