export interface WhatsAppTemplate {
  name: string;
  requiredVariables: string[];
  purpose: string;
  render(variables: Record<string, string | undefined>): string;
}
