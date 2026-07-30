import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaxiPlaceAutocompleteQueryDto } from "./dto/taxi-place-autocomplete-query.dto";
import { TaxiPlaceDetailsQueryDto } from "./dto/taxi-place-details-query.dto";
import { TaxiRoutePreviewDto } from "./dto/taxi-route-preview.dto";

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

const ABUJA_CENTER = { latitude: 9.0765, longitude: 7.3986 };
const KANO_CENTER = { latitude: 12.0022, longitude: 8.592 };
const GOOGLE_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACE_DETAILS_BASE_URL = "https://places.googleapis.com/v1/places";
const GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

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
    }, "autocomplete");

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
    }, "place_details");

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

    const straightLineMeters = this.distanceMeters(
      { latitude: dto.pickupLatitude, longitude: dto.pickupLongitude },
      { latitude: dto.destinationLatitude, longitude: dto.destinationLongitude }
    );
    if (straightLineMeters < 50) {
      throw new BadRequestException("Pickup and destination are too close. Choose a different destination.");
    }

    const response = await this.googleFetch<GoogleRouteResponse>(GOOGLE_ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels"
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: dto.pickupLatitude, longitude: dto.pickupLongitude } } },
        destination: { location: { latLng: { latitude: dto.destinationLatitude, longitude: dto.destinationLongitude } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        polylineQuality: "OVERVIEW",
        polylineEncoding: "ENCODED_POLYLINE",
        departureTime: new Date().toISOString(),
        languageCode: "en",
        units: "METRIC"
      })
    }, "route_preview");

    const route = response.routes?.[0];
    const distanceMeters = Number(route?.distanceMeters ?? 0);
    const durationSeconds = this.durationSeconds(route?.duration);
    const encodedPolyline = route?.polyline?.encodedPolyline;
    if (!distanceMeters || !durationSeconds || !encodedPolyline) {
      throw new ServiceUnavailableException("Route estimate temporarily unavailable. Please retry.");
    }
    if (distanceMeters < 50 || durationSeconds < 60 || durationSeconds > 8 * 60 * 60) {
      throw new ServiceUnavailableException("Route estimate temporarily unavailable. Please retry.");
    }

    return {
      provider: "google_routes",
      distanceMeters,
      distanceKm: Number((distanceMeters / 1000).toFixed(2)),
      durationSeconds,
      durationMin: Math.max(1, Math.round(durationSeconds / 60)),
      staticDurationSeconds: this.durationSeconds(route?.staticDuration),
      encodedPolyline,
      routeLabels: route?.routeLabels ?? [],
      routeEstimateAvailable: true
    };
  }

  private async googleFetch<T>(url: string, init: RequestInit, operation: string): Promise<T> {
    const apiKey = this.config.get<string>("GOOGLE_MAPS_SERVER_API_KEY", "").trim();
    if (!apiKey) {
      this.logger.warn(`Google Maps server key missing for ${operation}`);
      throw new ServiceUnavailableException(operation === "route_preview"
        ? "Route estimate temporarily unavailable. Please retry."
        : "Ride search is temporarily unavailable. Please try again later.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
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
        this.logger.warn(`Google Maps ${operation} failed: status=${response.status} reason=${this.safeGoogleReason(payload)}`);
        throw new ServiceUnavailableException(operation === "route_preview"
          ? "Route estimate temporarily unavailable. Please retry."
          : "Ride search is temporarily unavailable. Please try again later.");
      }
      return payload as T;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const reason = error instanceof Error ? error.name : "unknown";
      this.logger.warn(`Google Maps ${operation} unavailable: reason=${reason}`);
      throw new ServiceUnavailableException(operation === "route_preview"
        ? "Route estimate temporarily unavailable. Please retry."
        : "Ride search is temporarily unavailable. Please try again later.");
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
    const normalized = serviceArea?.trim().toLowerCase() || this.config.get<string>("RIDES_ACTIVE_SERVICE_AREA", "Abuja").toLowerCase();
    if (normalized.includes("kano")) return KANO_CENTER;
    return ABUJA_CENTER;
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

  private safeGoogleReason(payload: unknown) {
    if (!payload || typeof payload !== "object") return "unknown";
    const error = (payload as { error?: { status?: string; code?: number } }).error;
    return [error?.status, error?.code].filter(Boolean).join(":") || "provider_error";
  }
}
