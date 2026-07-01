import { ConfigService } from "@nestjs/config";
import { EmailProviderRegistry } from "./email-provider.registry";
import { MockEmailProvider } from "./mock-email.provider";
import { MailgunEmailProvider, SendGridEmailProvider, SesEmailProvider, SmtpEmailProvider } from "./placeholder-email.providers";

describe("EmailProviderRegistry", () => {
  it("selects mock by default", () => {
    const registry = new EmailProviderRegistry(
      { get: jest.fn((_key, fallback) => fallback) } as unknown as ConfigService,
      { name: "mock" } as MockEmailProvider,
      { name: "smtp" } as SmtpEmailProvider,
      { name: "sendgrid" } as SendGridEmailProvider,
      { name: "mailgun" } as MailgunEmailProvider,
      { name: "ses" } as SesEmailProvider
    );
    expect(registry.active().name).toBe("mock");
  });
});
