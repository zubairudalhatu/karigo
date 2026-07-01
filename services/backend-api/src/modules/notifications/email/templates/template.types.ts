export type EmailTemplateVariables = Record<string, string | number | boolean | null | undefined>;

export interface RenderedEmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface EmailTemplate {
  name: string;
  requiredVariables: string[];
  subject: string;
  heading: string;
  actionLabel?: string;
  render(variables: EmailTemplateVariables): RenderedEmailTemplate;
}
