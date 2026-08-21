import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface RideCallSessionRequest {
  tripId: string;
  participantUserId: string;
  participantRole: "CUSTOMER" | "CAPTAIN";
}

export interface RideCallProvider {
  readonly name: string;
  createSession(request: RideCallSessionRequest): Promise<{ sessionId: string; token: string; expiresAt: string }>;
}

@Injectable()
export class RideCallService {
  constructor(private readonly config: ConfigService) {}

  readiness() {
    const requestedEnabled = this.config.get<string>("RIDE_IN_APP_CALL_ENABLED", "false").toLowerCase() === "true";
    return {
      enabled: false,
      requestedEnabled,
      provider: null,
      recordingEnabled: false,
      reason: requestedEnabled
        ? "In-app calling remains unavailable because no approved Ride call provider is configured."
        : "In-app calling is not enabled. Use Ride chat or the controlled phone fallback.",
      providerRequirements: [
        "Approved Nigerian-capable VoIP provider",
        "Server-side short-lived participant tokens",
        "Incoming-call push/deep-link support",
        "Call lifecycle webhooks without recording by default",
        "Privacy, data-retention and cost approval"
      ]
    } as const;
  }

  createSession(_request: RideCallSessionRequest) {
    return Promise.resolve(this.readiness());
  }
}
