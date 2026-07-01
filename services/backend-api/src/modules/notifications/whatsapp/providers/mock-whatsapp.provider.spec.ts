import { Logger } from "@nestjs/common";
import { MockWhatsAppProvider } from "./mock-whatsapp.provider";

describe("MockWhatsAppProvider", () => {
  afterEach(() => jest.restoreAllMocks());

  it("masks recipients and omits variables and metadata from logs", async () => {
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const provider = new MockWhatsAppProvider();

    await provider.sendTemplateMessage({
      to: "+2348000000000",
      templateName: "karigo_order_created",
      variables: { order_reference: "private-ref" },
      metadata: { privateValue: "private-metadata" }
    });

    const output = log.mock.calls.flat().join(" ");
    expect(output).not.toContain("+2348000000000");
    expect(output).not.toContain("private-ref");
    expect(output).not.toContain("private-metadata");
    expect(output).toContain("karigo_order_created");
  });

  it("rejects unrestricted text messages", async () => {
    const provider = new MockWhatsAppProvider();
    await expect(provider.sendTextMessage({ to: "+2348000000000", message: "Free-form content" }))
      .rejects.toThrow("Unrestricted WhatsApp text messages are disabled");
  });
});
