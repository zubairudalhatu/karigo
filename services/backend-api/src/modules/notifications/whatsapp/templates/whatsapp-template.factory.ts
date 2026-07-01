import { BadRequestException } from "@nestjs/common";
import { WhatsAppTemplate } from "./whatsapp-template.types";

export function defineWhatsAppTemplate(input: {
  name: string;
  purpose: string;
  body: string;
  requiredVariables: string[];
}): WhatsAppTemplate {
  return {
    ...input,
    render(variables) {
      const missing = input.requiredVariables.filter((key) => !variables[key]?.trim());
      if (missing.length) throw new BadRequestException(`Missing WhatsApp template variables: ${missing.join(", ")}`);
      return input.body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? "");
    }
  };
}
