import { CustomerDeletionNoticeService } from "./customer-deletion-notice.service";
import { ConfigService } from "@nestjs/config";

describe("Customer deletion completion notice", () => {
  const values: Record<string, string> = { RESEND_API_KEY: "synthetic-test-key", RESEND_FROM_EMAIL: "fixture@example.invalid", RESEND_REPLY_TO: "support@example.invalid" };
  const config = { get: (name: string, fallback?: string) => values[name] ?? fallback } as ConfigService;
  const service = new CustomerDeletionNoticeService(config);
  afterEach(() => jest.restoreAllMocks());
  it("uses the existing sender/reply-to, deterministic idempotency and no personal template data", async () => {
    const fetcher = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "fixture-provider-id" }), { status: 200 }));
    expect(await service.send("customer@example.invalid", "ADR-fixture-reference")).toBe("fixture-provider-id");
    const options = fetcher.mock.calls[0][1]!;
    expect(options.headers).toMatchObject({ "Idempotency-Key": "customer-deletion:ADR-fixture-reference:v1" });
    const body = JSON.parse(String(options.body));
    expect(body.from).toBe(values.RESEND_FROM_EMAIL); expect(body.reply_to).toBe(values.RESEND_REPLY_TO);
    expect(body.text).not.toContain("customer@example.invalid"); expect(body.text).toContain("operational contact email is removed");
  });
  it("does not expose provider response, recipient or key on ambiguous failure", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("synthetic-test-key customer@example.invalid"));
    await expect(service.send("customer@example.invalid", "ADR-fixture")).rejects.toThrow("do not resend automatically");
  });
  it("verifies a previously accepted notice by GET, matching recipient, subject and request reference", async () => {
    const fetcher = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "existing-id", to: ["customer@example.invalid"],
      subject: "KariGO account deletion confirmation", text: "Reference: ADR-fixture" }), { status: 200 }));
    await expect(service.verifyExisting("existing-id", "customer@example.invalid", "ADR-fixture")).resolves.toBe(true);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.resend.com/emails/existing-id");
    expect(fetcher.mock.calls[0][1]?.method).toBeUndefined();
  });
  it("does not accept another account's notice as completion proof", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "existing-id", to: ["other@example.invalid"], subject: "Other", text: "Other" }), { status: 200 }));
    await expect(service.verifyExisting("existing-id", "customer@example.invalid", "ADR-fixture")).rejects.toThrow();
  });
});
