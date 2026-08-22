import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RtcRole, RtcTokenBuilder } from "agora-token";

export interface RideCallTokenRequest {
  channel: string;
  uid: number;
}

export interface RideCallParticipantToken {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  expiresAt: string;
}

export interface RideCallProvider {
  readonly name: string;
  readiness(): { enabled: boolean; provider: string | null; recordingEnabled: false; reason: string };
  createParticipantToken(request: RideCallTokenRequest): RideCallParticipantToken;
}

export class AgoraRideCallProvider implements RideCallProvider {
  readonly name = "agora";

  constructor(private readonly config: ConfigService) {}

  readiness() {
    const enabled = this.enabled();
    return {
      enabled,
      provider: enabled ? this.name : null,
      recordingEnabled: false as const,
      reason: enabled
        ? "Secure in-app Ride calling is available."
        : "In-app Ride calling is not enabled. Use Ride chat or the controlled phone fallback."
    };
  }

  createParticipantToken(request: RideCallTokenRequest): RideCallParticipantToken {
    if (!this.enabled()) {
      throw new ServiceUnavailableException("In-app Ride calling is not available");
    }
    const appId = this.config.getOrThrow<string>("AGORA_APP_ID");
    const certificate = this.config.getOrThrow<string>("AGORA_APP_CERTIFICATE");
    const ttlSeconds = this.tokenTtlSeconds();
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      certificate,
      request.channel,
      request.uid,
      RtcRole.PUBLISHER,
      ttlSeconds,
      ttlSeconds
    );
    return {
      appId,
      channel: request.channel,
      uid: request.uid,
      token,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
    };
  }

  private enabled() {
    const enabled = String(this.config.get<string | boolean>("RIDE_IN_APP_CALL_ENABLED", false)).toLowerCase() === "true";
    const provider = this.config.get<string>("RIDE_CALL_PROVIDER", "disabled").trim().toLowerCase();
    return enabled && provider === this.name && Boolean(
      this.config.get<string>("AGORA_APP_ID") && this.config.get<string>("AGORA_APP_CERTIFICATE")
    );
  }

  private tokenTtlSeconds() {
    const configured = Number(this.config.get<string | number>("AGORA_RTC_TOKEN_TTL_SECONDS", 900));
    return Number.isFinite(configured) ? Math.min(3_600, Math.max(300, Math.floor(configured))) : 900;
  }
}
