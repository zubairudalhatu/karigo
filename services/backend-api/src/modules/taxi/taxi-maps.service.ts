import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaxiPlaceAutocompleteQueryDto } from "./dto/taxi-place-autocomplete-query.dto";
import { TaxiPlaceDetailsQueryDto } from "./dto/taxi-place-details-query.dto";
import { TaxiRoutePreviewDto } from "./dto/taxi-route-preview.dto";
import {
  assertSameActiveRideServiceArea,
  serviceAreaCenter,
  serviceAreaMetadata,
  validRideCoordinate
} from "./taxi-service-areas";

type LatLng = { latitude: number; longitude: number };

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      place?: string;
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      distanceMeters?: number;
      types?: string[];
    };
  }>;
};

type GooglePlaceDetailsResponse = {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: LatLng;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  types?: string[];
};

type GoogleRouteResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    polyline?: { encodedPolyline?: string };
    routeLabels?: string[];
  }>;
};

type GoogleRoutingPreference = "TRAFFIC_AWARE" | "TRAFFIC_UNAWARE";
type RouteDurationSource = "traffic_duration" | "static_duration";

type GoogleErrorPayload = {
  error?: {
    code?: number;
    status?: string;
    message?: string;
  };
};

type GoogleFetchOptions = {
  operation: "autocomplete" | "place_details" | "route_preview";
  customerMessage: string;
  correlationId?: string;
  serviceArea?: string;
  timeoutMs?: number;
};

const GOOGLE_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACE_DETAILS_BASE_URL = "https://places.googleapis.com/v1/places";
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const GOOGLE_SEARCH_TIMEOUT_MS = 6_000;
const DEFAULT_GOOGLE_ROUTES_TIMEOUT_MS = 12_000;
const MAX_GOOGLE_ROUTES_TIMEOUT_MS = 15_000;
const MIN_GOOGLE_ROUTES_TIMEOUT_MS = 3_000;
const ROUTE_UNAVAILABLE_MESSAGE = "Route estimate temporarily unavailable. Please retry.";
const ROUTE_BUSY_MESSAGE = "Route service is temporarily busy. Please retry.";
const ROUTE_UNROUTABLE_MESSAGE = "This pickup and destination could not be routed.";
const RIDE_SEARCH_UNAVAILABLE_MESSAGE = "Ride search is temporarily unavailable. Please try again later.";

class GoogleMapsProviderError extends Error {
  constructor(
    public readonly reason: string,
    public readonly customerMessage: string,
    public readonly retryable = false,
    public readonly status?: number,
    public readonly googleStatus?: string,
    public readonly googleCode?: number
  ) {
    super(reason);
  }
}

@Injectable()
export class TaxiMapsService {
  private readonly logger = new Logger(TaxiMapsService.name);
  private readonly requestBuckets = new Map<string, number[]>();

  constructor(private readonly config: ConfigService) {}

