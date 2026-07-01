import { BadRequestException } from "@nestjs/common";
import { WhatsAppProviderRegistry } from "./providers/whatsapp-provider.registry";
import { whatsappTemplates } from "./templates/whatsapp-template.catalogue";
import { WhatsAppService } from "./whatsapp.service";

describe("WhatsAppService and templates", () => {
  const provider = {
    sendTemplateMessage: jest.fn().mockResolvedValue({ accepted: true, provider: "mock" })
  };
  const registry = { active: jest.fn(() => provider) };
  const service = new WhatsAppService(registry as unknown as WhatsAppProviderRegistry);

  beforeEach(() => jest.clearAllMocks());

  it("renders operational template variables", () => {
    expect(whatsappTemplates.karigo_order_created.render({
      customer_name: "Amina",
      order_reference: "KGO-100"
    })).toContain("KGO-100");
  });

  it("fails safely when required variables are missing", () => {
    expect(() => whatsappTemplates.karigo_order_on_the_way.render({}))
      .toThrow(BadRequestException);
  });

  it("routes approved template data through the selected mock provider", async () => {
    await service.sendTemplateMessage({
      to: "+2348012345678",
      templateName: "karigo_payment_successful",
      variables: { order_reference: "KGO-100" }
    });
    expect(provider.sendTemplateMessage).toHaveBeenCalledWith(expect.objectContaining({
      to: "+2348012345678",
      templateName: "karigo_payment_successful",
      variables: { order_reference: "KGO-100" }
    }));
  });

  it.each(Object.keys(whatsappTemplates) as Array<keyof typeof whatsappTemplates>)(
    "renders %s without unresolved variables",
    (templateName) => {
      const template = whatsappTemplates[templateName];
      const variables = Object.fromEntries(template.requiredVariables.map((key) => [key, `${key}-value`]));
      expect(template.render(variables)).not.toMatch(/\{\{\w+\}\}/);
    }
  );
});
