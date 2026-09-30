import { Prisma } from "@prisma/client";
type PaymentEvidenceInput = { transactionReference?: string | null; successful?: boolean; verified?: boolean; amountMinor?: number; currency?: string; eventType?: string; providerResponse?: Record<string, unknown> };

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : undefined;
}

/** Build a deliberately small reconciliation record. Never persist a provider response wholesale. */
export function paymentProviderEvidence(provider: string, input: PaymentEvidenceInput): Prisma.InputJsonValue {
  const response = record(input.providerResponse);
  const data = record(response?.data);
  const providerTransactionReference = text(data?.flw_ref)
    ?? text(data?.id)
    ?? text(response?.flw_ref)
    ?? text(response?.id);
  const paymentMethodCategory = text(data?.payment_type)
    ?? text(data?.payment_method)
    ?? text(response?.payment_type);

  return {
    schemaVersion: 1,
    provider: provider.slice(0, 40),
    transactionReference: text(input.transactionReference) ?? null,
    providerTransactionReference: providerTransactionReference ?? null,
    paymentMethodCategory: paymentMethodCategory ?? null,
    successful: typeof input.successful === "boolean" ? input.successful : null,
    verified: typeof input.verified === "boolean" ? input.verified : null,
    amountMinor: typeof input.amountMinor === "number" && Number.isFinite(input.amountMinor) ? input.amountMinor : null,
    currency: text(input.currency)?.toUpperCase() ?? null,
    eventType: text(input.eventType) ?? null
  };
}
