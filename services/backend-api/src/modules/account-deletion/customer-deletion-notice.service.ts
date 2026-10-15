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

  async send(to: string, reference: string, sharedIdentityRetained = false): Promise<string> {
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
          text: `Your KariGO Customer personal-data cleanup has finished. Reference: ${reference}. ${sharedIdentityRetained ? "This one-time notice confirms Customer-role cleanup. Shared identity/contact data genuinely needed for your other active KariGO role remains available for that role only." : "This one-time confirmation is sent before your operational contact email is removed."} Minimum financial/service records may remain for 7 years from the end of the transaction financial year; fraud/dispute records for 7 years from final resolution, subject to active holds. Unnecessary Customer personal details have been removed. Your Customer account cannot be restored after completion. Your saved deletion receipt will show final completion. Retention policy: KGO-RETENTION-2026-10-15; see https://karigo.com.ng/privacy.` }),
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
