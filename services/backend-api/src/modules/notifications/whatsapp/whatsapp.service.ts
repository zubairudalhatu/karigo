import { Injectable } from "@nestjs/common";
import { WhatsAppProviderRegistry } from "./providers/whatsapp-provider.registry";
import { whatsappTemplates, WhatsAppTemplateName } from "./templates/whatsapp-template.catalogue";

@Injectable()
export class WhatsAppService {
  constructor(private readonly providers: WhatsAppProviderRegistry) {}

  async sendTemplateMessage(input: {
    to: string;
    templateName: WhatsAppTemplateName;
    variables: Record<string, string | undefined>;
    metadata?: Record<string, unknown>;
  }) {
    const template = whatsappTemplates[input.templateName];
    template.render(input.variables);
    return this.providers.active().sendTemplateMessage({
      to: input.to,
      templateName: template.name,
      variables: Object.fromEntries(
        Object.entries(input.variables).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      ),
      metadata: input.metadata
    });
  }
}
