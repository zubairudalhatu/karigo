import { BadRequestException } from "@nestjs/common";
import { EmailService } from "./email.service";
import { EmailProviderRegistry } from "./providers/email-provider.registry";
import { emailTemplates } from "./templates/template.catalogue";

describe("EmailService and templates", () => {
  const provider = { sendEmail: jest.fn().mockResolvedValue({ accepted: true, provider: "mock" }) };
  const registry = { active: jest.fn(() => provider) };
  const service = new EmailService(registry as unknown as EmailProviderRegistry);

  beforeEach(() => jest.clearAllMocks());

  it("renders branded HTML and plain text with variables", () => {
    const rendered = emailTemplates["order-created"].render({
      recipientName: "Amina",
      message: "Order KGO-100 was created.",
      actionUrl: "https://example.test/orders/100"
    });
    expect(rendered.subject).toBe("Your KariGO order has been created");
    expect(rendered.htmlBody).toContain("KariGO");
    expect(rendered.htmlBody).toContain("Amina");
    expect(rendered.textBody).toContain("Order KGO-100 was created.");
  });

  it("escapes unsafe template variables", () => {
    const rendered = emailTemplates["support-ticket-updated"].render({
      recipientName: "<script>alert(1)</script>",
      message: "Ticket updated"
    });
    expect(rendered.htmlBody).not.toContain("<script>");
    expect(rendered.htmlBody).toContain("&lt;script&gt;");
  });

  it("renders the account activation email with an HTTPS logo and pilot footer copy", () => {
    const rendered = emailTemplates["account-activated"].render({
      recipientName: "Amina",
      message: "Your KariGO account is now active.",
      logoUrl: "https://www.karigo.com.ng/karigo-logo.png",
      supportContact: "support@karigo.com.ng",
      pilotLabel: "Kano controlled early access"
    });

    expect(rendered.subject).toBe("Your KariGO account is active");
    expect(rendered.htmlBody).toContain("https://www.karigo.com.ng/karigo-logo.png");
    expect(rendered.htmlBody).toContain("Kano controlled early access");
    expect(rendered.htmlBody).toContain("This is an account activation notification, not a marketing email.");
    expect(rendered.textBody).toContain("Mock payment remains the selected pilot payment mode");
  });

  it("falls back to text branding when the activation logo URL is not HTTPS", () => {
    const rendered = emailTemplates["account-activated"].render({
      recipientName: "Amina",
      message: "Your KariGO account is now active.",
      logoUrl: "http://example.test/logo.png"
    });

    expect(rendered.htmlBody).not.toContain("http://example.test/logo.png");
    expect(rendered.htmlBody).toContain(">KariGO</div>");
  });

  it("fails safely when required variables are missing", () => {
    expect(() => emailTemplates["payment-successful"].render({ recipientName: "Amina" }))
      .toThrow(BadRequestException);
  });

  it("routes rendered templates through the selected mock provider", async () => {
    await service.sendTemplateEmail({
      to: "customer@example.com",
      templateName: "welcome-customer",
      variables: { recipientName: "Amina", message: "Your account is ready." }
    });
    expect(provider.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "customer@example.com",
      subject: "Welcome to KariGO"
    }));
  });

  it.each(Object.keys(emailTemplates) as Array<keyof typeof emailTemplates>)(
    "renders complete branded HTML and text for %s",
    (templateName) => {
      const rendered = emailTemplates[templateName].render({
        recipientName: "Test User",
        message: "Operational update REF-100.",
        actionUrl: "https://example.test/activity/REF-100"
      });

      expect(rendered.subject).toBeTruthy();
      expect(rendered.htmlBody).toContain("KariGO");
      expect(rendered.htmlBody).toContain("Operational update REF-100.");
      expect(rendered.textBody).toContain("KariGO");
      expect(rendered.textBody).toContain("Operational update REF-100.");
      expect(`${rendered.subject}${rendered.htmlBody}${rendered.textBody}`).not.toMatch(/\{\{\w+\}\}/);
    }
  );
});