  async autocomplete(userId: string, query: TaxiPlaceAutocompleteQueryDto) {
    this.assertRateLimit(userId, "places-autocomplete", 40, 60_000);
    const input = query.input.trim();
    if (input.length < 2) {
      throw new BadRequestException("Enter at least two characters to search for a place.");
    }

    const center = this.locationBiasCenter(query);
    const body: Record<string, unknown> = {
      input,
      includedRegionCodes: ["ng"],
      regionCode: "NG",
      languageCode: "en",
      sessionToken: query.sessionToken?.trim() || undefined,
      locationBias: {
        circle: {
          center,
          radius: 50_000
        }
      },
      origin: query.latitude !== undefined && query.longitude !== undefined
        ? { latitude: query.latitude, longitude: query.longitude }
        : center
    };

    const response = await this.googleFetch<GoogleAutocompleteResponse>(GOOGLE_AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask": [
          "suggestions.placePrediction.placeId",
          "suggestions.placePrediction.text.text",
          "suggestions.placePrediction.structuredFormat.mainText.text",
          "suggestions.placePrediction.structuredFormat.secondaryText.text",
          "suggestions.placePrediction.distanceMeters",
          "suggestions.placePrediction.types"
        ].join(",")
      },
      body: JSON.stringify(body)
    }, {
      operation: "autocomplete",
      customerMessage: RIDE_SEARCH_UNAVAILABLE_MESSAGE
    });

    const predictions = (response.suggestions ?? [])
      .map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction?.placeId))
      .slice(0, 5)
      .map((prediction) => {
        const mainText = prediction.structuredFormat?.mainText?.text || prediction.text?.text || "Place";
        const secondaryText = prediction.structuredFormat?.secondaryText?.text || "";
        return {
          placeId: prediction.placeId!,
          mainText,
          secondaryText,
          description: prediction.text?.text || [mainText, secondaryText].filter(Boolean).join(", "),
          distanceMeters: prediction.distanceMeters,
          types: prediction.types ?? []
        };
      });

    return {
      predictions,
      googleAttributionRequired: true,
      sessionToken: query.sessionToken?.trim() || null
    };
  }

  async placeDetails(userId: string, placeId: string, query: TaxiPlaceDetailsQueryDto) {
    this.assertRateLimit(userId, "place-details", 20, 60_000);
    const safePlaceId = placeId.trim();
    if (!/^[A-Za-z0-9_-]{8,256}$/.test(safePlaceId)) {
      throw new BadRequestException("Select a valid place prediction.");
    }

    const params = new URLSearchParams();
    if (query.sessionToken?.trim()) params.set("sessionToken", query.sessionToken.trim());
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await this.googleFetch<GooglePlaceDetailsResponse>(`${GOOGLE_PLACE_DETAILS_BASE_URL}/${encodeURIComponent(safePlaceId)}${suffix}`, {
      method: "GET",
      headers: {
        "X-Goog-FieldMask": "id,displayName,formattedAddress,shortFormattedAddress,location,addressComponents,types"
      }
    }, {
      operation: "place_details",
      customerMessage: RIDE_SEARCH_UNAVAILABLE_MESSAGE
    });

    if (!response.location || !this.validCoordinate(response.location.latitude, response.location.longitude)) {
      throw new ServiceUnavailableException("Selected place could not be resolved safely. Please choose another result.");
    }

    return {
      placeId: response.id ?? safePlaceId,
      providerPlaceResource: response.name ?? null,
      name: response.displayName?.text ?? response.shortFormattedAddress ?? "Selected place",
      address: response.formattedAddress ?? response.shortFormattedAddress ?? response.displayName?.text ?? "Selected place",
      shortAddress: response.shortFormattedAddress ?? response.formattedAddress ?? response.displayName?.text ?? "Selected place",
      latitude: response.location.latitude,
      longitude: response.location.longitude,
      addressComponents: response.addressComponents ?? [],
      types: response.types ?? []
    };
  }

  async routePreview(userId: string, dto: TaxiRoutePreviewDto) {
    this.assertRateLimit(userId, "routes-preview", 20, 60_000);
    this.assertCoordinate(dto.pickupLatitude, dto.pickupLongitude, "pickup");
    this.assertCoordinate(dto.destinationLatitude, dto.destinationLongitude, "destination");
    const stop = this.optionalStopCoordinate(dto);
    const serviceArea = assertSameActiveRideServiceArea(
      this.config,
      { latitude: dto.pickupLatitude, longitude: dto.pickupLongitude },
      { latitude: dto.destinationLatitude, longitude: dto.destinationLongitude },
      stop
    );

    const straightLineMeters = this.distanceMeters(
      { latitude: dto.pickupLatitude, longitude: dto.pickupLongitude },
      { latitude: dto.destinationLatitude, longitude: dto.destinationLongitude }
    );
    if (straightLineMeters < 50) {
      throw new BadRequestException("Pickup and destination are too close. Choose a different destination.");
    }

    const correlationId = this.correlationId();
    try {
      return await this.computeRoute(dto, "TRAFFIC_AWARE", correlationId, serviceArea.city);
    } catch (error) {
      if (!this.shouldRetryTrafficUnaware(error)) throw this.routeFailure(error);

      const failure = error as GoogleMapsProviderError;
      this.logger.warn(this.safeLogLine("Google Maps route preview fallback starting", {
        operation: "route_preview",
        reason: failure.reason,
        correlationId,
        serviceArea: this.safeServiceArea(dto.serviceArea),
        routingPreference: "TRAFFIC_AWARE"
      }));

      try {
        return await this.computeRoute(dto, "TRAFFIC_UNAWARE", correlationId, serviceArea.city, true);
      } catch (fallbackError) {
        throw this.routeFailure(fallbackError);
      }
    }
  }

  private async computeRoute(
    dto: TaxiRoutePreviewDto,
    routingPreference: GoogleRoutingPreference,
    correlationId: string,
    serviceAreaCity: "Abuja" | "Kano",
    fallbackApplied = false
  ) {
    const stop = this.optionalStopCoordinate(dto);
    const response = await this.googleFetch<GoogleRouteResponse>(GOOGLE_ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels"
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: dto.pickupLatitude, longitude: dto.pickupLongitude } } },
        destination: { location: { latLng: { latitude: dto.destinationLatitude, longitude: dto.destinationLongitude } } },
        ...(stop ? {
          intermediates: [{
            location: { latLng: { latitude: stop.latitude, longitude: stop.longitude } }
          }]
        } : {}),
        travelMode: "DRIVE",
        routingPreference,
        computeAlternativeRoutes: false,
        polylineQuality: "OVERVIEW",
        polylineEncoding: "ENCODED_POLYLINE",
        ...this.routeDepartureTime(),
        languageCode: "en",
        units: "METRIC"
      })
    }, {
      operation: "route_preview",
      customerMessage: ROUTE_UNAVAILABLE_MESSAGE,
      correlationId,
      serviceArea: this.safeServiceArea(dto.serviceArea),
      timeoutMs: this.routeTimeoutMs()
    });

    const route = response.routes?.[0];
    if (!route) {
      throw this.routeResponseError("empty_routes", false, correlationId, dto.serviceArea, routingPreference);
    }

    const distanceMeters = Number(route?.distanceMeters ?? 0);
    if (!distanceMeters) {
      throw this.routeResponseError("missing_distance", false, correlationId, dto.serviceArea, routingPreference);
    }

    const trafficDurationSeconds = this.durationSeconds(route?.duration);
    const staticDurationSeconds = this.durationSeconds(route?.staticDuration);
    const durationSeconds = trafficDurationSeconds ?? staticDurationSeconds;
    const durationSource: RouteDurationSource = trafficDurationSeconds ? "traffic_duration" : "static_duration";
    if (!durationSeconds) {
      throw this.routeResponseError(
        "missing_duration",
        routingPreference === "TRAFFIC_AWARE",
        correlationId,
        dto.serviceArea,
        routingPreference
      );
    }

    const encodedPolyline = route?.polyline?.encodedPolyline;
    if (!encodedPolyline) {
      throw this.routeResponseError("missing_polyline", false, correlationId, dto.serviceArea, routingPreference);
    }

    if (distanceMeters < 50 || durationSeconds < 60 || durationSeconds > 8 * 60 * 60) {
      throw this.routeResponseError("unusable_route_metrics", false, correlationId, dto.serviceArea, routingPreference);
    }

    return {
      provider: "google_routes",
      routingPreference,
      durationSource,
      fallbackApplied,
      serviceArea: serviceAreaCity,
      activeServiceAreas: serviceAreaMetadata(this.config).map((area) => area.city),
      distanceMeters,
      distanceKm: Number((distanceMeters / 1000).toFixed(2)),
      durationSeconds,
      durationMin: Math.max(1, Math.round(durationSeconds / 60)),
      staticDurationSeconds,
      encodedPolyline,
      routeLabels: route?.routeLabels ?? [],
      routeEstimateAvailable: true
    };
  }

  private async googleFetch<T>(url: string, init: RequestInit, options: GoogleFetchOptions): Promise<T> {
    const apiKey = this.config.get<string>("GOOGLE_MAPS_SERVER_API_KEY", "").trim();
    if (!apiKey) {
      this.logger.warn(this.safeLogLine("Google Maps server key missing", {
        operation: options.operation,
        reason: "missing_google_maps_server_key",
        correlationId: options.correlationId,
        serviceArea: options.serviceArea
      }));
      if (options.operation !== "route_preview") {
        throw new ServiceUnavailableException(options.customerMessage);
      }
      throw new GoogleMapsProviderError("missing_google_maps_server_key", options.customerMessage, false);
    }

    const controller = new AbortController();
    const startedAt = Date.now();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? GOOGLE_SEARCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init.headers ?? {}),
          "X-Goog-Api-Key": apiKey
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const info = this.googleErrorInfo(response.status, payload);
        this.logger.warn(this.safeLogLine("Google Maps request failed", {
          operation: options.operation,
          status: response.status,
          googleStatus: info.googleStatus,
          googleCode: info.googleCode,
          reason: info.reason,
          providerMessage: info.providerMessage,
          correlationId: options.correlationId,
          serviceArea: options.serviceArea,
          elapsedMs: Date.now() - startedAt
        }));
        if (options.operation !== "route_preview") {
          throw new ServiceUnavailableException(options.customerMessage);
        }
        throw new GoogleMapsProviderError(
          info.reason,
          this.customerMessageForGoogleFailure(options.operation, info.reason, options.customerMessage),
          info.retryable,
          response.status,
          info.googleStatus,
          info.googleCode
        );
      }
      return payload as T;
    } catch (error) {
      if (error instanceof GoogleMapsProviderError || error instanceof HttpException) throw error;
      const reason = error instanceof Error ? error.name : "unknown";
      const timedOut = reason === "AbortError";
      this.logger.warn(this.safeLogLine("Google Maps request unavailable", {
        operation: options.operation,
        reason: timedOut ? "timeout" : this.safeToken(reason),
        correlationId: options.correlationId,
        serviceArea: options.serviceArea,
        elapsedMs: Date.now() - startedAt
      }));
      if (options.operation !== "route_preview") {
        throw new ServiceUnavailableException(options.customerMessage);
      }
      throw new GoogleMapsProviderError(
        timedOut ? "timeout" : "provider_unavailable",
        timedOut && options.operation === "route_preview" ? ROUTE_BUSY_MESSAGE : options.customerMessage,
        timedOut,
        undefined,
        undefined,
        undefined
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private assertRateLimit(userId: string, operation: string, maxRequests: number, windowMs: number) {
    const key = `${operation}:${userId}`;
    const now = Date.now();
    const recent = (this.requestBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
    if (recent.length >= maxRequests) {
      throw new HttpException("Too many ride search requests. Please wait briefly and try again.", HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.requestBuckets.set(key, recent);
  }

  private locationBiasCenter(query: TaxiPlaceAutocompleteQueryDto): LatLng {
    if (query.latitude !== undefined && query.longitude !== undefined && this.validCoordinate(query.latitude, query.longitude)) {
      return { latitude: query.latitude, longitude: query.longitude };
    }
    return this.serviceAreaCenter(query.serviceArea);
  }

  private serviceAreaCenter(serviceArea?: string): LatLng {
    return serviceAreaCenter(this.config, serviceArea);
  }

  private optionalStopCoordinate(dto: TaxiRoutePreviewDto) {
    const hasStop = dto.stopLatitude !== undefined || dto.stopLongitude !== undefined || Boolean(dto.stopAddress?.trim());
    if (!hasStop) return null;
    if (!validRideCoordinate(dto.stopLatitude, dto.stopLongitude)) {
      throw new BadRequestException("Choose a valid stop location from search results or the map.");
    }
    return { latitude: dto.stopLatitude!, longitude: dto.stopLongitude! };
  }

  private assertCoordinate(latitude: number, longitude: number, label: string) {
    if (!this.validCoordinate(latitude, longitude)) {
      throw new BadRequestException(`Choose a valid ${label} location.`);
    }
  }

  private validCoordinate(latitude: number, longitude: number) {
    return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  private distanceMeters(a: LatLng, b: LatLng) {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
  }

  private durationSeconds(value?: string) {
    if (!value) return null;
    const match = /^(\d+(?:\.\d+)?)s$/.exec(value);
    return match ? Math.round(Number(match[1])) : null;
  }

  private routeDepartureTime(scheduledDepartureTime?: string) {
    if (!scheduledDepartureTime) return {};
    const scheduledAt = new Date(scheduledDepartureTime);
    const minFutureMs = 2 * 60_000;
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() - Date.now() < minFutureMs) return {};
    return { departureTime: scheduledAt.toISOString() };
  }

  private routeTimeoutMs() {
    const configured = this.config.get<string | number>("GOOGLE_ROUTES_TIMEOUT_MS", DEFAULT_GOOGLE_ROUTES_TIMEOUT_MS);
    const parsed = Number(configured);
    if (!Number.isFinite(parsed)) return DEFAULT_GOOGLE_ROUTES_TIMEOUT_MS;
    return Math.min(MAX_GOOGLE_ROUTES_TIMEOUT_MS, Math.max(MIN_GOOGLE_ROUTES_TIMEOUT_MS, Math.round(parsed)));
  }

  private googleErrorInfo(status: number, payload: unknown) {
    const error = payload && typeof payload === "object" ? (payload as GoogleErrorPayload).error : undefined;
    const googleStatus = this.safeToken(error?.status);
    const googleCode = typeof error?.code === "number" ? error.code : undefined;
    const providerMessage = this.safeProviderMessage(error?.message);
    const lowerMessage = providerMessage.toLowerCase();
    let reason = "provider_error";
    let retryable = false;

    if (status === 429 || googleStatus === "RESOURCE_EXHAUSTED") reason = "quota_or_rate_limit";
    else if (googleStatus === "INVALID_ARGUMENT") reason = "invalid_argument";
    else if (googleStatus === "PERMISSION_DENIED") {
      if (lowerMessage.includes("api") && ((lowerMessage.includes("not") && lowerMessage.includes("enabled")) || lowerMessage.includes("not been used"))) reason = "routes_api_disabled";
      else if (lowerMessage.includes("api key") || lowerMessage.includes("referer") || lowerMessage.includes("restriction")) reason = "api_key_restriction";
      else reason = "permission_denied";
    } else if (googleStatus === "DEADLINE_EXCEEDED" || status === 408 || status === 504) {
      reason = "timeout";
      retryable = true;
    } else if (status >= 500 || googleStatus === "UNAVAILABLE" || googleStatus === "INTERNAL") {
      reason = "provider_5xx";
      retryable = true;
    }

    return { reason, retryable, googleStatus, googleCode, providerMessage };
  }

  private customerMessageForGoogleFailure(operation: string, reason: string, fallback: string) {
    if (operation !== "route_preview") return fallback;
    if (reason === "invalid_argument") return ROUTE_UNROUTABLE_MESSAGE;
    if (reason === "timeout" || reason === "provider_5xx") return ROUTE_BUSY_MESSAGE;
    return ROUTE_UNAVAILABLE_MESSAGE;
  }

  private routeResponseError(
    reason: string,
    retryable: boolean,
    correlationId: string,
    serviceArea: string | undefined,
    routingPreference: GoogleRoutingPreference
  ) {
    this.logger.warn(this.safeLogLine("Google Maps route response unusable", {
      operation: "route_preview",
      reason,
      correlationId,
      serviceArea: this.safeServiceArea(serviceArea),
      routingPreference
    }));
    return new GoogleMapsProviderError(
      reason,
      reason === "empty_routes" ? ROUTE_UNROUTABLE_MESSAGE : ROUTE_UNAVAILABLE_MESSAGE,
      retryable
    );
  }

  private shouldRetryTrafficUnaware(error: unknown) {
    return error instanceof GoogleMapsProviderError && error.retryable;
  }

  private routeFailure(error: unknown) {
    if (error instanceof GoogleMapsProviderError) {
      if (error.reason === "invalid_argument" || error.reason === "empty_routes") {
        return new BadRequestException(error.customerMessage);
      }
      return new ServiceUnavailableException(error.customerMessage);
    }
    if (error instanceof HttpException) return error;
    return new ServiceUnavailableException(ROUTE_UNAVAILABLE_MESSAGE);
  }

  private correlationId() {
    return `KGO-ROUTE-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  private safeServiceArea(value?: string) {
    return this.safeToken(value?.trim() || this.config.get<string>("RIDES_ACTIVE_SERVICE_AREA", "Abuja"));
  }

  private safeToken(value?: string) {
    return (value || "")
      .replace(/[^A-Za-z0-9_-]/g, "_")
      .slice(0, 80) || undefined;
  }

  private safeProviderMessage(value?: string) {
    if (!value) return "";
    return value
      .replace(/AIza[0-9A-Za-z_-]+/g, "[redacted-key]")
      .replace(/[+-]?\d+\.\d{4,}/g, "[redacted-number]")
      .replace(/\s+/g, " ")
      .slice(0, 160);
  }

  private safeLogLine(message: string, values: Record<string, unknown>) {
    const suffix = Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => `${key}=${String(value).replace(/\s+/g, "_")}`)
      .join(" ");
    return suffix ? `${message}: ${suffix}` : message;
  }
}
