import { BadRequestException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaxiMapsService } from "./taxi-maps.service";

const fetchMock = jest.fn();
const routeDto = {
  pickupLatitude: 9.0765,
  pickupLongitude: 7.3986,
  destinationLatitude: 9.0643,
  destinationLongitude: 7.4893,
  serviceArea: "Abuja"
};
const routePayload = {
  routes: [{
    distanceMeters: 12450,
    duration: "1820s",
    staticDuration: "1680s",
    polyline: { encodedPolyline: "abcdEFgh" },
    routeLabels: ["DEFAULT_ROUTE"]
  }]
};

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
      json: async () => routePayload
    });

    const result = await service.routePreview("customer-1", routeDto);

    expect(result).toMatchObject({
      provider: "google_routes",
      routingPreference: "TRAFFIC_AWARE",
      durationSource: "traffic_duration",
      fallbackApplied: false,
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
    expect(requestBody).not.toHaveProperty("departureTime");
  });

  it("prepares departureTime only for valid future scheduled previews", () => {
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    const nearPast = new Date(Date.now() - 60_000).toISOString();

    expect((service as unknown as { routeDepartureTime: (value?: string) => object }).routeDepartureTime()).toEqual({});
    expect((service as unknown as { routeDepartureTime: (value?: string) => object }).routeDepartureTime(nearPast)).toEqual({});
    expect((service as unknown as { routeDepartureTime: (value?: string) => object }).routeDepartureTime(future)).toEqual({
      departureTime: future
    });
  });

  it("parses fractional route durations", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [{
          distanceMeters: 12450,
          duration: "1820.5s",
          staticDuration: "1680.25s",
          polyline: { encodedPolyline: "abcdEFgh" }
        }]
      })
    });

    await expect(service.routePreview("customer-1", routeDto)).resolves.toMatchObject({
      durationSeconds: 1821,
      staticDurationSeconds: 1680,
      durationSource: "traffic_duration"
    });
  });

  it("uses static road duration when traffic duration is absent", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [{
          distanceMeters: 12450,
          staticDuration: "1680s",
          polyline: { encodedPolyline: "abcdEFgh" }
        }]
      })
    });

    await expect(service.routePreview("customer-1", routeDto)).resolves.toMatchObject({
      durationSeconds: 1680,
      durationSource: "static_duration",
      routingPreference: "TRAFFIC_AWARE"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once with traffic-unaware routing for provider 5xx failures", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { code: 503, status: "UNAVAILABLE", message: "Backend unavailable" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => routePayload
      });

    const result = await service.routePreview("customer-1", routeDto);
    const fallbackBody = JSON.parse(fetchMock.mock.calls[1][1].body);

    expect(result).toMatchObject({
      routingPreference: "TRAFFIC_UNAWARE",
      fallbackApplied: true,
      distanceMeters: 12450
    });
    expect(fallbackBody.routingPreference).toBe("TRAFFIC_UNAWARE");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once with traffic-unaware routing after a route timeout", async () => {
    fetchMock
      .mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => routePayload
      });

    await expect(service.routePreview("customer-1", routeDto)).resolves.toMatchObject({
      routingPreference: "TRAFFIC_UNAWARE",
      fallbackApplied: true
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries traffic-unaware when traffic-aware response has no usable duration", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{
            distanceMeters: 12450,
            polyline: { encodedPolyline: "abcdEFgh" }
          }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => routePayload
      });

    await expect(service.routePreview("customer-1", routeDto)).resolves.toMatchObject({
      routingPreference: "TRAFFIC_UNAWARE",
      fallbackApplied: true
    });
  });

  it("does not retry Google permission failures and keeps logs free of secrets and coordinates", async () => {
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: 403,
          status: "PERMISSION_DENIED",
          message: "API key restriction failure for 9.076500,7.398600"
        }
      })
    });

    await expect(service.routePreview("customer-1", routeDto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    const logged = warnSpy.mock.calls.flat().join(" ");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logged).toContain("api_key_restriction");
    expect(logged).not.toContain("fake-google-server-key");
    expect(logged).not.toContain("9.076500");
    expect(logged).not.toContain("7.398600");
    warnSpy.mockRestore();
  });

  it("does not retry invalid route arguments", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 400, status: "INVALID_ARGUMENT", message: "Invalid route request" } })
    });

    await expect(service.routePreview("customer-1", routeDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

    await expect(service.routePreview("customer-1", routeDto)).rejects.toThrow("This pickup and destination could not be routed.");
  });

  it("fails safely when route response is missing a polyline", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [{
          distanceMeters: 12450,
          duration: "1820s"
        }]
      })
    });

    await expect(service.routePreview("customer-1", routeDto)).rejects.toThrow("Route estimate temporarily unavailable. Please retry.");
  });

  it("blocks route preview for malformed coordinates and locations that are too close", async () => {
    await expect(service.routePreview("customer-1", { ...routeDto, pickupLatitude: 91 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.routePreview("customer-1", {
      ...routeDto,
      destinationLatitude: routeDto.pickupLatitude,
      destinationLongitude: routeDto.pickupLongitude
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits route preview requests before reaching Google", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => routePayload
    });

    for (let index = 0; index < 20; index += 1) {
      await service.routePreview("customer-1", routeDto);
    }

    await expect(service.routePreview("customer-1", routeDto)).rejects.toThrow("Too many ride search requests. Please wait briefly and try again.");
    expect(fetchMock).toHaveBeenCalledTimes(20);
  });
});
