import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaxiMapsService } from "./taxi-maps.service";

const fetchMock = jest.fn();

describe("TaxiMapsService", () => {
  const config = { get: jest.fn() };
  let service: TaxiMapsService;

  beforeAll(() => {
    Object.defineProperty(global, "fetch", {
      value: fetchMock,
      writable: true
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        GOOGLE_MAPS_SERVER_API_KEY: "fake-google-server-key",
        RIDES_ACTIVE_SERVICE_AREA: "Abuja"
      };
      return values[key] ?? fallback;
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
    service = new TaxiMapsService(config as unknown as ConfigService);
  });

  it("returns Google Places predictions without exposing the server key", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        suggestions: [{
          placePrediction: {
            placeId: "ChIJAbujaPlace1",
            text: { text: "Central Business District, Abuja, Nigeria" },
            structuredFormat: {
              mainText: { text: "Central Business District" },
              secondaryText: { text: "Abuja, Nigeria" }
            },
            distanceMeters: 1200,
            types: ["locality"]
          }
        }]
      })
    });

    const result = await service.autocomplete("customer-1", {
      input: "Central",
      sessionToken: "session-123",
      latitude: 9.08,
      longitude: 7.4,
      fieldType: "destination"
    });

    expect(result).toEqual({
      predictions: [{
        placeId: "ChIJAbujaPlace1",
        mainText: "Central Business District",
        secondaryText: "Abuja, Nigeria",
        description: "Central Business District, Abuja, Nigeria",
        distanceMeters: 1200,
        types: ["locality"]
      }],
      googleAttributionRequired: true,
      sessionToken: "session-123"
    });
    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe("https://places.googleapis.com/v1/places:autocomplete");
    expect(request[1].headers["X-Goog-Api-Key"]).toBe("fake-google-server-key");
    expect(JSON.parse(request[1].body)).toMatchObject({
      includedRegionCodes: ["ng"],
      regionCode: "NG",
      sessionToken: "session-123"
    });
  });

  it("requires enough search input before calling Google", async () => {
    await expect(service.autocomplete("customer-1", { input: "A" })).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves place details with coordinates through Google Places", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "ChIJAbujaPlace1",
        name: "places/ChIJAbujaPlace1",
        displayName: { text: "Central Business District" },
        formattedAddress: "Central Business District, Abuja, Nigeria",
        shortFormattedAddress: "CBD, Abuja",
        location: { latitude: 9.0643, longitude: 7.4893 },
        addressComponents: [{ longText: "Abuja", shortText: "Abuja", types: ["locality"] }],
        types: ["point_of_interest"]
      })
    });

    await expect(service.placeDetails("customer-1", "ChIJAbujaPlace1", { sessionToken: "session-123" })).resolves.toMatchObject({
      placeId: "ChIJAbujaPlace1",
      providerPlaceResource: "places/ChIJAbujaPlace1",
      name: "Central Business District",
      address: "Central Business District, Abuja, Nigeria",
      shortAddress: "CBD, Abuja",
      latitude: 9.0643,
      longitude: 7.4893
    });
    expect(fetchMock.mock.calls[0][0]).toContain("https://places.googleapis.com/v1/places/ChIJAbujaPlace1");
  });

  it("computes a traffic-aware route preview with encoded polyline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [{
          distanceMeters: 12450,
          duration: "1820s",
          staticDuration: "1680s",
          polyline: { encodedPolyline: "abcdEFgh" },
          routeLabels: ["DEFAULT_ROUTE"]
        }]
      })
    });

    const result = await service.routePreview("customer-1", {
      pickupLatitude: 9.0765,
      pickupLongitude: 7.3986,
      destinationLatitude: 9.0643,
      destinationLongitude: 7.4893,
      serviceArea: "Abuja"
    });

    expect(result).toMatchObject({
      provider: "google_routes",
      distanceMeters: 12450,
      distanceKm: 12.45,
      durationSeconds: 1820,
      durationMin: 30,
      staticDurationSeconds: 1680,
      encodedPolyline: "abcdEFgh",
      routeEstimateAvailable: true
    });
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe("https://routes.googleapis.com/directions/v2:computeRoutes");
    expect(fetchMock.mock.calls[0][1].headers["X-Goog-FieldMask"]).toContain("routes.polyline.encodedPolyline");
    expect(requestBody).toMatchObject({
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      units: "METRIC"
    });
  });

  it("fails safely when the Google server key is missing", async () => {
    config.get.mockImplementation((key: string, fallback?: unknown) => key === "GOOGLE_MAPS_SERVER_API_KEY" ? "" : fallback);
    await expect(service.autocomplete("customer-1", { input: "Wuse" })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a safe route message when Google route response has no hosted route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] })
    });

    await expect(service.routePreview("customer-1", {
      pickupLatitude: 9.0765,
      pickupLongitude: 7.3986,
      destinationLatitude: 9.0643,
      destinationLongitude: 7.4893
    })).rejects.toThrow("Route estimate temporarily unavailable. Please retry.");
  });
});
