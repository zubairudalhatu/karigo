import type { ProductSummary, VendorProductInput } from "@karigo/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl } from "react-native";
import { partnerApi } from "../../src/api/partner.api";
import { AuthGate } from "../../src/components/auth-gate";
import { PartnerProductForm } from "../../src/components/product-form";
import { Hero, LoadingState, MutedText, PrimaryButton, Screen } from "../../src/components/ui";

function EditProductContent() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!productId) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setProduct(await partnerApi.product(productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(payload: VendorProductInput) {
    if (!productId) return;
    setSaving(true);
    setError(null);
    try {
      await partnerApi.updateProduct(productId, payload);
      router.replace("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading product..." />;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      <Hero eyebrow="Products" title="Edit product" subtitle="Update product details and availability from the Partner App." />
      {error ? <MutedText>{error}</MutedText> : null}
      {product ? (
        <PartnerProductForm initialProduct={product} saving={saving} submitLabel="Save product changes" onSubmit={submit} />
      ) : (
        <>
          <MutedText>Product record was not found for this partner account.</MutedText>
          <PrimaryButton label="Back to products" onPress={() => router.replace("/products")} variant="secondary" />
        </>
      )}
    </Screen>
  );
}

export default function EditProductScreen() {
  return (
    <AuthGate>
      <EditProductContent />
    </AuthGate>
  );
}
