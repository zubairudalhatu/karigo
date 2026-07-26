import type { VendorProductInput } from "@karigo/shared-types";
import { useRouter } from "expo-router";
import { useState } from "react";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { PartnerProductForm } from "../../src/components/product-form";
import { Hero, MutedText, Screen } from "../../src/components/ui";

function NewProductContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: VendorProductInput) {
    setSaving(true);
    setError(null);
    try {
      await partnerApi.createProduct(payload);
      router.replace("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Hero eyebrow="Products" title="Add product" subtitle="Create a controlled product listing for approved KariGO Product Sellers and mixed partners." />
      {error ? <MutedText>{error}</MutedText> : null}
      <PartnerProductForm saving={saving} submitLabel="Create product" onSubmit={submit} />
    </Screen>
  );
}

export default function NewProductScreen() {
  return (
    <AuthGate>
      <NewProductContent />
    </AuthGate>
  );
}
