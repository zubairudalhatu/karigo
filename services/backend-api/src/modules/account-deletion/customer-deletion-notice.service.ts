import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CustomerDeletionNoticeService {
  constructor(private readonly config: ConfigService) {}

  assertConfigured() {
    if (!this.config.get<string>("RESEND_API_KEY") || !(this.config.get<string>("RESEND_FROM_EMAIL") ?? this.config.get<string>("EMAIL_FROM"))) {
      throw new ServiceUnavailableException("Deletion confirmation email is not configured.");
    }
  }

  async verifyExisting(providerId: string, to: string, reference: string) {
    this.assertConfigured();
    try {
      const response = await fetch(`${this.config.get<string>("RESEND_BASE_URL", "https://api.resend.com").replace(/\/+$/, "")}/emails/${encodeURIComponent(providerId)}`, {
        headers: { authorization: `Bearer ${this.config.get<string>("RESEND_API_KEY")}` }, signal: AbortSignal.timeout(10_000)
      });
      const data = await response.json() as { id?: string; to?: string[]; subject?: string; text?: string };
      if (!response.ok || data.id !== providerId || !data.to?.includes(to) || data.subject !== "KariGO account deletion confirmation" || !data.text?.includes(reference)) throw new Error("Notice does not match");
      return true;
    } catch { throw new ServiceUnavailableException("Existing completion notice could not be verified."); }
  }

  async send(to: string, reference: string): Promise<string> {
    this.assertConfigured();
    const key = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("RESEND_FROM_EMAIL") ?? this.config.get<string>("EMAIL_FROM");
    const replyTo = this.config.get<string>("RESEND_REPLY_TO") ?? this.config.get<string>("EMAIL_REPLY_TO");
    if (!key || !from) throw new ServiceUnavailableException("Deletion confirmation email is not configured.");
    try {
      const response = await fetch(`${this.config.get<string>("RESEND_BASE_URL", "https://api.resend.com").replace(/\/+$/, "")}/emails`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "Idempotency-Key": `customer-deletion:${reference}:v1` },
        body: JSON.stringify({ from, to: [to], reply_to: replyTo,
          subject: "KariGO account deletion confirmation",
          text: `Your KariGO Customer personal-data cleanup has finished. Reference: ${reference}. This one-time confirmation is sent before your operational contact email is removed. Limited financial/legal records may remain where required by law; unnecessary personal details have been removed. Your account cannot be restored. Your saved deletion receipt will show final completion.` }),
        signal: AbortSignal.timeout(10_000)
      });
      const payload = await response.json().catch(() => ({})) as { id?: unknown };
      if (!response.ok || typeof payload.id !== "string") throw new Error("Email not confirmed");
      return payload.id;
    } catch {
      // No recipient, credentials, response body or token in errors/logs.
      throw new ServiceUnavailableException("Deletion notice needs provider reconciliation; do not resend automatically.");
    }
  }
}
