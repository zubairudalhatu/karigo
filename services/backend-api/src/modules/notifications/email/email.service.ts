import { Injectable } from "@nestjs/common";
import { EmailProviderRegistry } from "./providers/email-provider.registry";
import { emailTemplates, EmailTemplateName } from "./templates/template.catalogue";
import { EmailTemplateVariables } from "./templates/template.types";

@Injectable()
export class EmailService {
  constructor(private readonly providers: EmailProviderRegistry) {}

  async sendTemplateEmail(input: {
    to: string;
    templateName: EmailTemplateName;
    variables: EmailTemplateVariables;
    metadata?: Record<string, unknown>;
  }) {
    const rendered = emailTemplates[input.templateName].render(input.variables);
    return this.providers.active().sendEmail({ to: input.to, ...rendered, metadata: input.metadata });
  }
}
